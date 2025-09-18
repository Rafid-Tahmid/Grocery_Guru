/* forgot-password.js */

// Function to show messages
function showMessage(message, type = 'info') {
    const existing = document.getElementById('form-message');
    if (existing) existing.remove();

    const msg = document.createElement('div');
    msg.id = 'form-message';
    msg.innerText = message;
    msg.style.marginTop = '10px';
    msg.style.padding = '10px';
    msg.style.borderRadius = '5px';
    msg.style.textAlign = 'center';

    if (type === 'error') {
        msg.style.color = '#721c24';
        msg.style.background = '#f8d7da';
        msg.style.border = '1px solid #f5c6cb';
    } else if (type === 'success') {
        msg.style.color = '#155724';
        msg.style.background = '#d4edda';
        msg.style.border = '1px solid #c3e6cb';
    } else {
        msg.style.color = '#004085';
        msg.style.background = '#d1ecf1';
        msg.style.border = '1px solid #bee5eb';
    }

    const form = document.getElementById('forgotForm');
    form.appendChild(msg);
}

// Dark mode functionality
function initDarkMode() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    function toggleTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');

        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            const icon = darkModeToggle.querySelector('i');
            if (icon) {
                icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
            }
        }

        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }

    // Apply saved theme immediately
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        toggleTheme(savedTheme === 'dark');
    } else {
        toggleTheme(prefersDarkScheme.matches);
    }

    // Set up toggle button listener
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            toggleTheme(currentTheme !== 'dark');
        });
    }

    // Listen for system theme changes
    prefersDarkScheme.addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            toggleTheme(e.matches);
        }
    });
}

// Form submission functionality
function setupFormSubmission() {
    const form = document.getElementById('forgotForm');
    const emailField = document.getElementById('email');
    const submitBtn = form.querySelector('.submit-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailField.value.trim();

        if (!email) {
            showMessage('Please enter your email address', 'error');
            return;
        }

        // Disable submit button and show loading state
        submitBtn.disabled = true;
        submitBtn.innerText = 'Sending...';

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(data.message, 'success');
                emailField.value = ''; // Clear the email field
                setTimeout(() => {
                    window.location.href = '/log_in.html';
                }, 3000);
            } else {
                showMessage(data.message || 'Error sending reset email', 'error');
            }
        } catch (error) {
            showMessage('Network error. Please try again.', 'error');
        } finally {
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.innerText = 'Send Reset Link';
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    initDarkMode();
    setupFormSubmission();
});
