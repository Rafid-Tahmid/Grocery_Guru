
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

    const form = document.getElementById('editProfileForm');
    form.appendChild(msg);
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

// Grab header elements for dynamic display
const profileContainer = document.querySelector(".profile-container");
const profileIconWindow = document.querySelector(".profileIconWindow");
const profileNameEl = document.querySelector(".profileCard-name");
const loginBtn = document.querySelector(".profileCard-bubble.login-btn");
const signoutBtn = document.querySelector(".profileCard-bubble.signout-btn");
const savedRecipesBtn = document.querySelector('.profileCard-bubble[href="saved_recipes.html"]');
const mealPlanBtn = document.querySelector('.profileCard-bubble[href="meal_planner.html"]');
const editProfileBtn = document.querySelector('.profileCard-bubble[href="edit_profile.html"]');

let hideDropdownTimeout; // For profile icon dropdown

// Function to update UI for logged-in state
function setLoggedIn(name) {
    // console.log("Setting logged in state for user:", name);
    if (profileNameEl) profileNameEl.textContent = `Welcome, ${name}`;
    if (loginBtn) loginBtn.style.display = "none";
    if (signoutBtn) signoutBtn.style.display = "block";
    if (savedRecipesBtn) savedRecipesBtn.style.display = "block";
    if (mealPlanBtn) mealPlanBtn.style.display = "block";
    if (editProfileBtn) editProfileBtn.style.display = "block";
}

// Function to update UI for logged-out state
function setLoggedOut() {
    // console.log("Setting logged out state.");
    if (profileNameEl) profileNameEl.textContent = "Welcome, User";
    if (loginBtn) loginBtn.style.display = "block";
    if (signoutBtn) signoutBtn.style.display = "none";
    if (savedRecipesBtn) savedRecipesBtn.style.display = "none";
    if (mealPlanBtn) mealPlanBtn.style.display = "none";
    if (editProfileBtn) editProfileBtn.style.display = "none";
}

// Function to show profile dropdown
function showDropdown() {
    clearTimeout(hideDropdownTimeout);
    if (profileIconWindow) {
        profileIconWindow.style.opacity = "1";
        profileIconWindow.style.pointerEvents = "auto";
    }
}

// Function to hide profile dropdown
function hideDropdown() {
    hideDropdownTimeout = setTimeout(() => {
        if (profileIconWindow) {
            profileIconWindow.style.opacity = "0";
            profileIconWindow.style.pointerEvents = "none";
        }
    }, 300);
}

// Attach event listeners for profile dropdown
if (profileContainer && profileIconWindow) {
    profileContainer.addEventListener("mouseenter", showDropdown);
    profileContainer.addEventListener("mouseleave", hideDropdown);
    profileIconWindow.addEventListener("mouseenter", showDropdown);
    profileIconWindow.addEventListener("mouseleave", hideDropdown);
}

// Sign out handler
if (signoutBtn) {
    signoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        // console.log("Sign out button clicked.");
        try {
            const response = await fetch("/logout", {
                method: "POST",
                credentials: "include"
            });
            if (response.ok) {
                // console.log("Logged out successfully. Redirecting...");
                setLoggedOut();
                window.location.href = "/log_in.html"; // Redirect to login page
            } else {
                const errorData = await response.json();
                // console.error("Logout failed.", response.status, response.statusText, errorData);
                showMessage(errorData.message || 'Logout failed. Please try again.', 'error');
            }
        } catch (error) {
            // console.error("Network error during logout:", error);
            showMessage('Network error during logout. Please try again.', 'error');
        }
    });
}

// Function to load user data
async function loadUserData() {
    // console.log("Attempting to load user data...");
    try {
        const response = await fetch('/profile', { // Corrected endpoint
            credentials: 'include'
        });

        // console.log("User data fetch response status:", response.status);
        if (!response.ok) {
            const errorData = await response.json();
            // console.error('Failed to load user data:', response.status,
            // response.statusText, errorData);
            showMessage(errorData.message || 'Failed to load user data. Please try again.', 'error');
            throw new Error('Failed to load user data');
        }

        const userData = await response.json();
        // console.log("User data received successfully:", userData);

        // Populate form fields
        document.getElementById('firstName').value = userData.first_name || '';
        document.getElementById('lastName').value = userData.last_name || '';
        document.getElementById('email').value = userData.email_address || '';
        document.getElementById('phoneNumber').value = userData.phone_number || '';
        document.getElementById('state').value = userData.state || '';
        document.getElementById('postcode').value = userData.postcode || '';

    } catch (error) {
        // console.error('Error loading user data:', error);
        // showMessage('Failed to load user data.
        // Please try again.', 'error'); // Already handled above
    }
}

// Function to handle form submission
function setupFormSubmission() {
    const form = document.getElementById('editProfileForm');
    const newPasswordField = document.getElementById('newPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Get form data
        const formData = {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phoneNumber: document.getElementById('phoneNumber').value.replace(/\s/g, ''), // Remove spaces from phone number
            state: document.getElementById('state').value,
            postcode: document.getElementById('postcode').value,
            currentPassword: document.getElementById('currentPassword').value
        };

        // Check if user wants to change password
        const newPassword = newPasswordField.value;
        const confirmPassword = confirmPasswordField.value;

        if (newPassword || confirmPassword) {
            if (newPassword !== confirmPassword) {
                showMessage('New passwords do not match', 'error');
                return;
            }
            if (newPassword.length < 4) {
                showMessage('New password must be at least 4 characters long', 'error');
                return;
            }
            formData.newPassword = newPassword;
        }

        try {
            const response = await fetch('/api/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Profile updated successfully!', 'success');
                // Clear password fields
                document.getElementById('currentPassword').value = '';
                newPasswordField.value = '';
                confirmPasswordField.value = '';
            } else if (response.status === 409) { // Handle email already exists conflict
                showMessage(data.message || 'An account with this email already exists.', 'error');
            } else {
                showMessage(data.message || 'Failed to update profile', 'error');
            }
        } catch (error) {
            // console.error('Error updating profile:', error);
            showMessage('Network error. Please try again.', 'error');
        }
    });
}

// Function to validate postcode
function setupPostcodeValidation() {
    const postcodeInput = document.getElementById('postcode');
    postcodeInput.addEventListener('input', function (e) {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length > 4) value = value.slice(0, 4); // Limit to 4 digits
        e.target.value = value;
    });
}

// Initialize dark mode
function initDarkMode() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const darkModeToggle = document.getElementById('darkModeToggle'); // Ensure this element exists in edit_profile.html header

    // Check for saved theme preference or use system preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        if (darkModeToggle) {
            darkModeToggle.querySelector('i').className = savedTheme === 'dark' ? 'fas fa-cog' : 'fas fa-moon';
        }
    } else if (prefersDarkScheme.matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (darkModeToggle) {
            darkModeToggle.querySelector('i').className = 'fas fa-cog';
        }
    }

    // Set up toggle button listener
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function () {
            // console.log("Dark mode toggle clicked.");
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const isDark = currentTheme === 'dark';
            const newTheme = isDark ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            const icon = darkModeToggle.querySelector('i');
            icon.className = newTheme === 'dark' ? 'fas fa-cog' : 'fas fa-moon';
            // console.log("Theme set to:", newTheme);
        });
    }
}

// Function to check login status and update UI
async function checkLoginStatus() {
    // console.log("Checking login status...");
    try {
        const response = await fetch('/profile', { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            setLoggedIn(data.first_name);
        } else {
            setLoggedOut();
        }
    } catch (error) {
        // console.error("Error checking login status:", error);
        setLoggedOut();
    }
}

// Run functions on page load
document.addEventListener('DOMContentLoaded', () => {
    setupPasswordToggles();
    loadUserData();
    setupFormSubmission();
    setupPostcodeValidation();
    initDarkMode(); // Initialize dark mode on this page
    checkLoginStatus(); // Check login status on page load
});

// Hide/reveal header on scroll
let lastY = window.scrollY;
const header = document.querySelector(".header"); // Ensure the header element is selected
if (header) {
    window.addEventListener("scroll", () => {
        if (window.scrollY > lastY) {
            header.classList.add("hide-on-scroll");
        } else {
            header.classList.remove("hide-on-scroll");
        }
        lastY = window.scrollY;
    });
}
