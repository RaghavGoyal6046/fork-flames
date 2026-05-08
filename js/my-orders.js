/**
 * My Orders & Review Logic
 */

let currentRating = 0;

document.addEventListener('DOMContentLoaded', () => {
    fetchMyOrders();
    setupStarRating();
});

async function fetchMyOrders() {
    const token = localStorage.getItem('ff_token');
    if (!token) return window.location.href = 'login.html';

    try {
        const res = await fetch(`${window.API_URL}/api/orders/myorders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            renderMyOrders(data.data);
        } else {
            console.error('Failed to fetch orders:', data.error);
        }
    } catch (err) {
        console.error('Network error', err);
    }
}

function renderMyOrders(orders) {
    const tbody = document.getElementById('my-orders-tbody');
    if (!tbody) return;

    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">You haven't placed any orders yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        let statusClass = 'status-pending';
        if (order.status === 'delivered' || order.status === 'served') statusClass = 'status-active';
        if (order.status === 'cancelled') statusClass = 'status-error';

        // Check if order is completed, then allow review
        let actionBtn = '';
        if (order.status === 'delivered' || order.status === 'served') {
            actionBtn = `<button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="openReviewModal()"><i class="fa-solid fa-pen"></i> Review</button>`;
        } else {
            actionBtn = `<a href="orders.html" class="btn btn-outline" style="padding: 6px 12px; font-size: 0.85rem;"><i class="fa-solid fa-location-dot"></i> Track</a>`;
        }

        const typeBadge = order.orderType === 'dine_in' 
            ? `<span style="color:#C084FC"><i class="fa-solid fa-chair"></i> ${order.tableName || 'Dine-In'}</span>`
            : `<span style="color:var(--primary)"><i class="fa-solid fa-motorcycle"></i> Delivery</span>`;

        const itemsSummary = order.items.map(i => `${i.quantity}x ${i.name}`).join(', ');

        return `
            <tr>
                <td style="font-family: monospace; color: var(--text-main); font-weight:600;">${order._id.substring(0,8).toUpperCase()}</td>
                <td>${typeBadge}</td>
                <td><span style="font-size:0.85rem; color:var(--text-muted); display:inline-block; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${itemsSummary}">${itemsSummary}</span></td>
                <td style="font-weight:600">₹${order.totalAmount.toFixed(2)}</td>
                <td><span class="status-badge ${statusClass}">${order.status.toUpperCase()}</span></td>
                <td>${actionBtn}</td>
            </tr>
        `;
    }).join('');
}

function setupStarRating() {
    const stars = document.querySelectorAll('.rating-stars i');
    stars.forEach(star => {
        star.addEventListener('click', (e) => {
            currentRating = parseInt(e.target.getAttribute('data-val'));
            stars.forEach(s => {
                if (parseInt(s.getAttribute('data-val')) <= currentRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });
}

function openReviewModal() {
    document.getElementById('reviewModal').style.display = 'block';
    document.getElementById('review-msg').textContent = '';
    currentRating = 0;
    document.querySelectorAll('.rating-stars i').forEach(s => s.classList.remove('active'));
    document.getElementById('review-comment').value = '';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
}

async function submitReview() {
    const comment = document.getElementById('review-comment').value.trim();
    const msgEl = document.getElementById('review-msg');
    
    if (currentRating === 0) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'Please select a star rating.';
        return;
    }
    if (!comment) {
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'Please write a comment.';
        return;
    }

    const token = localStorage.getItem('ff_token');
    try {
        const res = await fetch(`${window.API_URL}/api/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ rating: currentRating, comment: comment })
        });
        
        const data = await res.json();
        if (data.success) {
            msgEl.style.color = 'var(--success)';
            msgEl.textContent = 'Review submitted successfully! Thank you.';
            setTimeout(() => {
                closeReviewModal();
            }, 2000);
        } else {
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = data.error || 'Failed to submit review.';
        }
    } catch (err) {
        console.error(err);
        msgEl.style.color = 'var(--danger)';
        msgEl.textContent = 'Network error.';
    }
}
