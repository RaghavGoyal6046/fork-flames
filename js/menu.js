/**
 * Menu Page Logic
 * Renders categories and menu items dynamically.
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchLiveMenu();
    setupScrollSpy();
});

async function fetchLiveMenu() {
    try {
        const [menuRes, catRes] = await Promise.all([
            fetch(`${window.API_URL}/menu`),
            fetch(`${window.API_URL}/categories`)
        ]);
        
        const menuData = await menuRes.json();
        const catData = await catRes.json();
        
        if (menuData.success && catData.success) {
            processMenuData(menuData.data, catData.data);
        } else {
            document.getElementById('menu-sections-container').innerHTML = '<p style="text-align:center; padding: 40px;">No menu items found. Please check back later.</p>';
        }
    } catch (err) {
        console.error('Error fetching menu:', err);
    }
}

function processMenuData(items, categories) {
    // Find which categories actually have items
    const activeCategories = [];
    
    // Map items and track categories
    const mappedItems = items.map(item => {
        const cat = categories.find(c => c.name === item.category) || { _id: 'misc', name: item.category, icon: 'fa-utensils' };
        const catId = `cat-${cat._id}`;
        
        if (!activeCategories.find(c => c.id === catId)) {
            activeCategories.push({
                id: catId,
                name: cat.name,
                icon: cat.icon
            });
        }
        
        return {
            id: item._id,
            catId: catId,
            name: item.name,
            desc: item.description,
            price: item.price,
            image: item.image !== 'no-photo.jpg' ? item.image : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
        };
    });

    renderCategoriesSidebar(activeCategories);
    renderMenuSections(activeCategories, mappedItems);
}

function renderCategoriesSidebar(categories) {
    const nav = document.getElementById('category-nav');
    if (!nav) return;

    nav.innerHTML = categories.map((cat, index) => `
        <a href="#${cat.id}" class="cat-link ${index === 0 ? 'active' : ''}">
            ${cat.name} ${cat.icon ? `<i class="fa-solid ${cat.icon}" style="float:right"></i>` : ''}
        </a>
    `).join('');
}

function renderMenuSections(categories, items) {
    const container = document.getElementById('menu-sections-container');
    if (!container) return;

    container.innerHTML = categories.map(cat => {
        const catItems = items.filter(item => item.catId === cat.id);
        if (catItems.length === 0) return '';

        return `
            <div class="menu-section" id="${cat.id}">
                <h2 class="menu-section-title">${cat.name}</h2>
                <div class="menu-items-grid">
                    ${catItems.map(item => `
                        <div class="menu-item-card">
                            <img src="${item.image}" alt="${item.name}" class="item-img" loading="lazy">
                            <div class="item-content">
                                <div>
                                    <h4 class="item-title">${item.name}</h4>
                                    <p class="item-desc">${item.desc}</p>
                                </div>
                                <div class="item-footer">
                                    <span class="item-price">₹${item.price.toFixed(2)}</span>
                                    <button class="item-add-btn" onclick="addToCart('${item.id}', '${item.name}', ${item.price})">
                                        <i class="fa-solid fa-plus"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function setupScrollSpy() {
    const links = document.querySelectorAll('.cat-link');
    const sections = document.querySelectorAll('.menu-section');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (scrollY >= sectionTop - 150) {
                current = section.getAttribute('id');
            }
        });

        links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    });
}

// Ensure addToCart is globally accessible (same as landing.js)
window.addToCart = function(id, name, price) {
    let cart = JSON.parse(localStorage.getItem('ff_cart')) || [];
    
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1 });
    }
    
    localStorage.setItem('ff_cart', JSON.stringify(cart));
    
    if (typeof updateCartCount === 'function') {
        updateCartCount();
    }
    
    // Quick inline Toast (if showToast not in app.js)
    const btn = document.querySelector(`button[onclick*="${id}"]`);
    if(btn) {
        const ogIcon = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i>';
        btn.style.background = 'var(--success)';
        btn.style.color = 'white';
        setTimeout(() => {
            btn.innerHTML = ogIcon;
            btn.style.background = '';
            btn.style.color = '';
        }, 1000);
    }
};
