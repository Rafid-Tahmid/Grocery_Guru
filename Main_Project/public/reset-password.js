/* reset-password.js */

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

    const form = document.getElementById('resetForm');
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

// Function to toggle password visibility
function setupPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach((icon) => {
        icon.addEventListener('click', () => {
            const input = icon.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
}

// Form submission functionality
function setupFormSubmission() {
    const form = document.getElementById('resetForm');
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = newPasswordField.value;
        const confirmPassword = confirmPasswordField.value;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        // Validate password strength (minimum 4 characters)
        if (newPassword.length < 4) {
            showMessage('Password must be at least 4 characters long', 'error');
            return;
        }

        // Get token from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (!token) {
            showMessage('Invalid or missing reset token', 'error');
            return;
        }

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: token,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Password reset successfully! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = '/log_in.html';
                }, 2000);
            } else {
                showMessage(data.message || 'Error resetting password', 'error');
            }
        } catch (error) {
            showMessage('Network error. Please try again.', 'error');
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initDarkMode();
    setupPasswordToggles();
    setupFormSubmission();
});
