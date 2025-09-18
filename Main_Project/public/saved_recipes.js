// Saved Recipes Page JavaScript Functionality

// Initialize variables globally (or within a scope that can be accessed by event listeners)
let allRecipes = [];
let filteredRecipes = [];
let currentView = "grid";
let isLoggedIn = false; // Assuming default to false, set true on login
let currentUser = null;
let selectedRecipeForMealPlan = null;

// DOM Elements - make sure these are accessible globally or passed around
const recipesGrid = document.getElementById("recipesGrid");
const recipesCount = document.getElementById("recipesCount");
const loadingSpinner = document.getElementById("loadingSpinner");
const emptyState = document.getElementById("emptyState");
const noResultsState = document.getElementById("noResultsState");

// Filter elements
const recipeSearch = document.getElementById("recipeSearch");
const categoryFilter = document.getElementById("categoryFilter");
const cuisineFilter = document.getElementById("cuisineFilter");
const sortFilter = document.getElementById("sortFilter");

const clearFiltersBtn = document.getElementById("clearFilters");
const clearFiltersBtn2 = document.getElementById("clearFiltersBtn");

// View toggle elements
const gridViewBtn = document.getElementById("gridViewBtn");
const listViewBtn = document.getElementById("listViewBtn");

// Modal elements
const recipeModal = document.getElementById("recipeModal");
const closeRecipeModal = document.getElementById("closeRecipeModal");
const mealPlanModal = document.getElementById("mealPlanModal");
const closeMealPlanModal = document.getElementById("closeMealPlanModal");
const addToMealPlanBtn = document.getElementById("addToMealPlanBtn");
const removeFromSavedBtn = document.getElementById("removeFromSavedBtn");

// Meal plan form elements
const mealPlanDay = document.getElementById("mealPlanDay");
const mealPlanType = document.getElementById("mealPlanType");
const confirmMealPlan = document.getElementById("confirmMealPlan");
const cancelMealPlan = document.getElementById("cancelMealPlan");

// Toast notification
const toast = document.getElementById("toast");
const toastIcon = document.getElementById("toastIcon");
const toastMessage = document.getElementById("toastMessage");

// Show toast notification
function showToast(message, type = "success") {
  if (!toast || !toastMessage || !toastIcon) return;

  toastMessage.textContent = message;

  // Set icon and class based on type
  toast.className = `toast ${type}`;

  switch (type) {
    case "success":
      toastIcon.className = "fas fa-check-circle";
      break;
    case "error":
      toastIcon.className = "fas fa-exclamation-circle";
      break;
    case "warning":
      toastIcon.className = "fas fa-exclamation-triangle";
      break;
    default:
      toastIcon.className = "fas fa-info-circle";
  }

  toast.classList.add("show");

  // Auto hide after 4 seconds
  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

// Expose showToast globally
window.showToast = showToast;

// Load saved recipes from API
async function loadSavedRecipes() {
  try {
    showLoadingState();

    const response = await fetch("/api/saved-recipes");

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch saved recipes: ${response.status} ${errorText}`
      );
    }

    const recipes = await response.json();

    // Filter out invalid or malformed recipes based on recipe_id and recipe_name
    const validRecipes = recipes.filter(recipe =>
      recipe.recipe_id &&
      !isNaN(parseInt(recipe.recipe_id)) &&
      recipe.recipe_name &&
      recipe.recipe_name.trim() !== ''
    );

    allRecipes = validRecipes.map(recipe => ({
      ...recipe,
      is_favorite: true, // All saved recipes are favorited
      date_saved: new Date(), // Add current date as fallback
    }));

    filteredRecipes = [...allRecipes];
    hideLoadingState();

    if (allRecipes.length === 0) {
      showEmptyState();
    } else {
      displayRecipes();
    }
  } catch (error) {
    hideLoadingState();
    showToast("Failed to load saved recipes: " + error.message, "error");
    showEmptyState();
  }
}

// Apply filters to recipes
function applyFilters() {
  const searchTerm = recipeSearch?.value.toLowerCase().trim() || "";
  const selectedCategory = categoryFilter?.value || "";
  const selectedCuisine = cuisineFilter?.value || "";

  const sortOption = sortFilter?.value || "date_desc";

  // Filter recipes
  filteredRecipes = allRecipes.filter((recipe) => {
    const matchesSearch =
      !searchTerm || recipe.recipe_name.toLowerCase().includes(searchTerm);

    const matchesCategory =
      !selectedCategory || recipe.recipe_category === selectedCategory;

    const matchesCuisine =
      !selectedCuisine || recipe.recipe_region === selectedCuisine;

    return matchesSearch && matchesCategory && matchesCuisine;
  });

  // Sort recipes
  sortRecipes(filteredRecipes, sortOption);

  // Display results
  if (filteredRecipes.length === 0 && allRecipes.length > 0) {
    showNoResultsState();
  } else {
    hideEmptyStates();
    displayRecipes();
  }
}

// Sort recipes based on selected option
function sortRecipes(recipes, sortOption) {
  switch (sortOption) {
    case "date_desc":
      recipes.sort((a, b) => (b.recipe_id || 0) - (a.recipe_id || 0));
      break;
    case "date_asc":
      recipes.sort((a, b) => (a.recipe_id || 0) - (b.recipe_id || 0));
      break;
    case "name_asc":
      recipes.sort((a, b) => a.recipe_name.localeCompare(b.recipe_name));
      break;
    case "name_desc":
      recipes.sort((a, b) => b.recipe_name.localeCompare(a.recipe_name));
      break;
    case "category":
      recipes.sort((a, b) =>
        a.recipe_category.localeCompare(b.recipe_category)
      );
      break;
    case "cuisine":
      recipes.sort((a, b) => a.recipe_region.localeCompare(b.recipe_region));
      break;
    default:
      break;
  }
}

// Clear all filters
function clearAllFilters() {
  if (recipeSearch) recipeSearch.value = "";
  if (categoryFilter) categoryFilter.value = "";
  if (cuisineFilter) cuisineFilter.value = "";

  if (sortFilter) sortFilter.value = "date_desc";

  filteredRecipes = [...allRecipes];
  sortRecipes(filteredRecipes, "date_desc");

  hideEmptyStates();
  displayRecipes();
}

// Set view mode (grid or list)
function setView(viewMode) {
  currentView = viewMode;

  // Update button states
  if (gridViewBtn && listViewBtn) {
    gridViewBtn.classList.toggle("active", viewMode === "grid");
    listViewBtn.classList.toggle("active", viewMode === "list");
  }

  // Update grid class
  if (recipesGrid) {
    recipesGrid.classList.toggle("list-view", viewMode === "list");
  }

  // Save preference to localStorage
  localStorage.setItem("savedRecipesView", viewMode);
}

// Display recipes in the grid
function displayRecipes() {
  if (!recipesGrid) return;

  // Update count
  if (recipesCount) {
    recipesCount.textContent = filteredRecipes.length;
  }

  // Clear existing recipes
  recipesGrid.innerHTML = "";

  // Generate recipe cards
  filteredRecipes.forEach((recipe) => {
    const recipeCard = createRecipeCard(recipe);
    recipesGrid.appendChild(recipeCard);
  });

  // Show results container
  const resultsContainer = document.querySelector(".results-container");
  if (resultsContainer) {
    resultsContainer.style.display = "block";
  }
}

// Create a recipe card element
function createRecipeCard(recipe) {
  const card = document.createElement("div");
  card.className = "recipe-card";
  card.dataset.recipeId = recipe.recipe_id;

  const imageUrl = recipe.recipe_photo || "/placeholder-recipe.jpg";
  const category = recipe.recipe_category || "Miscellaneous";
  const cuisine = recipe.recipe_region || "International";

  card.innerHTML = `
          <div class="recipe-card-image">
              <img src="${imageUrl}" alt="${recipe.recipe_name}" loading="lazy">
              <button class="recipe-favorite-btn favorited" data-recipe-id="${recipe.recipe_id}">
                  <i class="fas fa-star"></i>
              </button>
          </div>
          <div class="recipe-card-content">
              <h3 class="recipe-card-title">${recipe.recipe_name}</h3>
              <div class="recipe-card-meta">
                  <span class="recipe-tag category">
                      <i class="fas fa-utensils"></i>
                      ${category}
                  </span>
                  <span class="recipe-tag cuisine">
                      <i class="fas fa-globe"></i>
                      ${cuisine}
                  </span>
              </div>
          </div>
      `;

  // Add click event listener to navigate to recipe page
  card.addEventListener('click', () => {
    window.location.href = `recipe.html?id=${recipe.recipe_id}`;
  });

  // Add event listener for favorite button
  const favoriteBtn = card.querySelector(".recipe-favorite-btn");
  if (favoriteBtn) {
    favoriteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(recipe.recipe_id, favoriteBtn);
    });
  }

  return card;
}

// Toggle favorite status
async function toggleFavorite(recipeId, buttonElement) {
  try {
    const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipe_name: allRecipes.find(r => r.recipe_id == recipeId)?.recipe_name || "",
        recipe_category: allRecipes.find(r => r.recipe_id == recipeId)?.recipe_category || "",
        recipe_region: allRecipes.find(r => r.recipe_id == recipeId)?.recipe_region || "",
        recipe_photo: allRecipes.find(r => r.recipe_id == recipeId)?.recipe_photo || "",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to toggle favorite status");
    }

    const result = await response.json();

    // Handle unfavoriting (remove from list and re-render)
    if (!result.isFavorited) {
      showToast("Recipe removed from saved recipes", "success");

      // Remove from current view immediately
      allRecipes = allRecipes.filter(r => r.recipe_id !== recipeId);
      filteredRecipes = filteredRecipes.filter(r => r.recipe_id !== recipeId);
      displayRecipes(); // Re-render the grid
    } else {
      showToast("Recipe added to saved recipes", "success");
      // When a recipe is favorited, reload the entire list to ensure it appears.
      loadSavedRecipes();
    }

    // Update button state (if buttonElement is passed and it's the recipe card button)
    if (buttonElement) {
      if (result.isFavorited) {
        buttonElement.classList.add("favorited");
        buttonElement.querySelector("i").classList.replace("far", "fas");
      } else {
        buttonElement.classList.remove("favorited");
        buttonElement.querySelector("i").classList.replace("fas", "far");
      }
    }

    return result; // Return the full result for consistency
  } catch (error) {
    console.error("Error toggling favorite:", error);
    showToast("Failed to toggle favorite status: " + error.message, "error");
    return null;
  }
}

// Show recipe details modal
function showRecipeDetails(recipe) {
  const modal = document.getElementById("recipeModal");
  const modalContent = document.getElementById("modalRecipeContent");
  const modalTitle = document.getElementById("modalRecipeTitle");
  const addToMealPlanBtn = document.getElementById("addToMealPlanBtn");
  const removeFromSavedBtn = document.getElementById("removeFromSavedBtn");

  if (!modal || !modalContent || !modalTitle || !addToMealPlanBtn || !removeFromSavedBtn) {
    console.error("One or more modal elements not found.");
    return;
  }

  modalTitle.textContent = recipe.recipe_name;
  modalContent.innerHTML = `
          <img src="${recipe.recipe_photo || "/placeholder-recipe.jpg"}" alt="${recipe.recipe_name}" class="modal-recipe-image">
          <p><strong>Category:</strong> ${recipe.recipe_category || 'N/A'}</p>
          <p><strong>Cuisine:</strong> ${recipe.recipe_region || 'N/A'}</p>
          <!-- Add more details if available in recipe object -->
      `;

  // Set up action buttons
  addToMealPlanBtn.onclick = () => {
    // Implement add to meal plan logic for this recipe
    console.log("Add to meal plan clicked for:", recipe.recipe_name);
    openMealPlanModalWithRecipe(recipe);
  };

  removeFromSavedBtn.onclick = async () => {
    console.log("Remove from saved clicked for:", recipe.recipe_name);
    const result = await toggleFavorite(recipe.recipe_id, null); // Pass null as buttonElement since we are not updating this button
    if (result && !result.isFavorited) {
      // Recipe successfully removed, close modal and refresh the list
      closeModal();
      // The toggleFavorite function itself already updates allRecipes and calls displayRecipes()
      // So no need to call loadSavedRecipes() again here.
    } else {
      showToast("Failed to remove recipe from saved recipes", "error");
    }
  };

  // Update the remove button's visibility/text based on whether it's saved (always true for saved recipes)
  // This will be handled by the logic inside toggleFavorite and subsequent displayRecipes call

  modal.style.display = "block";
}

// Close recipe details modal
function closeModal() {
  const modal = document.getElementById("recipeModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Open meal plan modal with a pre-selected recipe
function openMealPlanModalWithRecipe(recipe) {
  selectedRecipeForMealPlan = recipe;
  openMealPlanModal();

  // Automatically switch to the search tab and populate the search input
  // or display the recipe in a selected state if possible
  const searchInput = document.getElementById("recipeSearchInput");
  if (searchInput) {
    searchInput.value = recipe.recipe_name;
    // Optionally, trigger a search or display the recipe directly
    // For now, let's just pre-fill the search input.
  }
  switchRecipeTab("search"); // This will make the search tab active
}

// Open meal plan modal
function openMealPlanModal() {
  const modal = document.getElementById("mealPlanModal");
  if (modal) {
    modal.style.display = "block";
  }

  // Clear previous search/saved results in the meal plan modal
  const resultsContainer = document.getElementById("recipeResults");
  if (resultsContainer) {
    resultsContainer.innerHTML = '<div class="loading-message">Search for recipes or select from saved.</div>';
  }
  switchRecipeTab("saved"); // Default to saved recipes tab
}

// Close meal plan modal
function closeMealPlanModalFunc() {
  const modal = document.getElementById("mealPlanModal");
  if (modal) {
    modal.style.display = "none";
  }
  selectedRecipeForMealPlan = null; // Clear selected recipe
}

// Add recipe to meal plan (from modal)
async function addToMealPlan() {
  if (!selectedRecipeForMealPlan || !mealPlanDay.value || !mealPlanType.value) {
    showToast("Please select a recipe, day, and meal type.", "error");
    return;
  }

  const recipe = selectedRecipeForMealPlan;
  const day = mealPlanDay.value;
  const meal = mealPlanType.value;

  try {
    const response = await fetch("/api/meal-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        recipe_id: recipe.recipe_id,
        day_of_week: day,
        meal_type: meal,
      }),
    });

    if (response.ok) {
      showToast(`Added ${recipe.recipe_name} to ${day} ${meal}`, "success");
      // Optionally, reload meal plan for immediate UI update on meal_planner.html
      // However, this is outside the scope of saved_recipes.js. MealPlanner.js handles its own reload.
      closeMealPlanModalFunc();
    } else {
      throw new Error("Failed to add recipe to meal plan");
    }
  } catch (error) {
    console.error("Error adding to meal plan:", error);
    showToast("Failed to add recipe to meal plan", "error");
  }
}

// Remove recipe from saved recipes
async function removeFromSaved() {
  if (!selectedRecipeForMealPlan) {
    showToast("No recipe selected to remove.", "error");
    return;
  }
  const recipeIdToRemove = selectedRecipeForMealPlan.recipe_id;

  try {
    const response = await fetch(`/api/recipes/${recipeIdToRemove}/favorite`, {
      method: "POST", // Using POST to toggle favorite status
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ is_favorite: false }), // Explicitly set to false to unfavorite
    });

    if (!response.ok) {
      throw new Error("Failed to remove from saved recipes");
    }

    const result = await response.json();

    if (!result.isFavorited) {
      showToast("Recipe removed from saved recipes", "success");
      closeModal();
      // Update local data and re-display
      allRecipes = allRecipes.filter(r => r.recipe_id !== recipeIdToRemove);
      filteredRecipes = filteredRecipes.filter(r => r.recipe_id !== recipeIdToRemove);
      displayRecipes();
    } else {
      showToast("Failed to remove recipe from saved recipes.", "error");
    }
  } catch (error) {
    console.error("Error removing from saved recipes:", error);
    showToast("Failed to remove from saved recipes", "error");
  }
}

function showLoadingState() {
  if (loadingSpinner) loadingSpinner.style.display = "flex";
  if (emptyState) emptyState.style.display = "none";
  if (noResultsState) noResultsState.style.display = "none";
  hideResultsContainer();
}

function hideLoadingState() {
  if (loadingSpinner) loadingSpinner.style.display = "none";
}

function showEmptyState() {
  if (emptyState) emptyState.style.display = "flex";
  if (loadingSpinner) loadingSpinner.style.display = "none";
  if (noResultsState) noResultsState.style.display = "none";
  hideResultsContainer();
}

function showNoResultsState() {
  if (noResultsState) noResultsState.style.display = "flex";
  if (loadingSpinner) loadingSpinner.style.display = "none";
  if (emptyState) emptyState.style.display = "none";
  hideResultsContainer();
}

function hideEmptyStates() {
  if (emptyState) emptyState.style.display = "none";
  if (noResultsState) noResultsState.style.display = "none";
}

function hideResultsContainer() {
  const resultsContainer = document.querySelector(".results-container");
  if (resultsContainer) {
    resultsContainer.style.display = "none";
  }
}

function showResultsContainer() {
  const resultsContainer = document.querySelector(".results-container");
  if (resultsContainer) {
    resultsContainer.style.display = "block";
  }
}

async function signOut() {
  try {
    const response = await fetch("/logout", {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      // Delay redirect to allow toast to be seen
      showToast("Logged out successfully!", "success");
      setTimeout(() => {
        window.location.href = "/index.html";
      }, 1500);
    } else {
      throw new Error("Failed to sign out");
    }
  } catch (error) {
    console.error("Error signing out:", error);
    showToast("Failed to sign out", "error");
  }
}

// Debounce function for search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Setup autocomplete (placeholder for spotlight search)
function setupAutocomplete(inputId, suggestionsId, overlayId) {
  const input = document.getElementById(inputId);
  const overlay = document.querySelector(overlayId);

  if (!input || !overlay) return;

  // Open spotlight search
  const openSearchBtn = document.getElementById("openSearchModal");
  if (openSearchBtn) {
    openSearchBtn.addEventListener("click", () => {
      overlay.style.display = "flex";
      input.focus();
    });
  }

  // Close spotlight search
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.style.display = "none";
    }
  });

  // Handle search
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const searchTerm = input.value.trim();
      if (searchTerm) {
        // Redirect to main page with search
        window.location.href = `/index.html?search=${encodeURIComponent(
          searchTerm
        )}`;
      }
    }
  });
}

// Initialize dark mode
const darkModeToggle = document.getElementById("darkModeToggle");
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

// Function to toggle theme
function toggleTheme(isDark) {
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "dark" : "light"
  );
  if (darkModeToggle) {
    const icon = darkModeToggle.querySelector("i");
    if (icon) {
      icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
    }
  }
  localStorage.setItem("theme", isDark ? "dark" : "light");
}

// Check for saved user preference, first in localStorage, then system pref
const savedTheme = localStorage.getItem("theme");
if (savedTheme) {
  toggleTheme(savedTheme === "dark");
} else {
  toggleTheme(prefersDarkScheme.matches);
}

// Listen for toggle button click
if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    toggleTheme(currentTheme !== "dark");
  });
}

// Listen for system theme changes
prefersDarkScheme.addEventListener("change", (e) => {
  if (!localStorage.getItem("theme")) {
    toggleTheme(e.matches);
  }
});

// Load saved view preference
function loadViewPreference() {
  const savedView = localStorage.getItem("savedRecipesView") || "grid";
  setView(savedView);
}

// Setup event listeners
function setupEventListeners() {
  // Dark mode toggle is handled in initDarkMode()

  // Filter event listeners
  if (recipeSearch) {
    recipeSearch.addEventListener("input", debounce(applyFilters, 300));
  }
  if (categoryFilter) {
    categoryFilter.addEventListener("change", applyFilters);
  }
  if (cuisineFilter) {
    cuisineFilter.addEventListener("change", applyFilters);
  }
  if (sortFilter) {
    sortFilter.addEventListener("change", applyFilters);
  }

  // Clear filters
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", clearAllFilters);
  }
  if (clearFiltersBtn2) {
    clearFiltersBtn2.addEventListener("click", clearAllFilters);
  }

  // View toggle
  if (gridViewBtn) {
    gridViewBtn.addEventListener("click", () => setView("grid"));
  }
  if (listViewBtn) {
    listViewBtn.addEventListener("click", () => setView("list"));
  }

  // Modal event listeners
  if (closeRecipeModal) {
    closeRecipeModal.addEventListener("click", closeModal);
  }
  if (closeMealPlanModal) {
    closeMealPlanModal.addEventListener("click", closeMealPlanModalFunc);
  }
  if (addToMealPlanBtn) {
    addToMealPlanBtn.addEventListener("click", openMealPlanModal);
  }
  if (removeFromSavedBtn) {
    removeFromSavedBtn.addEventListener("click", removeFromSaved);
  }
  if (confirmMealPlan) {
    confirmMealPlan.addEventListener("click", addToMealPlan);
  }
  if (cancelMealPlan) {
    cancelMealPlan.addEventListener("click", closeMealPlanModalFunc);
  }

  // Close modals when clicking outside
  if (recipeModal) {
    recipeModal.addEventListener("click", (e) => {
      if (e.target === recipeModal) closeModal();
    });
  }
  if (mealPlanModal) {
    mealPlanModal.addEventListener("click", (e) => {
      if (e.target === mealPlanModal) closeMealPlanModalFunc();
    });
  }

  // Signout functionality
  const signoutBtn = document.querySelector(".signout-btn");
  if (signoutBtn) {
    signoutBtn.addEventListener("click", signOut);
  }
}

// Attach event listeners for initial load and back/forward navigation
document.addEventListener("DOMContentLoaded", () => {
  loadSavedRecipes();
  loadViewPreference();
  setupEventListeners();
});

window.addEventListener("pageshow", function (event) {
  // Always reload on pageshow to ensure fresh data, especially after back/forward navigation
  loadSavedRecipes();
});
