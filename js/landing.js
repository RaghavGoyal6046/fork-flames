/**
 * Landing Page Logic
 * Handles testimonials loading from the API.
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchTestimonials();
});

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
