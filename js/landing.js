/**
 * Landing Page Logic
 * Handles Dynamic Mock Data for Categories, Trending, and AI Recommendations
 */

// Mock Data
const categoriesData = [
    { name: 'Pizza', icon: 'fa-pizza-slice', color: '#EF4444' },
    { name: 'Burger', icon: 'fa-burger', color: '#F59E0B' },
    { name: 'Sushi', icon: 'fa-fish', color: '#10B981' },
    { name: 'Asian', icon: 'fa-bowl-rice', color: '#FF6B35' },
    { name: 'Desserts', icon: 'fa-ice-cream', color: '#EC4899' },
    { name: 'Healthy', icon: 'fa-leaf', color: '#84CC16' }
];

const trendingData = [
    {
        id: 't1',
        name: 'Truffle Mushroom Burger',
        restaurant: 'Burger Lounge',
        rating: 4.8,
        price: 350.00,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
        badge: 'Bestseller'
    },
    {
        id: 't2',
        name: 'Spicy Salmon Roll',
        restaurant: 'Zen Sushi',
        rating: 4.9,
        price: 450.00,
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80',
        badge: 'Trending'
    },
    {
        id: 't3',
        name: 'Margherita Woodfire',
        restaurant: 'Napoli Pizza',
        rating: 4.7,
        price: 380.00,
        image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=800&q=80'
    }
];

const aiRecsData = [
    {
        id: 'a1',
        name: 'Avocado Toast & Egg',
        restaurant: 'Green Cafe',
        rating: 4.6,
        price: 220.00,
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
        reason: 'Because you ordered Healthy food recently'
    },
    {
        id: 'a2',
        name: 'Spicy Pad Thai',
        restaurant: 'Bangkok Street',
        rating: 4.8,
        price: 320.00,
        image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?auto=format&fit=crop&w=800&q=80',
        reason: 'Matches your flavor profile'
    }
];

document.addEventListener('DOMContentLoaded', () => {
    renderCategories();
    renderTrending();
    renderAIRecs();
    fetchTestimonials();
});

function renderCategories() {
    const container = document.querySelector('.categories-grid');
    if (!container) return;

    container.innerHTML = categoriesData.map(cat => `
        <div class="category-card">
            <div class="category-icon" style="color: ${cat.color}">
                <i class="fa-solid ${cat.icon}"></i>
            </div>
            <div class="category-name">${cat.name}</div>
        </div>
    `).join('');
}

function renderTrending() {
    const container = document.getElementById('trending-container');
    if (!container) return;

    container.innerHTML = trendingData.map(item => createFoodCard(item)).join('');
}

function renderAIRecs() {
    const container = document.querySelector('.ai-grid');
    if (!container) return;

    container.innerHTML = aiRecsData.map(item => {
        const cardHtml = createFoodCard(item);
        // Inject the reason
        return cardHtml.replace('</div>\n        </div>\n    </div>', `
            <div style="margin-top:10px; font-size:0.85rem; color:#C084FC;">
                <i class="fa-solid fa-sparkles"></i> ${item.reason}
            </div>
        </div>
        </div>
    </div>`);
    }).join('');
}

function createFoodCard(item) {
    return `
    <div class="food-card">
        <div class="food-card-img">
            <img src="${item.image}" alt="${item.name}" loading="lazy">
            ${item.badge ? `<div class="food-card-badge">${item.badge}</div>` : ''}
        </div>
        <div class="food-card-content">
            <div class="food-card-header">
                <div>
                    <h3 class="food-card-title">${item.name}</h3>
                </div>
                <div class="food-card-rating">
                    <i class="fa-solid fa-star"></i> ${item.rating}
                </div>
            </div>
            <div class="food-card-footer">
                <div class="food-card-price">₹${item.price.toFixed(2)}</div>
                <button class="food-card-btn" onclick="addToCart('${item.id}', '${item.name}', ${item.price})" title="Add to Cart">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        </div>
    </div>
    `;
}

// Global addToCart accessible from HTML onclick
window.addToCart = function(id, name, price) {
    let cart = JSON.parse(localStorage.getItem('ff_cart')) || [];
    
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    
    localStorage.setItem('ff_cart', JSON.stringify(cart));
    
    // Update global cart counter
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
    
    // Show quick toast notification (simple alert for mock)
    // alert(`${name} added to cart!`);
    showToast(`${name} added to cart!`);
};

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--primary);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
        font-weight: 600;
    `;
    toast.innerHTML = `<i class="fa-solid fa-check-circle" style="margin-right:8px;"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
async function fetchTestimonials() {
    const container = document.getElementById('testimonials-container');
    if (!container) return;

    try {
        const res = await fetch(`${window.API_URL}/reviews`);
        const data = await res.json();
        
        if (data.success && data.data.length > 0) {
            // Take the latest 3 reviews
            const latestReviews = data.data.slice(-3).reverse();
            container.innerHTML = latestReviews.map(rev => `
                <div class="glass-panel" style="padding: 30px; border-radius: 20px; border: 1px solid var(--glass-border);">
                    <div style="color:#F59E0B; margin-bottom: 15px;">
                        ${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}
                    </div>
                    <p style="color: var(--text-muted); font-style: italic; line-height: 1.6; margin-bottom: 20px;">
                        "${rev.comment}"
                    </p>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white;">
                            ${(rev.user?.name || 'C').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: var(--text-main);">${rev.user?.name || 'Customer'}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Verified Customer</div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p style="text-align:center; grid-column: 1/-1; padding: 40px; color: var(--text-muted);">Be the first to leave a review!</p>';
        }
    } catch (err) {
        console.error('Error fetching reviews:', err);
    }
}
