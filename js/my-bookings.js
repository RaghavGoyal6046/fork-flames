/**
 * My Bookings Logic
 * Fetches the logged-in customer's bookings
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchMyBookings();
});

async function fetchMyBookings() {
    const token = localStorage.getItem('ff_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch(`${window.API_URL}/api/bookings/mybookings`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
            renderMyBookings(data.bookings);
        } else {
            console.error('Failed to fetch bookings:', data.error);
        }
    } catch (err) {
        console.error('Network error fetching bookings', err);
    }
}

function renderMyBookings(bookings) {
    const tbody = document.getElementById('my-bookings-tbody');
    if (!tbody) return;

    if (bookings.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-muted);">You don't have any table reservations yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = bookings.map(booking => {
        let statusClass = 'status-pending';
        let statusText = 'Pending Approval';
        
        if (booking.status === 'confirmed') {
            statusClass = 'status-active';
            statusText = 'Confirmed';
        } else if (booking.status === 'cancelled') {
            statusClass = 'status-error';
            statusText = 'Cancelled / Rejected';
        }

        return `
            <tr>
                <td>
                    <div style="font-weight:600; font-size: 1.1rem; color: var(--text-main);">${booking.date}</div>
                    <div style="color:var(--primary); font-weight: 500;"><i class="fa-regular fa-clock"></i> ${booking.time}</div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-users" style="color:var(--text-muted);"></i> 
                        <span style="font-weight:600">${booking.guests} People</span>
                    </div>
                </td>
                <td>
                    <span style="color:var(--text-muted); font-size: 0.9rem;">
                        ${booking.specialRequests ? `"${booking.specialRequests}"` : 'None'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
            </tr>
        `;
    }).join('');
}
