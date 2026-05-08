/**
 * Auth Logic
 * Handles Login/Signup Tabs and mock JWT generation
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tab Switching
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active classes
            tabs.forEach(t => t.classList.remove('active'));
            forms.forEach(f => f.classList.remove('active-form'));

            // Add active class to clicked tab and corresponding form
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-form`).classList.add('active-form');
        });
    });

    // 2. Login Submit
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const btn = loginForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
            btn.disabled = true;

            try {
                const res = await fetch(`${window.API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    handleSuccessfulAuth(data.token, data.user);
                } else {
                    alert(data.error || 'Login failed');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            } catch (err) {
                alert('Could not connect to server. Is the backend running?');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // 3. Signup Submit
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const role = document.getElementById('signup-role').value;

            const btn = signupForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';
            btn.disabled = true;

            try {
                const res = await fetch(`${window.API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });
                
                const data = await res.json();
                
                if (data.success) {
                    handleSuccessfulAuth(data.token, data.user);
                } else {
                    alert(data.error || 'Registration failed');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            } catch (err) {
                alert('Could not connect to server. Is the backend running?');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }
});

function handleSuccessfulAuth(token, user) {
    // Save to LocalStorage
    localStorage.setItem('ff_token', token);
    localStorage.setItem('ff_user', JSON.stringify(user));
    localStorage.setItem('ff_role', user.role);
    localStorage.setItem('ff_name', user.name);
    localStorage.setItem('ff_email', user.email);

    // Redirect based on role
    setTimeout(() => {
        if (user.role === 'owner' || user.role === 'staff') {
            window.location.href = 'admin-dashboard.html';
        } else {
            // Customer
            window.location.href = '../index.html';
        }
    }, 500);
}
