/**
 * Flames AI - Mood-Based Food Concierge Client Logic
 * Connects frontend user mood input to backend /api/ai/recommend
 * Features Grounded Dish Rendering and 1-Click Cart Actionability
 */

(function () {
  // Ensure window.API_URL is available
  if (!window.API_URL) {
    window.API_URL = '/api';
  }

  // Ensure window.addToCart is available globally on all pages
  if (typeof window.addToCart !== 'function') {
    window.addToCart = function (id, name, price) {
      let cart = JSON.parse(localStorage.getItem('ff_cart')) || [];
      const existing = cart.find(i => i.id === id);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ id, name, price, quantity: 1 });
      }
      localStorage.setItem('ff_cart', JSON.stringify(cart));

      // Trigger cart count update if function exists
      if (typeof updateCartCount === 'function') {
        updateCartCount();
      } else {
        const cartBadge = document.getElementById('cart-count');
        if (cartBadge) {
          const total = cart.reduce((sum, item) => sum + item.quantity, 0);
          cartBadge.textContent = total;
        }
      }
    };
  }

  // Inject UI when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    initFlamesAIWidget();
  });

  function initFlamesAIWidget() {
    // Avoid double injection
    if (document.getElementById('flames-ai-btn')) return;

    // 1. Inject Floating Button
    const btn = document.createElement('button');
    btn.id = 'flames-ai-btn';
    btn.className = 'flames-ai-btn';
    btn.setAttribute('aria-label', 'Open Flames AI Assistant');
    btn.innerHTML = `
      <i class="fa-solid fa-wand-magic-sparkles"></i>
      <span class="flames-ai-badge">AI</span>
    `;
    document.body.appendChild(btn);

    // 2. Inject Modal Chatbox
    const modal = document.createElement('div');
    modal.id = 'flames-ai-modal';
    modal.className = 'flames-ai-modal';
    modal.innerHTML = `
      <div class="flames-ai-header">
        <div class="flames-ai-title-group">
          <div class="flames-ai-avatar">
            <i class="fa-solid fa-fire"></i>
          </div>
          <div>
            <h3 class="flames-ai-title">Flames AI Concierge</h3>
            <span class="flames-ai-status">Grounded in Live Kitchen Menu</span>
          </div>
        </div>
        <button class="flames-ai-close" id="flames-ai-close" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="flames-ai-chips" id="flames-ai-chips">
        <button class="flames-chip" data-mood="Feeling exhausted after a long day, need warm comforting food">🛋️ Comfort Food</button>
        <button class="flames-chip" data-mood="Craving spicy chatpata street food with bold flavors">🌶️ Spicy Street Food</button>
        <button class="flames-chip" data-mood="Want something healthy, light and high-protein">🥗 Healthy & Light</button>
        <button class="flames-chip" data-mood="Grand celebration with family and friends, want a feast">🎉 Celebration Feast</button>
        <button class="flames-chip" data-mood="I have a sweet craving, show me traditional desserts and shakes">🍨 Sweet Indulgence</button>
        <button class="flames-chip" data-mood="Crisp and authentic South Indian morning or evening cravings">🥞 South Indian</button>
      </div>

      <div class="flames-ai-messages" id="flames-ai-messages">
        <div class="flames-msg bot">
          Namaste! 🙏 I am your <strong>Flames AI Sommelier</strong>. 
          <br><br>
          Tell me your mood, hunger level, or cravings, and I will recommend the perfect authentic dishes from our kitchen for you!
        </div>
      </div>

      <div class="flames-ai-footer">
        <form class="flames-ai-input-form" id="flames-ai-form">
          <input 
            type="text" 
            id="flames-ai-input" 
            class="flames-ai-input" 
            placeholder="Tell me your mood or craving..." 
            autocomplete="off" 
            required
          />
          <button type="submit" class="flames-ai-send-btn" id="flames-ai-send" aria-label="Send">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    // Event Listeners
    btn.addEventListener('click', () => {
      modal.classList.toggle('active');
      if (modal.classList.contains('active')) {
        document.getElementById('flames-ai-input').focus();
      }
    });

    document.getElementById('flames-ai-close').addEventListener('click', () => {
      modal.classList.remove('active');
    });

    // Chip Click Handlers
    const chips = modal.querySelectorAll('.flames-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const moodText = chip.getAttribute('data-mood');
        sendUserMessage(moodText);
      });
    });

    // Form Submit Handler
    const form = document.getElementById('flames-ai-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('flames-ai-input');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendUserMessage(text);
    });
  }

  async function sendUserMessage(text) {
    const messagesContainer = document.getElementById('flames-ai-messages');
    if (!messagesContainer) return;

    // 1. Append User Message
    const userDiv = document.createElement('div');
    userDiv.className = 'flames-msg user';
    userDiv.textContent = text;
    messagesContainer.appendChild(userDiv);

    // 2. Append Typing Indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'flames-typing';
    typingDiv.id = 'flames-typing-indicator';
    typingDiv.innerHTML = `
      <span class="flames-typing-dot"></span>
      <span class="flames-typing-dot"></span>
      <span class="flames-typing-dot"></span>
      <span style="font-size:0.75rem; color:#94A3B8; margin-left:6px;">Flames AI is curating dishes...</span>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Disable input while loading
    const sendBtn = document.getElementById('flames-ai-send');
    const input = document.getElementById('flames-ai-input');
    if (sendBtn) sendBtn.disabled = true;
    if (input) input.disabled = true;

    try {
      const res = await fetch(`${window.API_URL}/ai/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const json = await res.json();
      typingDiv.remove();

      if (json.success && json.data) {
        renderAIResponse(json.data);
      } else {
        renderBotText('Sorry, I had trouble finding recommendations right now. Please try choosing one of the mood options above!');
      }
    } catch (err) {
      typingDiv.remove();
      renderBotText('Could not connect to the culinary engine. Please check your internet connection and try again.');
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      if (input) {
        input.disabled = false;
        input.focus();
      }
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function renderBotText(text) {
    const messagesContainer = document.getElementById('flames-ai-messages');
    const botDiv = document.createElement('div');
    botDiv.className = 'flames-msg bot';
    botDiv.textContent = text;
    messagesContainer.appendChild(botDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function renderAIResponse(data) {
    const messagesContainer = document.getElementById('flames-ai-messages');
    const botDiv = document.createElement('div');
    botDiv.className = 'flames-msg bot';

    let cardsHtml = '';
    if (data.recommendations && data.recommendations.length > 0) {
      cardsHtml = data.recommendations.map(dish => `
        <div class="flames-dish-card">
          <img src="${dish.image}" alt="${dish.name}" class="flames-dish-img" loading="lazy" />
          <div class="flames-dish-info">
            <div class="flames-dish-header">
              <h4 class="flames-dish-title">${dish.name}</h4>
              <span class="flames-dish-price">₹${Number(dish.price).toFixed(2)}</span>
            </div>
            <p class="flames-dish-reason">"${dish.reason || dish.description}"</p>
            <button class="flames-dish-btn" onclick="window.addAIDishToCart('${dish.id}', '${dish.name.replace(/'/g, "\\'")}', ${dish.price}, this)">
              <i class="fa-solid fa-basket-shopping"></i> Add to Cart
            </button>
          </div>
        </div>
      `).join('');
    }

    botDiv.innerHTML = `
      ${data.mood ? `<span class="flames-msg-mood-tag">✨ Mood: ${data.mood}</span>` : ''}
      <div>${data.message}</div>
      ${cardsHtml}
    `;

    messagesContainer.appendChild(botDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Global helper for Add to Cart from AI cards with button animation
  window.addAIDishToCart = function (id, name, price, btn) {
    window.addToCart(id, name, price);

    if (btn) {
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i> Added!';
      btn.classList.add('added');

      setTimeout(() => {
        btn.innerHTML = originalHtml;
        btn.classList.remove('added');
      }, 1800);
    }
  };
})();
