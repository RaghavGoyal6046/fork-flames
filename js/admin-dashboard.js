/**
 * Admin Dashboard Logic
 * Role-based access for Owner and Staff
 */

document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('ff_user');
    if (!userStr) return window.location.href = 'login.html';
    
    const user = JSON.parse(userStr || "{}");
    
    // Setup UI based on role
    setupRoleUI(user);
    
    // Fetch Data
    fetchOrders();
    fetchBookings();
    fetchReviews();
    
    if (user.role === 'owner') {
        initRevenueChart();
        fetchStaff();
        fetchCategories(); // Load categories first
        fetchMenuData();
    }

    setupSectionSwitching();
});

function setupSectionSwitching() {
    const links = document.querySelectorAll('.dash-link[data-section]');
    const sections = [
        'owner-stats', 'owner-chart', 'bookings-section', 'orders-section', 
        'owner-reviews', 'owner-staff-list', 'owner-category-management', 'owner-menu-management'
    ];

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-section');
            
            // Remove active from all links
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Hide all sections first
            sections.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            // Show target
            const targetEl = document.getElementById(target);
            if (targetEl) {
                targetEl.style.display = target === 'owner-stats' ? 'grid' : (target.includes('section') ? 'grid' : 'block');
                
                // Special case for Overview: also show chart
                if (target === 'owner-stats') {
                    const chart = document.getElementById('owner-chart');
                    if (chart) chart.style.display = 'block';
                }
            }
        });
    });
}

function setupRoleUI(user) {
    document.getElementById('welcome-text').textContent = `Welcome, ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`;
    document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();

    if (user.role === 'owner') {
        const ownerElements = document.querySelectorAll('.owner-only');
        ownerElements.forEach(el => {
            // Sidebar links need flex, sections need block
            if (el.classList.contains('dash-link')) {
                el.style.display = 'flex';
            } else {
                el.style.display = 'block';
            }
        }); 
    } else if (user.role === 'staff') {
        // Staff doesn't see owner stats, so redirect them to Orders section by default
        const overviewLink = document.querySelector('.dash-link[data-section="owner-stats"]');
        if (overviewLink) overviewLink.style.display = 'none';
        
        // Auto-click Orders section for staff
        const ordersLink = document.querySelector('.dash-link[data-section="orders-section"]');
        if (ordersLink) ordersLink.click();
    }
}

async function fetchOrders() {
    const token = localStorage.getItem('ff_token');
    try {
        const res = await fetch(`${window.API_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            renderOrders(data.data);
            
            // Calculate today's revenue if owner
            const user = JSON.parse(localStorage.getItem('ff_user'));
            if(user.role === 'owner') {
                const totalRev = data.data.reduce((sum, o) => sum + o.totalAmount, 0);
                document.getElementById('today-revenue').textContent = `₹${totalRev.toFixed(2)}`;
            }
            
            // Pending orders count
            const pending = data.data.filter(o => o.status === 'placed' || o.status === 'preparing');
            document.getElementById('active-orders-count').textContent = pending.length;
            document.getElementById('orders-badge').textContent = pending.length;
        }
    } catch (err) {
        console.error('Error fetching orders', err);
    }
}

async function fetchBookings() {
    const token = localStorage.getItem('ff_token');
    try {
        const res = await fetch(`${window.API_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            renderBookings(data.bookings);
            const pending = data.bookings.filter(b => b.status === 'pending');
            document.getElementById('bookings-badge').textContent = pending.length;
        }
    } catch (err) {
        console.error('Error fetching bookings', err);
    }
}

async function fetchStaff() {
    const token = localStorage.getItem('ff_token');
    try {
        const res = await fetch(`${window.API_URL}/users/staff`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            renderStaff(data.data);
        }
    } catch (err) {
        console.error('Error fetching staff', err);
    }
}

window.updateOrderStatus = async function(id, newStatus) {
    const token = localStorage.getItem('ff_token');
    try {
        await fetch(`${window.API_URL}/orders/${id}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ status: newStatus })
        });
        fetchOrders();
    } catch (err) {
        console.error(err);
    }
}

window.updateBookingStatus = async function(id, newStatus) {
    const token = localStorage.getItem('ff_token');
    try {
        await fetch(`${window.API_URL}/bookings/${id}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ status: newStatus })
        });
        fetchBookings();
    } catch (err) {
        console.error(err);
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('orders-tbody');
    if (!tbody) return;

    tbody.innerHTML = orders.map(order => {
        let statusClass = 'status-pending';
        if (order.status === 'delivered' || order.status === 'served') statusClass = 'status-active';
        if (order.status === 'cancelled') statusClass = 'status-error';
        
        let actions = '';
        if (order.status === 'placed') {
            actions = `
                <button class="action-btn accept" onclick="updateOrderStatus('${order._id}', 'preparing')" title="Accept"><i class="fa-solid fa-check"></i></button>
                <button class="action-btn reject" onclick="updateOrderStatus('${order._id}', 'cancelled')" title="Reject"><i class="fa-solid fa-xmark"></i></button>
            `;
        } else if (order.status === 'preparing') {
            actions = `<button class="action-btn accept" onclick="updateOrderStatus('${order._id}', 'prepared')" title="Mark Prepared"><i class="fa-solid fa-utensils"></i></button>`;
        } else if (order.status === 'prepared') {
            if (order.orderType === 'dine_in') {
                actions = `<button class="action-btn accept" onclick="updateOrderStatus('${order._id}', 'served')" title="Mark Served"><i class="fa-solid fa-bell-concierge"></i></button>`;
            } else {
                actions = `<button class="action-btn accept" onclick="updateOrderStatus('${order._id}', 'out_for_delivery')" title="Out for Delivery"><i class="fa-solid fa-motorcycle"></i></button>`;
            }
        } else if (order.status === 'out_for_delivery') {
            actions = `<button class="action-btn accept" onclick="updateOrderStatus('${order._id}', 'delivered')" title="Mark Delivered"><i class="fa-solid fa-house-chimney"></i></button>`;
        } else {
            actions = `<i class="fa-solid fa-check" style="color:var(--success)"></i>`;
        }

        const typeBadge = order.orderType === 'dine_in' 
            ? `<span style="color:#C084FC"><i class="fa-solid fa-chair"></i> ${order.tableName || 'Dine-In'}</span>`
            : `<span style="color:var(--primary)"><i class="fa-solid fa-motorcycle"></i> Delivery</span>`;

        return `
            <tr>
                <td>
                    <div style="font-family: monospace; font-weight:600; font-size:0.8rem;">${order._id.substring(0,8)}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${order.user?.name || 'Customer'}</div>
                </td>
                <td style="font-weight:600">₹${order.totalAmount.toFixed(2)}</td>
                <td>${typeBadge}</td>
                <td><span class="status-badge ${statusClass}">${order.status.toUpperCase()}</span></td>
                <td>${actions}</td>
            </tr>
        `;
    }).join('');
}

function renderBookings(bookings) {
    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;

    tbody.innerHTML = bookings.map(booking => {
        let statusClass = 'status-pending';
        if (booking.status === 'confirmed') statusClass = 'status-active';
        if (booking.status === 'cancelled') statusClass = 'status-error'; // need to add this class or just style inline
        
        let actions = '';
        if (booking.status === 'pending') {
            actions = `
                <button class="action-btn accept" onclick="updateBookingStatus('${booking._id}', 'confirmed')" title="Confirm"><i class="fa-solid fa-check"></i></button>
                <button class="action-btn reject" onclick="updateBookingStatus('${booking._id}', 'cancelled')" title="Cancel"><i class="fa-solid fa-xmark"></i></button>
            `;
        } else {
            actions = `<span style="color:var(--text-muted); font-size:0.9rem;">${booking.status}</span>`;
        }

        return `
            <tr>
                <td>
                    <div style="font-weight:600">${booking.date}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">${booking.time}</div>
                </td>
                <td>${booking.user?.name || 'Customer'}</td>
                <td><i class="fa-solid fa-users" style="color:var(--text-muted); font-size:0.8rem"></i> ${booking.guests}</td>
                <td><span class="status-badge ${statusClass}">${booking.status.toUpperCase()}</span></td>
                <td>${actions}</td>
            </tr>
        `;
    }).join('');
}

function renderStaff(staffArr) {
    const tbody = document.getElementById('staff-tbody');
    if (!tbody) return;

    tbody.innerHTML = staffArr.map(staff => `
        <tr>
            <td style="font-weight:600">${staff.name}</td>
            <td>${staff.email}</td>
            <td><span class="status-badge" style="background:rgba(255,255,255,0.1); color:var(--text-main)">${staff.role.toUpperCase()}</span></td>
            <td>
                <button class="action-btn reject" onclick="deleteStaff('${staff._id}')" title="Delete Staff">
                    <i class="fa-solid fa-user-xmark"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.openStaffModal = function() {
    document.getElementById('addStaffModal').style.display = 'block';
    document.getElementById('staff-msg').textContent = '';
    document.getElementById('staff-name').value = '';
    document.getElementById('staff-email').value = '';
    document.getElementById('staff-password').value = '';
}

window.closeStaffModal = function() {
    document.getElementById('addStaffModal').style.display = 'none';
}

window.submitNewStaff = async function() {
    const name = document.getElementById('staff-name').value.trim();
    const email = document.getElementById('staff-email').value.trim();
    const password = document.getElementById('staff-password').value;
    const role = document.getElementById('staff-role').value;
    const msgEl = document.getElementById('staff-msg');

    if (!name || !email || !password) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'All fields are required.';
        return;
    }

    const token = localStorage.getItem('ff_token');
    try {
        const res = await fetch(`${window.API_URL}/users/staff`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, password, role })
        });
        const data = await res.json();
        
        if (data.success) {
            msgEl.style.color = 'var(--success)';
            msgEl.textContent = 'Account created successfully!';
            fetchStaff(); // refresh list
            setTimeout(() => closeStaffModal(), 1500);
        } else {
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = data.error || 'Failed to create account.';
        }
    } catch (err) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'Network error.';
    }
}

window.deleteStaff = async function(id) {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    
    const token = localStorage.getItem('ff_token');
    try {
        const res = await fetch(`${window.API_URL}/users/staff/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            fetchStaff();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (err) {
        console.error(err);
    }
}

function initRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    Chart.defaults.color = '#A0A5BD';
    Chart.defaults.font.family = 'Inter, sans-serif';

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Revenue (₹)',
                data: [33600, 46400, 36000, 60000, 88000, 99600, 78400],
                borderColor: '#FF6B35',
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#1A1D2E',
                pointBorderColor: '#FF6B35',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, border: { display: false } },
                x: { grid: { display: false }, border: { display: false } }
            }
        }
    });
}

async function fetchReviews() {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    try {
        const res = await fetch(`${window.API_URL}/reviews`);
        const data = await res.json();
        
        if (data.success) {
            if (data.data.length === 0) {
                container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px;">No reviews yet.</p>';
                return;
            }
            renderReviews(data.data);
        }
    } catch (err) {
        console.error('Error fetching reviews', err);
    }
}

function renderReviews(reviews) {
    const container = document.getElementById('reviews-container');
    if (!container) return;

    container.innerHTML = reviews.map(rev => {
        let sentimentColor = 'var(--text-muted)';
        let sentimentIcon = 'fa-face-meh';
        if (rev.sentiment === 'positive') { sentimentColor = 'var(--success)'; sentimentIcon = 'fa-face-smile'; }
        if (rev.sentiment === 'negative') { sentimentColor = 'var(--danger)'; sentimentIcon = 'fa-face-frown'; }
        
        const stars = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);

        return `
            <div style="border-bottom: 1px solid var(--glass-border); padding-bottom: 16px; margin-bottom: 16px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                    <strong style="color:var(--text-main)">${rev.user?.name || 'Customer'}</strong>
                    <span style="color:${sentimentColor}; font-size:0.9rem;"><i class="fa-regular ${sentimentIcon}"></i></span>
                </div>
                <div style="color:#F59E0B; font-size:0.8rem; margin-bottom:8px;">${stars}</div>
                <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.4;">"${rev.comment}"</p>
            </div>
        `;
    }).join('');
}

// --- Menu Management Logic ---

let currentMenuItems = [];

async function fetchMenuData() {
    try {
        const res = await fetch(`${window.API_URL}/menu`);
        const data = await res.json();
        if (data.success) {
            currentMenuItems = data.data;
            renderMenuTable(currentMenuItems);
        }
    } catch (err) {
        console.error('Error fetching menu', err);
    }
}

function renderMenuTable(items) {
    const tbody = document.getElementById('menu-tbody');
    if (!tbody) return;

    tbody.innerHTML = items.map(item => `
        <tr>
            <td style="font-weight:600; color:var(--text-main);">${item.name}</td>
            <td><span class="status-badge" style="background:rgba(255,255,255,0.05); color:var(--text-muted)">${item.category}</span></td>
            <td style="font-weight:600;">₹${item.price.toFixed(2)}</td>
            <td>
                <button class="action-btn accept" onclick="editMenuItem('${item._id}')" title="Edit Item" style="margin-right: 5px;">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn reject" onclick="deleteMenuItem('${item._id}')" title="Delete Item">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.editMenuItem = function(id) {
    const item = currentMenuItems.find(i => i._id === id);
    if (!item) return;

    document.getElementById('addMenuModal').style.display = 'block';
    document.getElementById('menu-msg').textContent = '';
    
    document.getElementById('menu-modal-title').innerHTML = '<i class="fa-solid fa-utensils" style="color:var(--primary)"></i> Edit Menu Item';
    document.getElementById('menu-submit-btn').textContent = 'Update Item';
    
    document.getElementById('menu-id').value = item._id;
    document.getElementById('menu-name').value = item.name;
    document.getElementById('menu-category').value = item.category;
    document.getElementById('menu-price').value = item.price;
    document.getElementById('menu-image').value = ''; // Reset file input
    document.getElementById('menu-desc').value = item.description;
}

window.openMenuModal = function() {
    document.getElementById('addMenuModal').style.display = 'block';
    document.getElementById('menu-msg').textContent = '';
    
    document.getElementById('menu-modal-title').innerHTML = '<i class="fa-solid fa-utensils" style="color:var(--primary)"></i> Add Menu Item';
    document.getElementById('menu-submit-btn').textContent = 'Add Item';
    
    document.getElementById('menu-id').value = '';
    document.getElementById('menu-name').value = '';
    document.getElementById('menu-price').value = '';
    document.getElementById('menu-image').value = '';
    document.getElementById('menu-desc').value = '';
    
    populateCategoryDropdown();
}

function populateCategoryDropdown() {
    const select = document.getElementById('menu-category');
    if (!select) return;
    
    // Use categories fetched from backend
    select.innerHTML = currentCategories.map(cat => `
        <option value="${cat.name}">${cat.name}</option>
    `).join('');
}

window.closeMenuModal = function() {
    document.getElementById('addMenuModal').style.display = 'none';
}

window.submitNewMenuItem = async function() {
    const id = document.getElementById('menu-id').value;
    const name = document.getElementById('menu-name').value.trim();
    const category = document.getElementById('menu-category').value;
    const price = parseFloat(document.getElementById('menu-price').value);
    const imageFile = document.getElementById('menu-image').files[0];
    const desc = document.getElementById('menu-desc').value.trim();
    const msgEl = document.getElementById('menu-msg');

    if (!name || !price || !desc) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'Please fill all fields.';
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category', category);
    formData.append('price', price);
    formData.append('description', desc);
    if (imageFile) {
        formData.append('image', imageFile);
    }

    const token = localStorage.getItem('ff_token');
    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${window.API_URL}/menu/${id}` : `${window.API_URL}/menu`;
        
        const res = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        const data = await res.json();
        
        if (data.success) {
            msgEl.style.color = 'var(--success)';
            msgEl.textContent = id ? 'Item updated successfully!' : 'Item added successfully!';
            fetchMenuData(); // refresh list
            setTimeout(() => {
                closeMenuModal();
            }, 1500);
        } else {
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = data.error || 'Failed to add item.';
        }
    } catch (err) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'Network error.';
    }
}

window.deleteMenuItem = async function(id) {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    const token = localStorage.getItem('ff_token');
    try {
        const res = await fetch(`${window.API_URL}/menu/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (data.success) {
            fetchMenuData(); // refresh list
        } else {
            alert('Failed to delete: ' + data.error);
        }
    } catch (err) {
        console.error('Error deleting item', err);
    }
}

// --- Category Management Logic ---

let currentCategories = [];

async function fetchCategories() {
    try {
        const res = await fetch(`${window.API_URL}/categories`);
        const data = await res.json();
        if (data.success) {
            currentCategories = data.data;
            renderCategoryTable(currentCategories);
        }
    } catch (err) {
        console.error('Error fetching categories', err);
    }
}

function renderCategoryTable(categories) {
    const tbody = document.getElementById('category-tbody');
    if (!tbody) return;

    tbody.innerHTML = categories.map(cat => `
        <tr>
            <td style="font-weight:600; color:var(--text-main);">${cat.name}</td>
            <td><i class="fa-solid ${cat.icon}" style="color:var(--primary)"></i> ${cat.icon}</td>
            <td>
                <button class="action-btn reject" onclick="deleteCategory('${cat._id}')" title="Delete Category">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.openCategoryModal = function() {
    document.getElementById('addCategoryModal').style.display = 'block';
    document.getElementById('cat-msg').textContent = '';
    document.getElementById('cat-name').value = '';
    document.getElementById('cat-icon').value = 'fa-utensils';
}

window.closeCategoryModal = function() {
    document.getElementById('addCategoryModal').style.display = 'none';
}

window.submitNewCategory = async function() {
    const name = document.getElementById('cat-name').value.trim();
    const icon = document.getElementById('cat-icon').value.trim() || 'fa-utensils';
    const msgEl = document.getElementById('cat-msg');

    if (!name) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'Please enter a category name.';
        return;
    }

    const token = localStorage.getItem('ff_token');
    try {
        const res = await fetch(`${window.API_URL}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, icon })
        });
        const data = await res.json();
        
        if (data.success) {
            msgEl.style.color = 'var(--success)';
            msgEl.textContent = 'Category added successfully!';
            fetchCategories(); // refresh list
            setTimeout(() => {
                closeCategoryModal();
            }, 1500);
        } else {
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = data.error || 'Failed to add category.';
        }
    } catch (err) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'Network error.';
    }
}

window.deleteCategory = async function(id) {
    if (!confirm('Are you sure? This will not delete the menu items but they might become un-categorized.')) return;
    
    const token = localStorage.getItem('ff_token');
    try {
        const res = await fetch(`${window.API_URL}/categories/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await res.json();
        if (data.success) {
            fetchCategories(); // refresh list
        } else {
            alert('Failed to delete: ' + data.error);
        }
    } catch (err) {
        console.error('Error deleting category', err);
    }
}
