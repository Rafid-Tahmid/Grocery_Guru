document.addEventListener("DOMContentLoaded", () => {
  // Initialize dark mode
  const darkModeToggle = document.getElementById('darkModeToggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  // Function to toggle theme
  function toggleTheme(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (darkModeToggle) {
      darkModeToggle.querySelector('i').className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  // Check for saved user preference, first in localStorage, then system pref
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    toggleTheme(savedTheme === 'dark');
  } else {
    toggleTheme(prefersDarkScheme.matches);
  }

  // Add click event listener to the dark mode toggle button
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');

      // Update any open delete confirmation modal
      const modal = document.querySelector('.delete-confirm-modal');
      if (modal) {
        const modalContent = modal.querySelector('.modal-content');
        const messageElement = modal.querySelector('p');
        const cancelBtn = modal.querySelector('button:first-child');

        if (modalContent) {
          modalContent.style.backgroundColor = isDark ? 'white' : '#2d2d2d';
          modalContent.style.boxShadow = isDark
            ? '0 4px 8px rgba(0,0,0,0.2)'
            : '0 4px 8px rgba(0,0,0,0.4)';
        }

        if (messageElement) {
          messageElement.style.color = isDark ? '#333333' : '#ffffff';
        }

        if (cancelBtn) {
          cancelBtn.style.backgroundColor = isDark ? '#f1f1f1' : '#3d3d3d';
          cancelBtn.style.color = isDark ? '#333333' : '#ffffff';
          cancelBtn.style.border = isDark ? 'none' : '1px solid #404040';
        }
      }
    });
  }

  // First check if user has admin access
  fetch('/admin/users', {
    credentials: 'include'
  })
    .then((res) => {
      if (res.status === 403) {
        // User is not an admin
        window.location.href = '/index.html';
        throw new Error('Access denied. Admin privileges required.');
      }
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    })
    .catch((error) => {
      if (error.message !== 'Access denied. Admin privileges required.') {
        // Show error in UI instead of alert
        const errorDiv = document.createElement('div');
        errorDiv.textContent = 'An error occurred while loading the admin panel. Please try again later.';
        errorDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#f44;color:white;padding:10px;border-radius:5px;z-index:10000';
        document.body.appendChild(errorDiv);
        setTimeout(() => document.body.removeChild(errorDiv), 5000);
      }
      window.location.href = '/index.html';
    });

  const addUserBtn = document.getElementById("addUserBtn");
  const editUserBtn = document.getElementById("editUserBtn");
  const selectAllCheckbox = document.getElementById("selectAll");
  const addUserModal = document.getElementById("addUserModal");
  const addUserForm = document.getElementById("addUserForm");
  const editUserModal = document.getElementById("editUserModal");
  const editUserForm = document.getElementById("editUserForm");
  const userSearchInput = document.getElementById("userSearchInput");
  const userSearchBtn = document.getElementById("userSearchBtn");
  const applyFiltersBtn = document.getElementById("applyFiltersBtn");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const deleteUserBtn = document.getElementById("deleteUserBtn");
  let currentEditingRow = null;
  let currentUserId = null;

  // Get current user info
  async function getCurrentUser() {
    try {
      const response = await fetch('/admin/current-user', {
        credentials: 'include'
      });
      if (response.ok) {
        const user = await response.json();
        currentUserId = user.user_id;
      }
    } catch (error) {
      // Ignore error, currentUserId will remain null
    }
  }

  // Initialize current user
  getCurrentUser();

  // Only run on the admin panel page
  if (!addUserBtn) return;

  // Table reference
  const tbody = document.querySelector(".admin-user-table tbody");

  // Helper function to show error messages in UI
  function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.textContent = message;
    errorDiv.style.cssText = 'position:fixed;top:20px;right:20px;background:#f44;color:white;padding:10px;border-radius:5px;z-index:10000';
    document.body.appendChild(errorDiv);
    setTimeout(() => {
      if (errorDiv.parentNode) {
        document.body.removeChild(errorDiv);
      }
    }, 5000);
  }

  // Confirmation modal function
  function createConfirmModal(message) {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.classList.add('delete-confirm-modal');
      Object.assign(modal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '9999'
      });

      const modalContent = document.createElement('div');
      modalContent.classList.add('modal-content');
      Object.assign(modalContent.style, {
        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#2d2d2d' : 'white',
        padding: '30px',
        borderRadius: '12px',
        maxWidth: '400px',
        boxShadow: document.documentElement.getAttribute('data-theme') === 'dark'
          ? '0 4px 8px rgba(0,0,0,0.4)'
          : '0 4px 8px rgba(0,0,0,0.2)',
        textAlign: 'center'
      });

      const messageElement = document.createElement('p');
      messageElement.textContent = message;
      messageElement.style.margin = '0 0 20px 0';
      messageElement.style.color = document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#333333';

      const buttonsContainer = document.createElement('div');
      Object.assign(buttonsContainer.style, {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px'
      });

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Delete';
      Object.assign(confirmBtn.style, {
        padding: '12px 24px',
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease'
      });

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      Object.assign(cancelBtn.style, {
        padding: '12px 24px',
        backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#3d3d3d' : '#f1f1f1',
        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#ffffff' : '#333333',
        border: document.documentElement.getAttribute('data-theme') === 'dark' ? '1px solid #404040' : 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease'
      });

      confirmBtn.addEventListener('mouseover', () => {
        confirmBtn.style.backgroundColor = '#c82333';
        confirmBtn.style.transform = 'translateY(-2px)';
      });

      confirmBtn.addEventListener('mouseout', () => {
        confirmBtn.style.backgroundColor = '#dc3545';
        confirmBtn.style.transform = 'translateY(0)';
      });

      cancelBtn.addEventListener('mouseover', () => {
        cancelBtn.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#4d4d4d' : '#e0e0e0';
        cancelBtn.style.transform = 'translateY(-2px)';
      });

      cancelBtn.addEventListener('mouseout', () => {
        cancelBtn.style.backgroundColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#3d3d3d' : '#f1f1f1';
        cancelBtn.style.transform = 'translateY(0)';
      });

      buttonsContainer.appendChild(cancelBtn);
      buttonsContainer.appendChild(confirmBtn);
      modalContent.appendChild(messageElement);
      modalContent.appendChild(buttonsContainer);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      confirmBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(true);
      });

      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(false);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(false);
        }
      });
    });
  }

  // Close Modal functions for both modals
  function setupModalClose(element) {
    if (!element) return;

    const modal = element; // Create local reference to avoid parameter mutation warnings

    const closeBtn = modal.querySelector('.admin-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = "none";
      });
    }

    // Close Modal when clicking outside
    window.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });

    // Cancel button closes modal
    const cancelBtn = modal.querySelector('.cancel-modal-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.style.display = "none";
      });
    }
  }

  // Search and Filter functionality
  function filterUsers() {
    const searchQuery = userSearchInput.value.toLowerCase();
    const stateCheckboxes = document.querySelectorAll("input[name='stateFilter']:checked");
    const selectedStates = Array.from(stateCheckboxes).map((checkbox) => checkbox.value);
    const userRows = document.querySelectorAll(".admin-user-table tbody tr");
    const noResultsElement = document.getElementById("noResultsFound");

    let visibleRowCount = 0;

    userRows.forEach((row) => {
      const firstName = row.cells[1].textContent.toLowerCase();
      const lastName = row.cells[2].textContent.toLowerCase();
      const email = row.cells[3].textContent.toLowerCase();
      const username = row.cells[4].textContent.toLowerCase();
      const state = row.cells[7].textContent.trim();

      // Check if row matches search query
      const matchesSearch = searchQuery === ''
        || firstName.includes(searchQuery)
        || lastName.includes(searchQuery)
        || email.includes(searchQuery)
        || username.includes(searchQuery);

      // Check if row matches state filter
      const matchesState = selectedStates.length === 0 || selectedStates.includes(state);

      // Show/hide row based on filter results
      if (matchesSearch && matchesState) {
        row.setAttribute('style', '');
        visibleRowCount++;
      } else {
        row.setAttribute('style', 'display: none');
      }
    });

    // Show/hide "No results found" message
    if (noResultsElement) {
      noResultsElement.style.display = visibleRowCount === 0 ? 'block' : 'none';
    }
  }

  // Function to load users from the backend
  async function loadUsers() {
    try {
      const response = await fetch('/admin/users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const users = await response.json();

      // Clear existing rows
      tbody.innerHTML = '';

      // Add users to table
      users.forEach((user) => {
        const {
          user_id,
          first_name,
          last_name,
          email_address,
          user_name,
          phone_number,
          state,
          postcode,
          is_admin
        } = user;
        const row = document.createElement('tr');
        row.dataset.userId = user_id;

        // Create admin badge
        const adminBadge = is_admin
          ? '<span class="admin-badge yes">Yes</span>'
          : '<span class="admin-badge no">No</span>';

        row.innerHTML = `
          <td><input type="checkbox" class="user-checkbox"></td>
          <td>${first_name || ''}</td>
          <td>${last_name || ''}</td>
          <td>${email_address || ''}</td>
          <td>${user_name || ''}</td>
          <td>••••••</td>
          <td>${phone_number || ''}</td>
          <td>${state || ''}</td>
          <td>${postcode || ''}</td>
          <td>${adminBadge}</td>
        `;
        tbody.appendChild(row);
      });

      // Apply any active filters
      filterUsers();
    } catch (error) {
      if (error.message === 'Failed to fetch users') {
        window.location.href = '/log_in.html';
      } else {
        showErrorMessage('Failed to load users. Please try again later.');
      }
    }
  }

  // Load users when page loads
  loadUsers();

  // Add event listeners for search/filter
  if (userSearchBtn) {
    userSearchBtn.addEventListener('click', filterUsers);
  }

  if (userSearchInput) {
    userSearchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') {
        filterUsers();
      }
    });
  }

  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', filterUsers);
  }

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
      // Clear search input
      if (userSearchInput) userSearchInput.value = '';

      // Get all checked state checkboxes and uncheck them
      const checkedBoxes = document.querySelectorAll("input[name='stateFilter']:checked");

      // For each checkbox, uncheck it and trigger change event
      checkedBoxes.forEach((checkbox) => {
        const element = checkbox;
        element.checked = false;
        element.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Run the filter function with cleared values
      filterUsers();

      // Hide the "No results found" message
      const noResultsElement = document.getElementById("noResultsFound");
      if (noResultsElement) {
        noResultsElement.style.display = 'none';
      }
    });
  }

  // Helper function to clear all input fields in a container
  function clearInputs(container) {
    const inputs = container.querySelectorAll('input:not([type="checkbox"]):not([type="hidden"])');
    inputs.forEach((input) => {
      const element = input;
      element.value = '';
    });
  }

  // Helper function to get data from a table row
  function getUserDataFromRow(row) {
    const cells = row.querySelectorAll('td');
    const adminBadge = cells[9].querySelector('.admin-badge');
    const isAdmin = adminBadge && adminBadge.classList.contains('yes');

    return {
      userId: row.dataset.userId,
      firstName: cells[1].textContent.trim(),
      lastName: cells[2].textContent.trim(),
      email: cells[3].textContent.trim(),
      username: cells[4].textContent.trim(),
      password: '', // Password is masked in the UI
      phone: cells[6].textContent.trim(),
      state: cells[7].textContent.trim(),
      postcode: cells[8].textContent.trim(),
      isAdmin: isAdmin
    };
  }

  // Helper function to update Edit button state
  function updateEditButtonState() {
    const checkedBoxes = document.querySelectorAll(".user-checkbox:checked");
    if (editUserBtn) {
      // Only enable the Edit button when exactly one user is selected
      const singleUserSelected = checkedBoxes.length === 1;
      editUserBtn.disabled = !singleUserSelected;
      editUserBtn.classList.toggle("disabled-btn", !singleUserSelected);
    }
  }

  // Helper function to update select all checkbox state
  function updateSelectAllState() {
    if (selectAllCheckbox) {
      const visibleCheckboxes = Array.from(document.querySelectorAll(".user-checkbox")).filter(
        (checkbox) => checkbox.closest("tr").style.display !== 'none'
      );
      const visibleCheckedBoxes = Array.from(document.querySelectorAll(".user-checkbox:checked")).filter(
        (checkbox) => checkbox.closest("tr").style.display !== 'none'
      );
      selectAllCheckbox.checked = visibleCheckboxes.length > 0
        && visibleCheckboxes.length === visibleCheckedBoxes.length;
    }
  }

  // Helper function to update button states
  function updateButtonStates() {
    const checkedBoxes = document.querySelectorAll(".user-checkbox:checked");
    if (deleteUserBtn) {
      deleteUserBtn.disabled = checkedBoxes.length === 0;
    }
    updateEditButtonState();
  }

  // Select All checkbox functionality
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", () => {
      const isChecked = selectAllCheckbox.checked;
      const checkboxes = document.querySelectorAll(".user-checkbox");
      checkboxes.forEach((checkbox) => {
        const element = checkbox;
        const row = element.closest("tr");
        if (row.style.display !== 'none') {
          element.checked = isChecked;
          row.classList.toggle("selected-row", isChecked);
        }
      });

      // Update delete button state
      if (deleteUserBtn) {
        deleteUserBtn.disabled = !isChecked;
      }

      // Update edit button state
      updateEditButtonState();
    });

    // Update "Select All" checkbox state based on individual checkboxes
    tbody.addEventListener("change", (event) => {
      if (event.target.classList.contains("user-checkbox")) {
        const visibleCheckboxes = Array.from(document.querySelectorAll(".user-checkbox")).filter(
          (checkbox) => checkbox.closest("tr").style.display !== 'none'
        );
        const checkedBoxes = Array.from(document.querySelectorAll(".user-checkbox:checked"));
        const visibleCheckedBoxes = checkedBoxes.filter(
          (checkbox) => checkbox.closest("tr").style.display !== 'none'
        );

        selectAllCheckbox.checked = visibleCheckboxes.length > 0
          && visibleCheckboxes.length === visibleCheckedBoxes.length;

        // Update delete button state
        if (deleteUserBtn) {
          deleteUserBtn.disabled = checkedBoxes.length === 0;
        }

        // Update edit button state
        updateEditButtonState();
      }
    });
  }

  // Initialize edit button state
  updateEditButtonState();

  // Delete User button functionality
  if (deleteUserBtn) {
    deleteUserBtn.disabled = document.querySelectorAll(".user-checkbox:checked").length === 0;

    deleteUserBtn.addEventListener("click", async () => {
      const selectedRows = tbody.querySelectorAll(".user-checkbox:checked");
      if (selectedRows.length === 0) return;

      const confirmMessage = selectedRows.length === 1
        ? "Are you sure you want to delete this user?"
        : `Are you sure you want to delete these ${selectedRows.length} users?`;

      // Create modal for confirmation
      if (await createConfirmModal(confirmMessage)) {
        // Collect all user IDs first to avoid await in loop
        const userIds = Array.from(selectedRows).map((checkbox) => {
          const row = checkbox.closest("tr");
          return { checkbox, row, userId: row.dataset.userId };
        });

        // Delete users sequentially without await in loop
        const deletePromises = userIds.map(async ({ row, userId }) => {
          try {
            const response = await fetch(`/admin/users/${userId}`, {
              method: 'DELETE',
              credentials: 'include'
            });

            if (!response.ok) {
              throw new Error('Failed to delete user');
            }

            // Add fade-out animation
            const tableRow = row; // Create local reference to avoid parameter mutation
            tableRow.style.transition = "opacity 0.3s ease";
            tableRow.style.opacity = "0";

            // Remove row after animation
            setTimeout(() => {
              tableRow.remove();
              updateSelectAllState();
              updateButtonStates();
            }, 300);
          } catch (error) {
            if (error.message === 'Failed to delete user') {
              window.location.href = '/log_in.html';
            } else {
              showErrorMessage('Failed to delete user. Please try again.');
            }
          }
        });

        // Wait for all deletions to complete
        await Promise.all(deletePromises);
      }
    });
  }

  // Add User Button - Open Modal
  addUserBtn.addEventListener("click", () => {
    if (addUserForm) clearInputs(addUserForm);
    addUserModal.style.display = "block";
  });

  // Edit User Button
  if (editUserBtn) {
    editUserBtn.addEventListener("click", () => {
      if (editUserBtn.disabled) return;

      const checkedBoxes = document.querySelectorAll(".user-checkbox:checked");
      if (checkedBoxes.length !== 1) {
        showErrorMessage(checkedBoxes.length === 0
          ? "Please select a user to edit."
          : "Please select only one user to edit.");
        return;
      }

      const row = checkedBoxes[0].closest("tr");
      if (!row) return;

      currentEditingRow = row;
      const userData = getUserDataFromRow(row);

      // Populate the edit form
      document.getElementById("editUserId").value = userData.userId;
      document.getElementById("editFirstName").value = userData.firstName;
      document.getElementById("editLastName").value = userData.lastName;
      document.getElementById("editEmail").value = userData.email;
      document.getElementById("editUsername").value = userData.username;
      document.getElementById("editPhone").value = userData.phone;
      document.getElementById("editState").value = userData.state;
      document.getElementById("editPostcode").value = userData.postcode;
      document.getElementById("editPassword").value = ''; // Clear password field
      document.getElementById("editIsAdmin").checked = userData.isAdmin;

      // Prevent user from removing their own admin status
      const editIsAdminCheckbox = document.getElementById("editIsAdmin");
      if (currentUserId && parseInt(userData.userId, 10) === currentUserId) {
        editIsAdminCheckbox.disabled = userData.isAdmin; // Disable only if they're currently admin
        if (userData.isAdmin) {
          const warningText = editIsAdminCheckbox.parentElement.querySelector('.self-admin-warning');
          if (!warningText) {
            const warning = document.createElement('small');
            warning.className = 'form-text self-admin-warning';
            warning.style.color = '#e74c3c';
            warning.textContent = 'You cannot remove your own admin privileges';
            editIsAdminCheckbox.parentElement.appendChild(warning);
          }
        }
      } else {
        editIsAdminCheckbox.disabled = false;
        const warningText = editIsAdminCheckbox.parentElement.querySelector('.self-admin-warning');
        if (warningText) {
          warningText.remove();
        }
      }

      // Show edit modal
      editUserModal.style.display = "block";
    });
  }

  // Form submission - Add User
  if (addUserForm) {
    addUserForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const formData = new FormData(addUserForm);
      const userData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        username: formData.get('username'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        state: formData.get('state'),
        postcode: formData.get('postcode'),
        isAdmin: formData.get('isAdmin') === 'on'
      };

      try {
        const response = await fetch('/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(userData)
        });

        if (!response.ok) {
          throw new Error('Failed to add user');
        }

        // Reload users to get the new user with the correct ID
        await loadUsers();

        // Close modal and clear form
        addUserModal.style.display = "none";
        addUserForm.reset();
      } catch (error) {
        if (error.message === 'Failed to add user') {
          window.location.href = '/log_in.html';
        } else {
          showErrorMessage('Failed to add user. Please try again.');
        }
      }
    });
  }

  // Form submission - Edit User
  if (editUserForm) {
    editUserForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!currentEditingRow) return;

      const formData = new FormData(editUserForm);
      const userId = formData.get('editUserId');
      const userData = {
        firstName: formData.get('editFirstName'),
        lastName: formData.get('editLastName'),
        email: formData.get('editEmail'),
        username: formData.get('editUsername'),
        password: formData.get('editPassword'),
        phone: formData.get('editPhone'),
        state: formData.get('editState'),
        postcode: formData.get('editPostcode'),
        isAdmin: formData.get('editIsAdmin') === 'on'
      };

      try {
        const response = await fetch(`/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(userData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update user');
        }

        // Update the row with new data
        const cells = currentEditingRow.querySelectorAll('td');
        cells[1].textContent = userData.firstName;
        cells[2].textContent = userData.lastName;
        cells[3].textContent = userData.email;
        cells[4].textContent = userData.username;
        cells[6].textContent = userData.phone;
        cells[7].textContent = userData.state;
        cells[8].textContent = userData.postcode;

        // Update admin badge
        const adminBadge = userData.isAdmin
          ? '<span class="admin-badge yes">Yes</span>'
          : '<span class="admin-badge no">No</span>';
        cells[9].innerHTML = adminBadge;

        // Highlight the updated row briefly
        currentEditingRow.style.transition = "background-color 0.5s";
        currentEditingRow.style.backgroundColor = "#e8f7f2";
        setTimeout(() => {
          currentEditingRow.style.backgroundColor = "";
        }, 1500);

        // Close modal and reset form
        editUserModal.style.display = "none";
        currentEditingRow = null;
        editUserForm.reset();

        // Apply any active filters
        filterUsers();
      } catch (error) {
        if (error.message === 'Failed to update user') {
          window.location.href = '/log_in.html';
        } else {
          showErrorMessage(error.message || 'Failed to update user. Please try again.');
        }
      }
    });
  }

  // Setup close handlers for both modals
  setupModalClose(addUserModal);
  setupModalClose(editUserModal);
});
