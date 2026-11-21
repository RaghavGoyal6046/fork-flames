/**
 * AI Recommendation Service
 * Integrates Google Gemini API with Grounded Context (live menu items)
 * and includes an intelligent fallback rule-based engine for high availability.
 */

const SYSTEM_PROMPT = `You are "Flames AI", an expert culinary sommelier and empathetic food concierge for "Fork & Flames" authentic Indian restaurant.
Your job is to analyze the customer's mood, emotional state, cravings, or dietary preference, and recommend 2 to 3 dishes STRICTLY from the provided restaurant menu catalog.

Rules:
1. ONLY recommend dishes that exist in the provided MENU CATALOG. Never invent or hallucinate dishes.
2. Empathize with the user's mood warmly, politely, and enticingly in 1-2 friendly sentences.
3. For each recommended dish, provide a compelling 1-sentence reason explaining why it fits their current mood.
4. Return your output in STRICT JSON format matching the schema provided.`;

/**
 * Main recommendation entry point
 */
async function getRecommendations(userMessage, menuItems) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }]
      }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json'
      }
    }),
    signal: AbortSignal.timeout(8000) // 8 second timeout
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini');

  const parsed = JSON.parse(rawText);

  // Hydrate recommendations with complete DB fields (image, price, category)
  const hydrated = (parsed.recommendations || []).map(rec => {
    const original = menuItems.find(m => m._id.toString() === rec.id || m.name.toLowerCase() === rec.name.toLowerCase());
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

  return {
    mood: parsed.mood || 'Personalized Dining',
    message: parsed.message || 'Here are our chef picks tailored to your mood tonight:',
    recommendations: hydrated,
    source: 'gemini-ai'
  };
}

/**
 * Heuristic & Semantic Mood Fallback Engine
 * Uses NLP keyword parsing and mood vector matching.
 */
function getHeuristicRecommendations(userMessage, menuItems) {
  const text = (userMessage || '').toLowerCase();

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
      keywords: ['sweet', 'dessert', 'meetha', 'sugar', 'midnight', 'ice cream', 'shake', 'drink', 'beverage'],
      mood: 'Sweet Indulgence & Refreshment',
      message: 'Treat yourself to rich traditional Indian sweets and luscious fruit-infused sips.',
      preferredDishes: ['Hot Gulab Jamun (2 Pcs)', 'Kesari Mango Lassi']
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
    'Kesari Mango Lassi': 'Chilled, thick sweet yogurt shake blended with Alphonso mango pulp and pistachios.'
  };

  return reasons[dishName] || 'A signature restaurant specialty chosen specifically to elevate your mood tonight.';
}

module.exports = {
  getRecommendations
};
