/* public/log_in.js */

/* global grecaptcha */

const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const title = document.getElementById('title');
const submitBtn = document.querySelector('.submit-btn');
const forgotLink = document.querySelector('.forgot');

// Form Fields
const firstName = document.getElementById('firstName');
const lastName = document.getElementById('lastName');
const email = document.getElementById('email');
const username = document.getElementById('username');
const phoneNumber = document.getElementById('phoneNumber');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const state = document.getElementById('state');
const postcode = document.getElementById('postcode');

const form = document.getElementById('form');
const forgot = document.querySelector('.forgot');
const formBox = document.querySelector('.form-box');
const memberLoginText = document.getElementById('member-login-text');
const memberSignupText = document.getElementById('member-signup-text');
const backToLoginText = document.getElementById('back-to-login-text');


let isSignupMode = false; // Keep track of mode

postcode.addEventListener('input', function (e) {
  let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
  if (value.length > 4) value = value.slice(0, 4); // Limit to 4 digits
  e.target.value = value;
});

function formatPhoneNumber(e) {
  let input = e.target.value;
  let numeric = input.replace(/\D/g, '');

  if (numeric.length > 10) {
    numeric = numeric.slice(0, 10);
  }

  // Only format if input length is increasing (not deleting)
  if (e.inputType && e.inputType.startsWith('delete')) {
    e.target.value = numeric;
    return;
  }

  let formatted = numeric;
  if (numeric.length > 6) {
    formatted = `${numeric.slice(0, 4)} ${numeric.slice(4, 7)} ${numeric.slice(7)}`;
  } else if (numeric.length > 4) {
    formatted = `${numeric.slice(0, 4)} ${numeric.slice(4)}`;
  }

  e.target.value = formatted;
}

phoneNumber.addEventListener('input', formatPhoneNumber);

// Function to toggle password visibility
function setupPasswordToggles() {
  const passwordField = document.getElementById('password');
  const confirmPasswordField = document.getElementById('confirmPassword');
  const passwordToggle = document.querySelector('.password-toggle');
  const confirmPasswordToggle = document.querySelectorAll('.password-toggle')[1];

  // Only set up toggles if they exist
  if (passwordToggle) {
    passwordToggle.addEventListener('click', () => {
      const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordField.setAttribute('type', type);

      // Toggle icon between eye and eye-slash
      const icon = passwordToggle.querySelector('i');
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    });
  }

  if (confirmPasswordToggle) {
    confirmPasswordToggle.addEventListener('click', () => {
      const type = confirmPasswordField.getAttribute('type') === 'password' ? 'text' : 'password';
      confirmPasswordField.setAttribute('type', type);

      // Toggle icon between eye and eye-slash
      const icon = confirmPasswordToggle.querySelector('i');
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    });
  }
}

function showLogin() {
  formBox.classList.remove('fade-in');
  formBox.classList.add('fade-out');

  setTimeout(() => {
    formBox.classList.remove('fade-out');
    formBox.classList.add('fade-in');

    title.innerText = 'Log in';
    submitBtn.innerText = 'Login';
    forgotLink.style.display = 'block';
    email.placeholder = "Username or Email Address";
    username.style.display = 'none';
    username.required = false;
    username.value = "";
    confirmPassword.required = false;
    confirmPassword.parentElement.style.display = 'none';
    firstName.style.display = 'none';
    lastName.style.display = 'none';
    state.style.display = 'none';
    // Insert required/disabled logic for state here:
    state.required = false;
    state.disabled = true;
    postcode.style.display = 'none';
    phoneNumber.style.display = 'none';
    document.querySelector('.dropdown-icon').style.display = 'none';

    loginBtn.classList.add('active');
    signupBtn.classList.remove('active');
    isSignupMode = false;

    password.parentElement.style.display = 'block';
    loginBtn.style.display = 'inline-block';
    signupBtn.style.display = 'inline-block';

    memberLoginText.style.display = 'none';
    memberSignupText.style.display = 'block';
    backToLoginText.style.display = 'none';
  }, 300);
}

function showSignup() {
  formBox.classList.remove('fade-in');
  formBox.classList.add('fade-out');

  setTimeout(() => {
    formBox.classList.remove('fade-out');
    formBox.classList.add('fade-in');

    title.innerText = 'Sign up';
    submitBtn.innerText = 'Signup';
    forgotLink.style.display = 'none';
    username.style.display = 'block';
    email.style.display = 'block';
    password.parentElement.style.display = 'block';
    confirmPassword.parentElement.style.display = 'block';
    firstName.style.display = 'block';
    lastName.style.display = 'block';
    state.style.display = 'block';
    // Insert required/disabled logic for state here:
    state.required = true;
    state.disabled = false;
    postcode.style.display = 'block';
    phoneNumber.style.display = 'block';
    loginBtn.style.display = 'inline-block';
    signupBtn.style.display = 'inline-block';
    document.querySelector('.dropdown-icon').style.display = 'block';

    username.required = true;
    confirmPassword.required = true;
    email.placeholder = "Email Address";
    isSignupMode = true;

    memberLoginText.style.display = 'block';
    memberSignupText.style.display = 'none';
    backToLoginText.style.display = 'none';

    signupBtn.classList.add('active');
    loginBtn.classList.remove('active');
  }, 300);
}

function bindSwitchLinks() {
  const signupLink = document.getElementById('signupLink');
  const loginLink = document.getElementById('loginLink');
  const returnLoginLink = document.getElementById('returnLogin');
  if (signupLink && !signupLink.hasListener) {
    signupLink.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });
    signupLink.hasListener = true;
  }
  if (loginLink && !loginLink.hasListener) {
    loginLink.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
    loginLink.hasListener = true;
  }
  if (returnLoginLink && !returnLoginLink.hasListener) {
    returnLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
    returnLoginLink.hasListener = true;
  }
}

loginBtn.addEventListener('click', showLogin);
signupBtn.addEventListener('click', showSignup);
forgot.addEventListener('click', (e) => {
  e.preventDefault();
  window.location.href = '/forgot-password.html';
});
bindSwitchLinks();
showLogin();

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
  form.appendChild(msg);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const emailValue = email.value;
  const usernameValue = username.value;
  const passwordValue = password.value;
  const confirmPasswordValue = confirmPassword.value;
  const firstNameValue = firstName.value;
  const lastNameValue = lastName.value;
  const phoneNumberValue = phoneNumber.value.replace(/\s/g, ''); // Remove spaces from phone number
  const stateValue = state.value;
  const postcodeValue = postcode.value;

  // Validate password length for signup
  if (isSignupMode && passwordValue.length < 4) {
    showMessage('Password must be at least 4 characters long', 'error');
    return;
  }

  try {
    const res = await fetch('/submit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(
        isSignupMode
          ? {
            email: emailValue,
            username: usernameValue,
            password: passwordValue,
            confirmPassword: confirmPasswordValue,
            firstName: firstNameValue,
            lastName: lastNameValue,
            phoneNumber: phoneNumberValue,
            state: stateValue,
            postcode: postcodeValue
          }
          : { email: emailValue, password: passwordValue }
      )
    });
    const data = await res.json();
    if (!res.ok) {
      showMessage(data.message || 'Error', 'error');
    } else {
      showMessage(data.message, 'info');
      if (isSignupMode) {
        // After signup, redirect to login mode
        showLogin();
      } else {
        // After login, go home
        window.location.href = '/index.html';
      }
    }
  } catch (err) {
    showMessage('Network error', 'error');
  }
});

function setInitialLoginState() {
  title.innerText = 'Log in';
  submitBtn.innerText = 'Login';
  forgotLink.style.display = 'block';
  email.placeholder = "Username or Email Address";
  username.style.display = 'none';
  username.required = false;
  username.value = "";
  confirmPassword.required = false;
  confirmPassword.parentElement.style.display = 'none';
  firstName.style.display = 'none';
  lastName.style.display = 'none';
  state.style.display = 'none';
  // Insert required/disabled logic for state here:
  state.required = false;
  state.disabled = true;
  postcode.style.display = 'none';
  phoneNumber.style.display = 'none';
  document.querySelector('.dropdown-icon').style.display = 'none';

  loginBtn.classList.add('active');
  signupBtn.classList.remove('active');
  isSignupMode = false;

  password.parentElement.style.display = 'block';
  loginBtn.style.display = 'inline-block';
  signupBtn.style.display = 'inline-block';

  memberLoginText.style.display = 'none';
  memberSignupText.style.display = 'block';
  backToLoginText.style.display = 'none';
}

setInitialLoginState();

// Dark mode functionality
function initDarkMode() {
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  function toggleTheme(isDark) {
    // Apply theme to multiple elements to ensure it works
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Update toggle button icon
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

document.addEventListener('DOMContentLoaded', function () {
  // Call the other initialization functions
  setInitialLoginState();
  bindSwitchLinks();
  setupPasswordToggles();
  initDarkMode(); // Initialize dark mode
});

// Password visibility toggle
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
