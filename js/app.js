/**
 * Global App Logic
 * Handles Navbar scroll, Auth state checking, and Cart count
 */

window.API_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Check Auth State (Mock JWT check)
    checkAuthState();

    // 3. Update Cart Count
    updateCartCount();
});

function checkAuthState() {
    const authBtn = document.getElementById('auth-btn');
    if (!authBtn) return; // Skip if not on a page with auth button

    const token = localStorage.getItem('ff_token');
    const userRole = localStorage.getItem('ff_role');
    const userName = localStorage.getItem('ff_name');

    if (token && userRole) {
        // User is logged in
        let dashboardLink = '#';
        if (userRole === 'customer') dashboardLink = 'pages/my-orders.html';
        if (userRole === 'owner' || userRole === 'staff') dashboardLink = 'pages/admin-dashboard.html';

        authBtn.innerHTML = `<i class="fa-regular fa-user"></i> ${userName || 'Dashboard'}`;
        authBtn.href = dashboardLink.startsWith('pages/') && window.location.pathname.includes('/pages/') 
            ? dashboardLink.replace('pages/', '') 
            : dashboardLink;
            
        // Add logout option next to dashboard link if needed, but for now we'll rely on dashboard logout.
    }
}

window.logout = function(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('ff_token');
    localStorage.removeItem('ff_role');
    localStorage.removeItem('ff_name');
    localStorage.removeItem('ff_email');
    
    // Redirect to home
    const isPagesDir = window.location.pathname.includes('/pages/');
    window.location.href = isPagesDir ? '../index.html' : 'index.html';
}

function updateCartCount() {
    const cartCountEl = document.getElementById('cart-count');
    if (!cartCountEl) return;

    const cart = JSON.parse(localStorage.getItem('ff_cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    cartCountEl.textContent = totalItems;
    
    // Add pulse animation on update
    if (totalItems > 0) {
        cartCountEl.style.transform = 'scale(1.2)';
        setTimeout(() => {
            cartCountEl.style.transform = 'scale(1)';
        }, 200);
    }
}

// Utility function to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};
