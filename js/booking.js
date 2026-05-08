/**
 * Booking Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const bookingForm = document.getElementById('booking-form');
    
    // Set minimum date to today
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
    }

    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }
});

async function handleBookingSubmit(e) {
    e.preventDefault();

    const token = localStorage.getItem('ff_token');
    if (!token) {
        alert('Please sign in to book a table.');
        window.location.href = 'login.html';
        return;
    }

    const date = document.getElementById('booking-date').value;
    const time = document.getElementById('booking-time').value;
    const guests = document.getElementById('booking-guests').value;
    const specialRequests = document.getElementById('booking-notes').value;

    const errorEl = document.getElementById('booking-error');
    const successEl = document.getElementById('booking-success');
    const btn = e.target.querySelector('button[type="submit"]');

    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;

    try {
        const res = await fetch(`${window.API_URL}/api/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ date, time, guests, specialRequests })
        });

        const data = await res.json();

        if (data.success) {
            successEl.textContent = 'Booking request sent! Our staff will review it shortly.';
            successEl.style.display = 'block';
            e.target.reset();
        } else {
            errorEl.textContent = data.error || 'Failed to submit booking';
            errorEl.style.display = 'block';
        }
    } catch (err) {
        errorEl.textContent = 'Server error. Please try again.';
        errorEl.style.display = 'block';
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
