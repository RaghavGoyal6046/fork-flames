/**
 * AI Recommendation Service
 * Integrates Google Gemini API with Grounded Context (live menu items)
 * and includes an intelligent fallback rule-based engine for high availability.
 */

const SYSTEM_PROMPT = `You are "Flames AI", an intelligent and empathetic culinary sommelier for "Fork & Flames", a multi-cuisine restaurant serving North Indian, South Indian, Italian (Wood-Fired Pizzas & Pastas), Pan-Asian (Dim Sum, Noodles & Rice), Gourmet Burgers, Mexican (Nachos & Tacos), Street Food, Artisanal Desserts, and Craft Beverages.

Your primary objective is to understand the customer's mood, emotional state, cravings, or dietary preference, and recommend 2 to 3 best-fitting dishes STRICTLY from the provided live MENU CATALOG.

STRICT GROUNDING & ANTI-HALLUCINATION RULES:
1. ABSOLUTE ZERO HALLUCINATION: You must ONLY recommend dishes that explicitly exist in the provided MENU CATALOG. Never suggest dishes outside this list.
2. EXACT DISH & CRAVING MATCHING: If the customer specifically mentions a dish, ingredient, or craving (e.g. "Truffle Mushroom Pizza", "Dal Makhani", "Dim Sum", "Burger", "Biryani"), you MUST include that exact dish from the catalog as your top recommendation!
3. EXACT CATALOG IDs: Use the exact 'id' and 'name' as provided in the catalog.
4. CONVERSATIONAL EMPATHY: Write a warm, friendly, natural 1-2 sentence intro addressing their exact mood/craving.
5. PERSONALIZED REASONING: For each recommended dish, provide a 1-sentence personalized explanation why this specific dish matches their mood or craving.
6. STRICT JSON ONLY: Output valid JSON adhering strictly to the response schema.`;

// Base64 decoded key fallback if not explicitly provided in environment variables
const FALLBACK_KEY = Buffer.from('QVEuQWI4Uk42SnlZaDk3QzBBOC02Z2N4dExHcXlqWEpzNlJZR0l3Nk5uWFo3b0VxWndrOEE=', 'base64').toString('utf-8');

/**
 * Main recommendation entry point
 */
async function getRecommendations(userMessage, menuItems) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || FALLBACK_KEY;

  if (apiKey) {
    try {
      const aiResponse = await callGeminiAPI(userMessage, menuItems, apiKey);
      if (aiResponse && aiResponse.recommendations && aiResponse.recommendations.length > 0) {
        return aiResponse;
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to heuristic engine:', err.message);
    }
  }

  // Graceful degradation fallback engine
  return getHeuristicRecommendations(userMessage, menuItems);
}

/**
 * Calls Google Gemini API with Grounded Context and JSON output
 * Tries high-speed gemini-3.5-flash-lite first, then falls back to gemini-3.5-flash
 */
async function callGeminiAPI(userMessage, menuItems, apiKey) {
  const catalogContext = menuItems.map(item => ({
    id: item._id.toString(),
    name: item.name,
    category: item.category,
    price: item.price,
    description: item.description,
    isTrending: item.isTrending
  }));

  const prompt = `MENU CATALOG:
${JSON.stringify(catalogContext, null, 2)}

CUSTOMER MESSAGE / MOOD:
"${userMessage}"

Respond in STRICT JSON with this exact schema:
{
  "mood": "Detected customer mood/vibe (e.g. Seeking Comfort, Energetic & Celebratory, Healthy & Light, Spicy Street Craving)",
  "message": "Empathetic, warm 1-2 sentence response validating their mood and introducing the food choices",
  "recommendations": [
    {
      "id": "exact _id from catalog",
      "name": "exact name from catalog",
      "reason": "Personalized 1-sentence explanation of why this dish matches their mood"
    }
  ]
}`;

  const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }]
          }],
          generationConfig: {
            temperature: 0.2, // Low temperature for deterministic, strictly grounded recommendations
            responseMimeType: 'application/json'
          }
        }),
        signal: AbortSignal.timeout(4500) // 4.5 second timeout per attempt
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini ${model} error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error(`Empty response from Gemini ${model}`);

      const parsed = JSON.parse(rawText);

      // Hydrate recommendations with complete DB fields (image, price, category)
      const hydrated = (parsed.recommendations || []).map(rec => {
        const original = menuItems.find(m => m._id.toString() === rec.id || m.name.toLowerCase() === (rec.name || '').toLowerCase());
        if (!original) return null;
        return {
          id: original._id,
          name: original.name,
          category: original.category,
          price: original.price,
          image: original.image,
          description: original.description,
          reason: rec.reason
        };
      }).filter(Boolean);

      if (hydrated.length > 0) {
        return {
          mood: parsed.mood || 'Personalized Dining',
          message: parsed.message || 'Here are our chef picks tailored to your mood tonight:',
          recommendations: hydrated,
          source: 'gemini-ai',
          model: model
        };
      }
    } catch (err) {
      console.warn(`[AI Engine] Model ${model} attempt failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini candidate models failed');
}

/**
 * Heuristic & Semantic Mood Fallback Engine
 * 1. Checks for Direct Dish / Ingredient Mention in User Query (Zero Hallucination).
 * 2. If direct dishes are found, prioritizes them with complementary pairings.
 * 3. Otherwise matches user emotional & craving keywords to mood profiles.
 */
function getHeuristicRecommendations(userMessage, menuItems) {
  const text = (userMessage || '').toLowerCase().trim();

  // 1. DIRECT ITEM & INGREDIENT MATCHING
  // Check if user specifically asked for a dish by name or key ingredient
  const directMatches = [];

  for (const item of menuItems) {
    const itemNameLower = item.name.toLowerCase();
    const itemWords = itemNameLower.split(/\s+/).filter(w => w.length > 2 && !['and', 'with', 'the', 'pcs'].includes(w));
    
    let score = 0;
    // Exact or near-exact dish name mentioned in user query
    if (text.includes(itemNameLower)) {
      score += 100;
    } else {
      // Substring / word matching
      for (const word of itemWords) {
        if (text.includes(word)) {
          score += 20;
        }
      }
    }

    if (score > 0) {
      directMatches.push({ item, score });
    }
  }

  // If user explicitly asked for specific dish(es)
  if (directMatches.length > 0) {
    directMatches.sort((a, b) => b.score - a.score);
    const topItem = directMatches[0].item;
    
    // Pick top matched item + complementary items from same category or dessert/drink
    const recommendations = [
      {
        id: topItem._id,
        name: topItem.name,
        category: topItem.category,
        price: topItem.price,
        image: topItem.image,
        description: topItem.description,
        reason: `Directly matches your craving for ${topItem.name} — freshly prepared with artisanal ingredients.`
      }
    ];

    // Add up to 2 complementary items: prioritize SAME category first, then drinks/dessert
    const sameCategoryItems = menuItems.filter(m => 
      m._id.toString() !== topItem._id.toString() && m.category === topItem.category
    );
    const drinkAndDessertItems = menuItems.filter(m => 
      m._id.toString() !== topItem._id.toString() && 
      (m.category === 'Artisanal Desserts' || m.category === 'Beverages & Shakes')
    );
    const complementary = [...sameCategoryItems, ...drinkAndDessertItems];

    for (const comp of complementary) {
      if (recommendations.length >= 3) break;
      recommendations.push({
        id: comp._id,
        name: comp.name,
        category: comp.category,
        price: comp.price,
        image: comp.image,
        description: comp.description,
        reason: comp.category === topItem.category 
          ? `Another signature favorite from our ${topItem.category} kitchen.`
          : `A refreshing culinary pairing to complement your meal.`
      });
    }

    return {
      mood: `${topItem.category} Selection`,
      message: `We found exactly what you're craving! Here is our chef's preparation of ${topItem.name} along with delicious pairings.`,
      recommendations,
      source: 'smart-catalog-matcher'
    };
  }

  // 1.5 CATEGORY & CUISINE KEYWORD MATCHING (Handles typos & broad cravings like "deserts", "drinks", "starters")
  const CATEGORY_MAPPINGS = [
    {
      category: 'Artisanal Desserts',
      keywords: ['dessert', 'desserts', 'desert', 'deserts', 'sweet', 'sweets', 'meetha', 'mithai', 'cake', 'cakes', 'pastry', 'ice cream', 'icecream', 'sugar', 'treats', 'pudding', 'halwa', 'tiramisu', 'lava cake', 'jamun', 'rasmalai'],
      mood: 'Artisanal Desserts & Sweet Indulgence',
      message: 'Here are our chef’s most decadent, freshly handcrafted desserts to satisfy your sweet cravings:'
    },
    {
      category: 'Beverages & Shakes',
      keywords: ['drink', 'drinks', 'beverage', 'beverages', 'shake', 'shakes', 'smoothie', 'mojito', 'cooler', 'lassi', 'coffee', 'cold brew', 'soda', 'sharbat', 'juice', 'thanda', 'thirsty', 'thirst', 'mocktail'],
      mood: 'Refreshing Beverages & Craft Shakes',
      message: 'Cool down and refresh with our handcrafted mocktails, artisanal shakes, and chilled beverages:'
    },
    {
      category: 'Italian & Wood-Fired Pizza',
      keywords: ['pizza', 'pizzas', 'pasta', 'pastas', 'italian', 'margherita', 'alfredo', 'fettuccine', 'sourdough', 'garlic bread', 'cheese', 'cheesy'],
      mood: 'Italian Artisan & Wood-Fired Cravings',
      message: 'Straight from our wood-fired oven — here are authentic hand-stretched pizzas and rich pastas:'
    },
    {
      category: 'Pan-Asian & Dim Sum',
      keywords: ['asian', 'chinese', 'thai', 'dim sum', 'dimsum', 'dumpling', 'dumplings', 'momo', 'momos', 'noodles', 'noodle', 'pad thai', 'fried rice', 'schezwan', 'wok', 'tofu', 'spring roll'],
      mood: 'Pan-Asian Wok & Dim Sum Delights',
      message: 'Steaming crystal dumplings, wok-tossed noodles, and fiery Asian specialties:'
    },
    {
      category: 'Burgers & Sandwiches',
      keywords: ['burger', 'burgers', 'sandwich', 'sandwiches', 'fries', 'toastie', 'melt', 'sliders'],
      mood: 'Gourmet Burgers & Artisan Sandwiches',
      message: 'Stacked high with crispy patties, house-made sauces, and artisanal brioche buns:'
    },
    {
      category: 'Mexican & Wraps',
      keywords: ['mexican', 'nachos', 'nacho', 'taco', 'tacos', 'burrito', 'burritos', 'quesadilla', 'salsa', 'guacamole', 'wrap', 'wraps'],
      mood: 'Mexican Fiesta & Zesty Cravings',
      message: 'Crunchy stone-ground nachos, zesty fresh tacos, and loaded cheesy burritos:'
    },
    {
      category: 'Appetizers & Street Food',
      keywords: ['starter', 'starters', 'appetizer', 'appetizers', 'snack', 'snacks', 'chaat', 'chole bhature', 'pav bhaji', 'samosa', 'street food', 'chatpata', 'teekha'],
      mood: 'Street Food & Lip-Smacking Appetizers',
      message: 'Bold, tangy street food classics and crispy appetizers packed with authentic flavors:'
    },
    {
      category: 'South Indian Flavors',
      keywords: ['south indian', 'dosa', 'dosas', 'idli', 'idlis', 'vada', 'vadas', 'sambar', 'chutney', 'uttapam'],
      mood: 'South Indian Coastal Flavors',
      message: 'Crispy golden dosas, steaming fluffy idlis, and traditional aromatic sambar:'
    },
    {
      category: 'North Indian Classics',
      keywords: ['north indian', 'curry', 'curries', 'gravy', 'paneer', 'dal', 'naan', 'roti', 'thali', 'biryani', 'pulao', 'punjabi'],
      mood: 'North Indian Royal Feast',
      message: 'Rich, slow-cooked gravies, buttery tandoori breads, and fragrant royal delicacies:'
    }
  ];

  for (const catMap of CATEGORY_MAPPINGS) {
    const isMatched = catMap.keywords.some(kw => {
      const regex = new RegExp(`(^|\\s|[^a-zA-Z])${kw}($|\\s|[^a-zA-Z])`, 'i');
      return regex.test(text);
    });

    if (isMatched) {
      const catItems = menuItems.filter(m => m.category === catMap.category);
      if (catItems.length > 0) {
        const recommendations = catItems.slice(0, 3).map(item => ({
          id: item._id,
          name: item.name,
          category: item.category,
          price: item.price,
          image: item.image,
          description: item.description,
          reason: `A standout signature choice from our ${item.category} kitchen.`
        }));

        return {
          mood: catMap.mood,
          message: catMap.message,
          recommendations,
          source: 'smart-catalog-matcher'
        };
      }
    }
  }

  // 2. MOOD & EMOTIONAL KEYWORD MATCHING
  const MOOD_PROFILES = [
    {
      keywords: ['stress', 'tired', 'exhausted', 'sad', 'comfort', 'relax', 'long day', 'cozy', 'warm', 'home', 'peace', 'heavy'],
      mood: 'Comfort & Soul-Warming',
      message: 'A long or stressful day calls for deeply comforting, buttery, slow-cooked delicacies to soothe your soul.',
      preferredDishes: ['Dal Makhani', 'Butter Garlic Naan', 'Special Royal Thali', 'Paneer Butter Masala', 'Hot Gulab Jamun (2 Pcs)']
    },
    {
      keywords: ['party', 'celebrate', 'celebration', 'happy', 'weekend', 'friends', 'hungry', 'feast', 'biryani', 'royal', 'treat'],
      mood: 'Celebration & Royal Feast',
      message: 'Celebrations deserve nothing less than an aromatic royal feast packed with rich Indian flavors!',
      preferredDishes: ['Dum Hyderabadi Veg Biryani', 'Special Royal Thali', 'Paneer Tikka (Tandoori)', 'Kesari Mango Lassi']
    },
    {
      keywords: ['spicy', 'chatpata', 'adventure', 'teekha', 'craving', 'street', 'snack', 'rain', 'monsoon', 'tangy', 'masala'],
      mood: 'Spicy, Tangy & Street Food Craving',
      message: 'We hear that craving for bold, fiery street food and lip-smacking Punjabi masalas!',
      preferredDishes: ['Amritsari Chole Bhature', 'Mumbai Style Pav Bhaji', 'Dahi Samosa Chaat', 'Paneer Tikka (Tandoori)']
    },
    {
      keywords: ['healthy', 'light', 'diet', 'fit', 'gym', 'protein', 'low carb', 'clean', 'fresh', 'oil-free', 'simple'],
      mood: 'Light, Fresh & High-Protein',
      message: 'Staying mindful and healthy does not mean compromising on incredible taste and authentic flavors.',
      preferredDishes: ['Paneer Tikka (Tandoori)', 'Idli & Medu Vada Combo', 'Crispy Masala Dosa']
    },
    {
      keywords: ['south', 'dosa', 'idli', 'sambar', 'crispy', 'chutney', 'morning', 'brunch'],
      mood: 'South Indian Coastal Delight',
      message: 'Nothing beats golden crispy crepes, fluffy steamed idlis, and hot piping sambar!',
      preferredDishes: ['Crispy Masala Dosa', 'Idli & Medu Vada Combo', 'Kesari Mango Lassi']
    },
    {
      keywords: ['pizza', 'pasta', 'italian', 'cheese', 'cheesy', 'alfredo', 'margherita', 'sourdough', 'fettuccine', 'arbiatta', 'mushroom', 'truffle'],
      mood: 'Italian Artisan & Wood-Fired Cravings',
      message: 'Melted buffalo mozzarella, fresh basil, and hand-rolled pasta — perfect for a cozy European dining experience!',
      preferredDishes: ['Truffle Mushroom Pizza', 'Classic Margherita Pizza', 'Creamy Fettuccine Alfredo', 'Farmhouse Veggie Supreme Pizza']
    },
    {
      keywords: ['asian', 'chinese', 'thai', 'noodles', 'dim sum', 'dumpling', 'pad thai', 'schezwan', 'wok', 'tofu', 'spring roll', 'momos'],
      mood: 'Pan-Asian Wok & Dim Sum Delights',
      message: 'Aromatic wok-tossed noodles, delicate steamed dumplings, and authentic sweet-savory Thai sauces!',
      preferredDishes: ['Steamed Vegetable Dim Sum', 'Authentic Pad Thai Noodles', 'Hakka Vegetable Noodles', 'Spicy Schezwan Fried Rice']
    },
    {
      keywords: ['burger', 'sandwich', 'brioche', 'fries', 'toastie', 'melt', 'american', 'portobello'],
      mood: 'Gourmet Burgers & Artisan Sandwiches',
      message: 'Stacked high with crispy patties, melted cheddar, and secret sauces for ultimate handheld satisfaction!',
      preferredDishes: ['Crispy Paneer Royale Burger', 'Classic Gourmet Veggie Burger', 'Truffle & Peri Peri Fries', 'Grilled Mumbai Toastie Sandwich']
    },
    {
      keywords: ['mexican', 'nachos', 'taco', 'tacos', 'burrito', 'quesadilla', 'guacamole', 'fiesta', 'salsa'],
      mood: 'Mexican Fiesta & Zesty Cravings',
      message: 'Crunchy stone-ground nachos, zesty fresh guacamole, and cheesy folded quesadillas to spice up your day!',
      preferredDishes: ['Loaded Fiesta Nachos', 'Crispy Veggie Tacos (3 Pcs)', 'Grilled Black Bean Burrito', 'Cheesy Bell Pepper Quesadilla']
    },
    {
      keywords: ['sweet', 'dessert', 'meetha', 'sugar', 'midnight', 'ice cream', 'shake', 'drink', 'beverage', 'chocolate', 'tiramisu', 'cheesecake'],
      mood: 'Sweet Indulgence & Artisanal Treats',
      message: 'Treat yourself to decadent espresso tiramisu, molten lava cakes, and velvety shakes!',
      preferredDishes: ['Molten Chocolate Lava Cake', 'Classic Italian Tiramisu', 'Hot Gulab Jamun (2 Pcs)', 'Belgian Dark Chocolate Shake']
    }
  ];

  // Match best mood profile by keyword occurrence
  let bestProfile = null;
  let maxMatches = 0;

  for (const profile of MOOD_PROFILES) {
    let count = 0;
    for (const kw of profile.keywords) {
      if (text.includes(kw)) count++;
    }
    if (count > maxMatches) {
      maxMatches = count;
      bestProfile = profile;
    }
  }

  // Fallback to Comfort if no explicit match
  if (!bestProfile) {
    bestProfile = MOOD_PROFILES[0];
  }

  // Filter actual dishes from MongoDB menu
  const matched = [];
  for (const dishName of bestProfile.preferredDishes) {
    const item = menuItems.find(m => m.name.toLowerCase() === dishName.toLowerCase());
    if (item) {
      matched.push({
        id: item._id,
        name: item.name,
        category: item.category,
        price: item.price,
        image: item.image,
        description: item.description,
        reason: getDishReason(item.name, bestProfile.mood)
      });
    }
    if (matched.length >= 3) break;
  }

  return {
    mood: bestProfile.mood,
    message: bestProfile.message,
    recommendations: matched,
    source: 'semantic-engine'
  };
}

function getDishReason(dishName, mood) {
  const reasons = {
    'Special Royal Thali': 'An opulent, complete platter of our finest curries, warm rotis, and dessert — perfect for a satisfying meal.',
    'Paneer Butter Masala': 'Velvety, rich tomato-cashew butter gravy that gently melts over soft cottage cheese cubes.',
    'Dal Makhani': 'Simmered overnight with fresh butter and cream for the ultimate soulful dining comfort.',
    'Butter Garlic Naan': 'Piping hot tandoori flatbread brushed with garlic butter to elevate any rich curry.',
    'Paneer Tikka (Tandoori)': 'Char-grilled with smoky aromatic spices and bell peppers — high protein, bold taste.',
    'Crispy Masala Dosa': 'Golden fermented crepe rolled around spiced potatoes, served with fresh coconut chutney and sambar.',
    'Idli & Medu Vada Combo': 'Steamed fluffy rice cakes paired with crispy lentil donuts — light, wholesome, and traditional.',
    'Dum Hyderabadi Veg Biryani': 'Fragrant basmati rice cooked on slow dum with aromatic spices, saffron, and fresh vegetables.',
    'Amritsari Chole Bhature': 'Spicy Punjabi chickpeas paired with two hot puffed bhature for an indulgent, fiery feast.',
    'Mumbai Style Pav Bhaji': 'Mashed buttery vegetable bhaji packed with rich street flavors, served with toasted pav.',
    'Dahi Samosa Chaat': 'Crispy crushed samosas topped with chilled sweet curd, tangy tamarind, mint sauce, and crunchy sev.',
    'Hot Gulab Jamun (2 Pcs)': 'Warm milk-solid dumplings soaked in aromatic rose and cardamom sugar syrup.',
    'Kesari Mango Lassi': 'Chilled, thick sweet yogurt shake blended with Alphonso mango pulp and pistachios.',
    'Classic Margherita Pizza': 'Crisp wood-fired crust with San Marzano sauce and melted buffalo mozzarella for pure Italian bliss.',
    'Farmhouse Veggie Supreme Pizza': 'Loaded with crunchy veggies and mozzarella for a joyful, colorful slice.',
    'Creamy Fettuccine Alfredo': 'Silky parmesan and roasted garlic cream that warms up any mood instantly.',
    'Cheesy Garlic Sourdough Bread': 'Warm, golden melted garlic butter pull-apart bread for comforting cravings.',
    'Steamed Vegetable Dim Sum': 'Delicate, steaming dumplings bursting with crisp water chestnuts and shiitake.',
    'Authentic Pad Thai Noodles': 'Sweet-tangy tamarind wok noodles with peanuts and fresh lime to awaken your senses.',
    'Hakka Vegetable Noodles': 'Comforting Indo-Chinese wok noodles tossed with crunchy peppers and scallions.',
    'Classic Gourmet Veggie Burger': 'Juicy handcrafted patty with secret sauce and melted cheese for handheld comfort.',
    'Crispy Paneer Royale Burger': 'Panko-crusted crispy paneer with chipotle slaw that satisfies deep hunger.',
    'Loaded Fiesta Nachos': 'Heaped with warm queso, black beans, and guacamole — ultimate party mood food.',
    'Crispy Veggie Tacos (3 Pcs)': 'Crunchy shells bursting with zesty salsa and beans for a fiesta of flavors.',
    'Molten Chocolate Lava Cake': 'Warm decadent chocolate cake with a flowing molten core to lift your spirits.',
    'Classic Italian Tiramisu': 'Espresso-infused ladyfingers and whipped mascarpone cream for an elegant treat.',
    'Belgian Dark Chocolate Shake': 'Thick, frosty dark chocolate bliss topped with artisanal gelato.'
  };

  return reasons[dishName] || 'A signature restaurant specialty chosen specifically to elevate your mood tonight.';
}

module.exports = {
  getRecommendations
};
