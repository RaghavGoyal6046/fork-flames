/**
 * Cart Page Logic
 * Handles cart localstorage, quantity updates, coupon calculation, and checkout simulation
 */

document.addEventListener('DOMContentLoaded', () => {
    renderCart();

    const applyCouponBtn = document.getElementById('apply-coupon-btn');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', applyCoupon);
    }

    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', processCheckout);
    }

    const orderTypeSelect = document.getElementById('order-type-select');
    if (orderTypeSelect) {
        orderTypeSelect.addEventListener('change', handleOrderTypeChange);
    }
});

let currentDiscountPercent = 0;
const TAX_RATE = 0.05; // 5% GST
let currentOrderType = 'delivery';
let DELIVERY_FEE = 40;

function handleOrderTypeChange(e) {
    currentOrderType = e.target.value;
    const tableGroup = document.getElementById('table-number-group');
    const deliveryFeeLine = document.getElementById('delivery-fee-line');
    
    if (currentOrderType === 'dine_in') {
        tableGroup.style.display = 'block';
        deliveryFeeLine.style.display = 'none';
        DELIVERY_FEE = 0;
    } else {
        tableGroup.style.display = 'none';
        deliveryFeeLine.style.display = 'flex';
        DELIVERY_FEE = 40;
    }
    
    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    updateSummary(subtotal);
}

function getCart() {
    return JSON.parse(localStorage.getItem('ff_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('ff_cart', JSON.stringify(cart));
    if (typeof updateCartCount === 'function') updateCartCount();
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const emptyMsg = document.getElementById('empty-cart-msg');
    const sidebar = document.getElementById('checkout-sidebar');
    if (!container) return;

    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = '';
        emptyMsg.style.display = 'block';
        sidebar.style.opacity = '0.5';
        sidebar.style.pointerEvents = 'none';
        updateSummary(0);
        return;
    }

    emptyMsg.style.display = 'none';
    sidebar.style.opacity = '1';
    sidebar.style.pointerEvents = 'all';

    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">₹${item.price.toFixed(2)} each</div>
            </div>
            
            <div class="qty-controls">
                <button class="qty-btn" onclick="updateQty('${item.id}', -1)"><i class="fa-solid fa-minus"></i></button>
                <span style="font-weight:600; width:20px; text-align:center">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQty('${item.id}', 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
            
            <div style="font-weight:700; width:80px; text-align:right">
                ₹${(item.price * item.quantity).toFixed(2)}
            </div>
            
            <button class="remove-btn" onclick="removeItem('${item.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    updateSummary(subtotal);
}

window.updateQty = function(id, change) {
    let cart = getCart();
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        saveCart(cart);
    }
};

window.removeItem = function(id) {
    let cart = getCart();
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
};

function applyCoupon() {
    const input = document.getElementById('coupon-input');
    const msg = document.getElementById('coupon-msg');
    const code = input.value.trim().toUpperCase();

    if (code === 'SAVE20') {
        currentDiscountPercent = 0.20;
        msg.className = 'coupon-msg coupon-success';
        msg.innerHTML = '<i class="fa-solid fa-check"></i> 20% off applied!';
        document.getElementById('discount-row').style.display = 'flex';
        document.getElementById('coupon-badge').textContent = 'SAVE20';
    } else {
        currentDiscountPercent = 0;
        msg.className = 'coupon-msg coupon-error';
        msg.innerHTML = '<i class="fa-solid fa-xmark"></i> Invalid coupon code';
        document.getElementById('discount-row').style.display = 'none';
    }

    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    updateSummary(subtotal);
}

function updateSummary(subtotal) {
    const elSub = document.getElementById('summary-subtotal');
    const elTax = document.getElementById('summary-tax');
    const elDel = document.getElementById('summary-delivery');
    const elDisc = document.getElementById('summary-discount');
    const elTot = document.getElementById('summary-total');

    if (!elSub) return;

    if (subtotal === 0) {
        elSub.textContent = '₹0.00';
        elTax.textContent = '₹0.00';
        elDel.textContent = '₹0.00';
        elTot.textContent = '₹0.00';
        return;
    }

    const discountAmount = subtotal * currentDiscountPercent;
    const postDiscount = subtotal - discountAmount;
    const taxAmount = postDiscount * TAX_RATE;
    const total = postDiscount + taxAmount + DELIVERY_FEE;

    elSub.textContent = `₹${subtotal.toFixed(2)}`;
    elTax.textContent = `₹${taxAmount.toFixed(2)}`;
    elDel.textContent = `₹${DELIVERY_FEE.toFixed(2)}`;
    
    if (currentDiscountPercent > 0) {
        elDisc.textContent = `-₹${discountAmount.toFixed(2)}`;
    }

    elTot.textContent = `₹${total.toFixed(2)}`;
}

async function processCheckout() {
    const cart = getCart();
    if (cart.length === 0) return;

    const token = localStorage.getItem('ff_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const tableNumber = document.getElementById('table-number').value.trim();
    if (currentOrderType === 'dine_in' && !tableNumber) {
        alert('Please enter your Table Number for Dine-In.');
        return;
    }

    const overlay = document.getElementById('processing-overlay');
    overlay.classList.add('active');

    // Calculate totals matching backend
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const taxAmount = subtotal * TAX_RATE; // Simplified without discount for now
    const totalAmount = subtotal + taxAmount + DELIVERY_FEE;

    // Transform cart to match backend items schema
    // Assuming the item.id in frontend is the mock ID. 
    // Wait, since we are using a real backend now, cart items should have real ObjectIds.
    // Let's assume the backend will accept whatever items we send for this prototype or we map them.
    // We will just send them. If it fails, we will need to fetch real menu items.
    // For now, let's send it matching the schema.
    const orderItems = cart.map(item => ({
        menuItem: item.id.length === 24 ? item.id : '6639b981f9b3191c9c811111', // Fallback if mock ID
        name: item.name,
        quantity: item.quantity,
        price: item.price
    }));

    try {
        const res = await fetch(`${window.API_URL}/orders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                orderType: currentOrderType,
                tableName: tableNumber || null,
                items: orderItems,
                subtotal: subtotal,
                tax: taxAmount,
                deliveryFee: DELIVERY_FEE,
                totalAmount: totalAmount
            })
        });

        const data = await res.json();
        
        if (data.success) {
            localStorage.removeItem('ff_cart');
            window.location.href = 'orders.html';
        } else {
            alert(data.error || 'Failed to place order.');
            overlay.classList.remove('active');
        }
    } catch (err) {
        alert('Error connecting to server.');
        overlay.classList.remove('active');
    }
}
