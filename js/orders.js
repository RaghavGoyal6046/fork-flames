/**
 * Orders Tracking Logic
 * Fetches real-time status from the backend API
 */

document.addEventListener('DOMContentLoaded', () => {
    fetchLatestOrder();
    
    // Poll every 5 seconds for live status
    setInterval(fetchLatestOrder, 5000);
});

async function fetchLatestOrder() {
    const token = localStorage.getItem('ff_token');
    if (!token) return window.location.href = 'login.html';

    try {
        const res = await fetch(`${window.API_URL}/orders/myorders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success && data.data && data.data.length > 0) {
            const latestOrder = data.data[0]; // Assuming descending sort from backend
            renderOrder(latestOrder);
        } else {
            document.getElementById('display-order-id').textContent = 'No active orders';
            document.querySelector('.map-placeholder').style.display = 'none';
            document.getElementById('stepper').style.display = 'none';
        }
    } catch (err) {
        console.error(err);
    }
}

function renderOrder(order) {
    document.getElementById('display-order-id').textContent = `Order: ${order._id.substring(0, 8).toUpperCase()}`;
    
    // Handle Dine-in vs Delivery UI
    if (order.orderType === 'dine_in') {
        document.querySelector('.map-placeholder').innerHTML = `
            <div style="background: var(--glass-bg); border-radius: 20px; padding: 40px; text-align: center; border: 1px solid var(--glass-border); height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <i class="fa-solid fa-utensils" style="font-size: 4rem; color: var(--primary); margin-bottom: 20px;"></i>
                <h2 style="margin: 0; color: white;">Dine-In</h2>
                <p style="font-size: 1.2rem; margin-top: 10px; color: var(--text-muted);">${order.tableName ? `Table: ${order.tableName}` : 'Table Pending'}</p>
            </div>
        `;
        setupDineInStepper(order.status);
    } else {
        setupDeliveryStepper(order.status);
    }
}

function setupDeliveryStepper(status) {
    const statuses = ['placed', 'confirmed', 'preparing', 'prepared', 'out_for_delivery', 'delivered'];
    let currentIndex = statuses.indexOf(status);
    if(status === 'served') currentIndex = 5; // Fallback if somehow served

    const stepper = document.getElementById('stepper');
    stepper.innerHTML = `
        <div class="stepper-progress" id="stepper-progress"></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-file-invoice"></i></div><div class="step-label">Placed</div></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-check-double"></i></div><div class="step-label">Confirmed</div></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-fire-burner"></i></div><div class="step-label">Preparing</div></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-utensils"></i></div><div class="step-label">Prepared</div></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-motorcycle"></i></div><div class="step-label">On the way</div></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-house-chimney"></i></div><div class="step-label">Delivered</div></div>
    `;

    // Update ETA based on status
    const etaEl = document.getElementById('eta-time');
    if (etaEl) {
        if (currentIndex <= 1) etaEl.textContent = '25-30 min';
        if (currentIndex === 2) etaEl.textContent = '15-20 min';
        if (currentIndex === 3) etaEl.textContent = '10-15 min';
        if (currentIndex === 4) etaEl.textContent = '5-10 min';
        if (currentIndex === 5) etaEl.textContent = 'Delivered!';
    }

    updateStepper(currentIndex, 6);
}

function setupDineInStepper(status) {
    const statuses = ['placed', 'confirmed', 'preparing', 'prepared', 'served'];
    let currentIndex = statuses.indexOf(status);
    if(status === 'out_for_delivery' || status === 'delivered') currentIndex = 4; // Fallback
    
    // Modify HTML of stepper to match dine in
    const stepper = document.getElementById('stepper');
    stepper.innerHTML = `
        <div class="stepper-progress" id="stepper-progress"></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-file-invoice"></i></div><div class="step-label">Placed</div></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-check-double"></i></div><div class="step-label">Confirmed</div></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-fire-burner"></i></div><div class="step-label">Preparing</div></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-utensils"></i></div><div class="step-label">Prepared</div></div>
        <div class="step"><div class="step-icon"><i class="fa-solid fa-bell-concierge"></i></div><div class="step-label">Served</div></div>
    `;
    
    updateStepper(currentIndex, 5);
}

function updateStepper(activeStepIndex, totalSteps) {
    const steps = document.querySelectorAll('.step');
    const progress = document.getElementById('stepper-progress');
    
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index < activeStepIndex) {
            step.classList.add('completed');
            if(index !== totalSteps - 1) {
               step.querySelector('.step-icon').innerHTML = '<i class="fa-solid fa-check"></i>';
            }
        } else if (index === activeStepIndex) {
            step.classList.add('active');
        }
    });

    const percentage = activeStepIndex < 0 ? 0 : (activeStepIndex / (totalSteps - 1)) * 100;
    
    if (window.innerWidth <= 768) {
        progress.style.width = '4px';
        progress.style.height = percentage + '%';
    } else {
        progress.style.width = percentage + '%';
        progress.style.height = '4px';
    }
}
