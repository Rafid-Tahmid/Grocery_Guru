// Meal Planner JavaScript Functionality

document.addEventListener("DOMContentLoaded", function () {
  // Initialize variables
  let currentMealSlot = null;
  let mealPlan = {}; // Will be populated asynchronously from API

  // Initialize the application
  initializeMealPlanner();

  // Initialize meal planner
  async function initializeMealPlanner() {
    // Initialize dark mode first
    initDarkMode();

    // Load user profile
    checkLoginStatus();

    // Load meal plan from backend
    mealPlan = await loadMealPlan();
    populateMealSlots();

    setupEventListeners();

    // Set up autocomplete for spotlight search
    setupAutocomplete(
      "spotlightInput",
      "spotlightSuggestions",
      "#spotlightOverlay"
    );
  }

  // Dark mode functionality
  function initDarkMode() {
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

    function toggleTheme(isDark) {
      // Apply theme to multiple elements to ensure it works
      document.documentElement.setAttribute(
        "data-theme",
        isDark ? "dark" : "light"
      );
      document.body.setAttribute("data-theme", isDark ? "dark" : "light");

      // Update toggle button icon
      const darkModeToggle = document.getElementById("darkModeToggle");
      if (darkModeToggle) {
        const icon = darkModeToggle.querySelector("i");
        if (icon) {
          icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
        }
      }

      localStorage.setItem("theme", isDark ? "dark" : "light");
    }

    // Apply saved theme immediately
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      toggleTheme(savedTheme === "dark");
    } else {
      toggleTheme(prefersDarkScheme.matches);
    }

    // Set up toggle button listener using event delegation
    document.addEventListener("click", function (e) {
      if (e.target.closest("#darkModeToggle")) {
        e.preventDefault();
        const currentTheme =
          document.documentElement.getAttribute("data-theme");
        const isDark = currentTheme === "dark";
        toggleTheme(!isDark);
      }
    });

    // Listen for system theme changes
    prefersDarkScheme.addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
        toggleTheme(e.matches);
      }
    });
  }

  // Check login status
  function checkLoginStatus() {
    fetch("/profile", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Not logged in");
        return res.json();
      })
      .then((data) => {
        if (data.first_name) {
          setLoggedIn(data.first_name);
        } else {
          setLoggedOut();
        }
      })
      .catch(() => {
        setLoggedOut();
      });
  }

  function setLoggedIn(name) {
    const profileNameEl = document.querySelector(".profileCard-name");
    const loginBtn = document.querySelector(".profileCard-bubble.login-btn");
    const signoutBtn = document.querySelector(
      ".profileCard-bubble.signout-btn"
    );

    if (profileNameEl) profileNameEl.textContent = `Welcome, ${name}`;
    if (loginBtn) loginBtn.style.display = "none";
    if (signoutBtn) signoutBtn.style.display = "block";
  }

  function setLoggedOut() {
    const profileNameEl = document.querySelector(".profileCard-name");
    const loginBtn = document.querySelector(".profileCard-bubble.login-btn");
    const signoutBtn = document.querySelector(
      ".profileCard-bubble.signout-btn"
    );

    if (profileNameEl) profileNameEl.textContent = "Welcome, User";
    if (loginBtn) loginBtn.style.display = "block";
    if (signoutBtn) signoutBtn.style.display = "none";
  }

  // Sign out handler
  const signoutBtn = document.querySelector(".profileCard-bubble.signout-btn");
  if (signoutBtn) {
    signoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        const response = await fetch("/logout", {
          method: "POST",
          credentials: "include",
        });
        if (response.ok) {
          setLoggedOut();
          window.location.href = "/";
        }
      } catch (error) {
        console.error("Error logging out:", error);
      }
    });
  }

  // Setup event listeners
  function setupEventListeners() {
    // Action buttons
    const clearWeekBtn = document.getElementById("clearWeek");
    const generateListBtn = document.getElementById("generateList");

    if (clearWeekBtn) {
      clearWeekBtn.addEventListener("click", clearWeek);
    }

    if (generateListBtn) {
      generateListBtn.addEventListener("click", generateShoppingList);
    }

    // Add meal buttons and Recipe removal
    document.addEventListener("click", function (e) {
      if (e.target.closest(".add-meal-btn")) {
        const mealContent = e.target.closest(".meal-content");
        if (mealContent) {
          const day = mealContent.dataset.day;
          const meal = mealContent.dataset.meal;
          openRecipeModal(day, meal);
        }
      }

      // Recipe removal (on meal planner grid)
      if (e.target.closest(".recipe-remove")) {
        e.stopPropagation();
        const recipeCard = e.target.closest(".recipe-card");
        if (recipeCard) {
          const mealContent = recipeCard.closest(".meal-content");
          if (mealContent) {
            const day = mealContent.dataset.day;
            const meal = mealContent.dataset.meal;
            removeRecipe(day, meal);
          }
        }
      }

      // Handle clicks on recipe result cards in the modal (event delegation)
      const recipeResultCard = e.target.closest(".recipe-result-card");
      if (recipeResultCard) {
        const recipeId = recipeResultCard.dataset.recipeId;
        const currentModalRecipes = window.currentModalRecipes || [];
        const recipe = currentModalRecipes.find(r =>
          String(r.recipe_id || r.idMeal) === String(recipeId)
        );

        if (recipe) {
          if (recipe.recipe_id) {
            addSavedRecipeToMealPlan(recipe);
          } else if (recipe.idMeal) {
            addRecipeToMealPlan(recipe);
          }
        } else {
          showToast("Could not add recipe. Please try again.", "error");
        }
      }
    });

    // Recipe modal
    const recipeModal = document.getElementById("recipeModal");
    const recipeModalClose = recipeModal
      ? recipeModal.querySelector(".recipe-modal-close")
      : null;

    if (recipeModalClose) {
      recipeModalClose.addEventListener("click", () => {
        recipeModal.style.display = "none";
      });
    }

    // Recipe search
    const searchBtn = document.getElementById("searchRecipesBtn");
    const searchInput = document.getElementById("recipeSearchInput");

    if (searchBtn) {
      searchBtn.addEventListener("click", searchRecipes);
    }

    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          searchRecipes();
        }
      });
    }

    // Recipe tabs
    document.querySelectorAll(".recipe-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const tabType = e.target.dataset.tab;
        switchRecipeTab(tabType);
      });
    });

    // Shopping list modal
    const shoppingModal = document.getElementById("shoppingListModal");
    const shoppingModalClose = shoppingModal
      ? shoppingModal.querySelector(".shopping-list-modal-close")
      : null;

    if (shoppingModalClose) {
      shoppingModalClose.addEventListener("click", () => {
        shoppingModal.style.display = "none";
      });
    }

    // Shopping list actions
    const printListBtn = document.getElementById("printShoppingListBtn");

    if (printListBtn) {
      printListBtn.addEventListener("click", printShoppingList);
    }

    // Modal close on background click
    window.addEventListener("click", (e) => {
      if (recipeModal && e.target === recipeModal) {
        recipeModal.style.display = "none";
      }
      if (shoppingModal && e.target === shoppingModal) {
        shoppingModal.style.display = "none";
      }
    });
  }

  // Load meal plan from backend
  async function loadMealPlan() {
    try {
      const response = await fetch("/api/meal-plan", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Transform the flat array of meal plan entries into the nested object structure
      const newMealPlan = {};
      data.forEach(item => {
        if (!newMealPlan[item.day_of_week]) {
          newMealPlan[item.day_of_week] = {};
        }
        newMealPlan[item.day_of_week][item.meal_type] = {
          id: item.recipe_id,
          name: item.recipe_name,
          image: item.recipe_photo || "/placeholder-recipe.jpg",
          category: item.recipe_category,
          area: item.recipe_region,
          instructions: "", // Instructions are not currently fetched via this API, so leave empty
          ingredients: [], // Ingredients are not currently fetched via this API, so leave empty
        };
      });
      return newMealPlan;
    } catch (error) {
      console.error("Error loading meal plan:", error);
      showToast("Failed to load meal plan", "error");
      return {};
    }
  }

  // Populate meal slots with saved recipes
  function populateMealSlots() {
    const weekPlan = mealPlan || {};

    document.querySelectorAll(".meal-content").forEach((content) => {
      const day = content.dataset.day;
      const meal = content.dataset.meal;
      const recipe = weekPlan[day]?.[meal];

      if (recipe) {
        displayRecipe(content, recipe);
      } else {
        resetMealSlot(content);
      }
    });
  }

  // Display recipe in meal slot
  function displayRecipe(mealContent, recipe) {
    const mealSlot = mealContent.closest(".meal-slot");
    if (mealSlot) {
      mealSlot.classList.add("has-recipe");
    }

    mealContent.innerHTML = `
            <div class="recipe-card" style="cursor: pointer;">
                <div class="recipe-card-image-wrapper">
                    <img src="${recipe.image}" alt="${recipe.name}" onerror="this.src='/placeholder-recipe.jpg'">
                </div>
                <h4>${recipe.name}</h4>
                <div class="recipe-card-tags">
                    ${recipe.category ? `<span class="recipe-card-tag category">${recipe.category}</span>` : ""}
                    ${recipe.area ? `<span class="recipe-card-tag cuisine" data-cuisine="${recipe.area.toLowerCase()}">${recipe.area}</span>` : ""}
                </div>
                <button class="recipe-remove" type="button">×</button>
            </div>
        `;

    // Add click handler for the recipe card
    const recipeCard = mealContent.querySelector('.recipe-card');
    if (recipeCard) {
      recipeCard.addEventListener('click', () => {
        window.location.href = `recipe.html?id=${recipe.id}`;
      });
    }

    // Add click handler for remove button
    const removeBtn = mealContent.querySelector('.recipe-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const day = mealContent.dataset.day;
        const meal = mealContent.dataset.meal;
        if (day && meal) {
          removeRecipe(day, meal);
        }
      });
    }
  }

  // Reset meal slot to empty state
  function resetMealSlot(mealContent) {
    const mealSlot = mealContent.closest(".meal-slot");
    if (mealSlot) {
      mealSlot.classList.remove("has-recipe");
    }

    mealContent.innerHTML = `
            <div class="add-meal-btn">
                <i class="fas fa-plus"></i>
                <span>Add Recipe</span>
            </div>
        `;
  }

  // Open recipe selection modal
  function openRecipeModal(day, meal) {
    currentMealSlot = { day, meal };
    const modal = document.getElementById("recipeModal");
    const modalTitle = modal ? modal.querySelector(".recipe-modal-header h3") : null;

    if (modalTitle) {
      modalTitle.textContent = `Add ${meal} for ${day}`;
    }

    if (modal) {
      modal.style.display = "block";
    }

    // Clear previous results
    const resultsContainer = document.getElementById("recipeResults");
    if (resultsContainer) {
      resultsContainer.innerHTML = `
                <div class="loading-message">Search for recipes to add to your meal plan</div>
            `;
    }

    // Load saved recipes tab by default
    switchRecipeTab("saved");
  }

  // Switch recipe modal tabs
  function switchRecipeTab(tabType) {
    // Update tab buttons
    document.querySelectorAll(".recipe-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabType);
    });

    const searchInput = document.getElementById("recipeSearchInput");
    const searchBtn = document.getElementById("searchRecipesBtn");

    if (tabType === "saved") {
      if (searchInput) searchInput.style.display = "none";
      if (searchBtn) searchBtn.style.display = "none";
      loadSavedRecipes();
    } else {
      if (searchInput) searchInput.style.display = "block";
      if (searchBtn) searchBtn.style.display = "block";
      // Clear search results
      const resultsContainer = document.getElementById("recipeResults");
      if (resultsContainer) {
        resultsContainer.innerHTML = `
                    <div class="loading-message">Search for recipes to add to your meal plan</div>
                `;
      }
    }
  }

  // Load saved recipes for the modal
  async function loadSavedRecipes() {
    const resultsContainer = document.getElementById("recipeResults");
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '<div class="loading-message">Loading saved recipes...</div>';

    try {
      const response = await fetch("/api/saved-recipes", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const recipes = await response.json();

      window.currentModalRecipes = recipes.filter(recipe =>
        recipe.recipe_id &&
        !isNaN(parseInt(recipe.recipe_id)) &&
        recipe.recipe_name &&
        recipe.recipe_name.trim() !== ''
      ); // Store for event delegation, after filtering

      displaySavedRecipes(window.currentModalRecipes);
    } catch (error) {
      console.error("Error loading saved recipes for modal:", error);
      showToast("Failed to load saved recipes.", "error");
      resultsContainer.innerHTML = '<div class="loading-message">Error loading saved recipes.</div>';
    }
  }

  // Display saved recipes
  function displaySavedRecipes(recipes) {
    const resultsContainer = document.getElementById("recipeResults");
    if (!resultsContainer) return;

    // Store recipes for event delegation - this was missing!
    window.currentModalRecipes = recipes;

    if (recipes.length === 0) {
      resultsContainer.innerHTML = `
                <div class="loading-message">No saved recipes found.</div>
            `;
      return;
    }

    resultsContainer.innerHTML = recipes
      .map(
        (recipe) => {
          const displayName = recipe.recipe_name && recipe.recipe_name.trim() !== '' ? recipe.recipe_name : 'Unknown Recipe';
          return `
            <div class="recipe-result-card" data-recipe-id="${recipe.recipe_id
            }">
                <img src="${recipe.recipe_photo || "/placeholder-recipe.jpg"}" alt="${displayName}">
                <div class="recipe-result-card-content">
                    <h4>${displayName}</h4>
                    <p>${recipe.recipe_category || ""}${recipe.recipe_region ? ` • ${recipe.recipe_region}` : ""
            }</p>
                </div>
            </div>
        `;
        }
      )
      .join("");
  }

  // Add saved recipe to meal plan
  async function addSavedRecipeToMealPlan(recipe) {
    if (!currentMealSlot) return;

    const { day, meal } = currentMealSlot;

    try {
      const response = await fetch("/api/meal-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipe_id: recipe.recipe_id,
          day_of_week: day,
          meal_type: meal,
        }),
      });

      if (response.ok) {
        showToast(`Added ${recipe.recipe_name} to ${day} ${meal}`, "success");
        mealPlan = await loadMealPlan(); // Reload meal plan from backend
        populateMealSlots();
        // Close modal
        const modal = document.getElementById("recipeModal");
        if (modal) {
          modal.style.display = "none";
        }
        currentMealSlot = null;
      } else {
        const errorData = await response.text();
        throw new Error("Failed to add recipe to meal plan");
      }
    } catch (error) {
      console.error("Error adding saved recipe to meal plan:", error);
      showToast("Failed to add recipe to meal plan", "error");
    }
  }

  // Search for recipes
  function searchRecipes() {
    const searchInput = document.getElementById("recipeSearchInput");
    if (!searchInput) return;

    const query = searchInput.value.trim();

    if (!query) return;

    const resultsContainer = document.getElementById("recipeResults");
    if (resultsContainer) {
      resultsContainer.innerHTML =
        '<div class="loading-message">Searching recipes...</div>';
    }

    // Search using TheMealDB API
    fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(
        query
      )}`
    )
      .then((response) => response.json())
      .then((data) => {
        displaySearchResults(data.meals || []);
      })
      .catch((error) => {
        console.error("Error searching recipes:", error);
        if (resultsContainer) {
          resultsContainer.innerHTML = `
                        <div class="loading-message">Error searching recipes. Please try again.</div>
                    `;
        }
        showToast("Error searching recipes. Please try again.", "error");
      });
  }

  // Display search results
  function displaySearchResults(recipes) {
    const resultsContainer = document.getElementById("recipeResults");
    if (!resultsContainer) return;

    window.currentModalRecipes = recipes; // Store for event delegation

    if (recipes.length === 0) {
      resultsContainer.innerHTML = `
                <div class="loading-message">No recipes found. Try a different search term.</div>
            `;
      return;
    }

    resultsContainer.innerHTML = recipes
      .map(
        (recipe) => `
            <div class="recipe-result-card" data-recipe-id="${recipe.idMeal}">
                <img src="${recipe.strMealThumb}" alt="${recipe.strMeal}">
                <div class="recipe-result-card-content">
                    <h4>${recipe.strMeal}</h4>
                    <p>${recipe.strCategory}${recipe.strArea ? ` • ${recipe.strArea}` : ""
          }</p>
                </div>
            </div>
        `
      )
      .join("");
  }

  // Add recipe to meal plan (for search results)
  async function addRecipeToMealPlan(recipe) {
    if (!currentMealSlot) return;

    const { day, meal } = currentMealSlot;

    try {
      // First, save the recipe to saved_recipes if it's not already there
      const saveRecipeResponse = await fetch(`/api/recipes/${recipe.idMeal}/favorite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipe_id: recipe.idMeal,
          recipe_name: recipe.strMeal,
          recipe_category: recipe.strCategory,
          recipe_region: recipe.strArea,
          recipe_photo: recipe.strMealThumb,
          is_favorite: true,
        }),
      });

      if (!saveRecipeResponse.ok) {
        throw new Error("Failed to save recipe to favorites");
      }

      // Now, add the recipe to the meal plan
      const response = await fetch("/api/meal-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recipe_id: recipe.idMeal, // Use idMeal for new recipes
          day_of_week: day,
          meal_type: meal,
        }),
      });

      if (response.ok) {
        showToast(`Added ${recipe.strMeal} to ${day} ${meal}`, "success");
        mealPlan = await loadMealPlan(); // Reload meal plan from backend
        populateMealSlots();
        // Close modal
        const modal = document.getElementById("recipeModal");
        if (modal) {
          modal.style.display = "none";
        }
        currentMealSlot = null;
      } else {
        throw new Error("Failed to add recipe to meal plan");
      }
    } catch (error) {
      console.error("Error adding searched recipe to meal plan:", error);
      showToast("Failed to add recipe to meal plan", "error");
    }
  }

  // Remove recipe from meal plan
  async function removeRecipe(day, meal) {
    if (!mealPlan[day] || !mealPlan[day][meal]) return;

    if (confirm(`Are you sure you want to remove ${mealPlan[day][meal].name} from ${day} ${meal}?`)) {
      try {
        const response = await fetch("/api/meal-plan", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            day_of_week: day,
            meal_type: meal,
          }),
        });

        if (response.ok) {
          showToast(`Removed from ${day} ${meal}`, "info");
          mealPlan = await loadMealPlan(); // Reload meal plan from backend
          populateMealSlots();
        } else {
          throw new Error("Failed to remove recipe from meal plan");
        }
      } catch (error) {
        console.error("Error removing recipe from meal plan:", error);
        showToast("Failed to remove recipe from meal plan", "error");
      }
    }
  }

  // Clear entire week
  async function clearWeek() {
    if (confirm("Are you sure you want to clear all meals for this week?")) {
      try {
        const response = await fetch("/api/meal-plan/clear-week", {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          showToast("Meal plan cleared", "success");
          mealPlan = await loadMealPlan(); // Reload meal plan from backend
          populateMealSlots();
        } else {
          throw new Error("Failed to clear meal plan");
        }
      } catch (error) {
        console.error("Error clearing meal plan:", error);
        showToast("Failed to clear meal plan", "error");
      }
    }
  }

  // Generate shopping list
  async function generateShoppingList() {
    try {
      // Fetch ingredients from the API
      const response = await fetch('/api/meal-plan/ingredients', {
        credentials: 'include'
      });

      if (response.ok) {
        const ingredients = await response.json();

        // Collect all ingredients with proper unit aggregation
        const ingredientMap = new Map();

        ingredients.forEach(ingredient => {
          const name = ingredient.ingredient_name.toLowerCase().trim();
          const measure = ingredient.measure ? ingredient.measure.trim() : "";

          if (ingredientMap.has(name)) {
            const existing = ingredientMap.get(name);
            // Try to aggregate quantities
            const quantity = extractQuantity(measure);
            const unit = extractUnit(measure);

            if (quantity && existing.unit === unit) {
              existing.totalQuantity += quantity;
              existing.displayMeasure = `${existing.totalQuantity} ${existing.unit}`;
            } else {
              // Can't aggregate, just add to measures list
              existing.measures.add(measure);
              existing.count++;
            }
          } else {
            const quantity = extractQuantity(measure);
            const unit = extractUnit(measure);

            ingredientMap.set(name, {
              name: ingredient.ingredient_name,
              count: 1,
              measures: new Set(measure ? [measure] : []),
              totalQuantity: quantity || 0,
              unit: unit || "",
              displayMeasure: measure || "",
            });
          }
        });

        displayShoppingList(ingredientMap);
        const modal = document.getElementById("shoppingListModal");
        if (modal) {
          modal.style.display = "block";
        }
      } else {
        alert('Failed to generate shopping list. Please try again.');
      }
    } catch (error) {
      console.error('Error generating shopping list:', error);
      alert('Error generating shopping list. Please try again.');
    }
  }

  // Extract quantity from measure string
  function extractQuantity(measure) {
    if (!measure) return 0;
    const match = measure.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  // Extract unit from measure string
  function extractUnit(measure) {
    if (!measure) return "";
    const match = measure.match(/^(?:\d+(?:\.\d+)?\s*)(.+)/);
    return match ? match[1].trim() : "";
  }

  // Display shopping list
  function displayShoppingList(ingredientMap) {
    const container = document.getElementById("shoppingListItems");
    if (!container) return;

    if (ingredientMap.size === 0) {
      container.innerHTML = `
                <div class="loading-message">
                    No ingredients found. Add some recipes to your meal plan first!
                </div>
            `;
      return;
    }

    // Group ingredients by category (simplified)
    const categories = {
      Produce: [],
      "Meat & Seafood": [],
      Dairy: [],
      Pantry: [],
      Other: [],
    };

    ingredientMap.forEach((ingredient) => {
      // Simple categorization based on keywords
      const lowerName = ingredient.name.toLowerCase();
      if (lowerName.includes("chicken") || lowerName.includes("beef") || lowerName.includes("fish") || lowerName.includes("pork") || lowerName.includes("lamb") || lowerName.includes("seafood")) {
        categories["Meat & Seafood"].push(ingredient);
      } else if (lowerName.includes("milk") || lowerName.includes("cheese") || lowerName.includes("yogurt") || lowerName.includes("butter") || lowerName.includes("cream") || lowerName.includes("eggs")) {
        categories.Dairy.push(ingredient);
      } else if (lowerName.includes("onion") || lowerName.includes("garlic") || lowerName.includes("potato") || lowerName.includes("tomato") || lowerName.includes("carrot") || lowerName.includes("lettuce") || lowerName.includes("fruit") || lowerName.includes("vegetable")) {
        categories.Produce.push(ingredient);
      } else if (lowerName.includes("flour") || lowerName.includes("sugar") || lowerName.includes("salt") || lowerName.includes("pepper") || lowerName.includes("oil") || lowerName.includes("rice") || lowerName.includes("pasta") || lowerName.includes("bread")) {
        categories.Pantry.push(ingredient);
      } else {
        categories.Other.push(ingredient);
      }
    });

    let html = '';
    for (const category in categories) {
      if (categories[category].length > 0) {
        html += `
          <div class="shopping-list-category">
              <h4>${category}</h4>
              <ul>
        `;
        categories[category].forEach((ingredient) => {
          const measuresDisplay = Array.from(ingredient.measures).join(", ");
          const display = ingredient.displayMeasure || measuresDisplay || "to taste";
          html += `
            <li>
              <span>${ingredient.name}</span>
              <span class="item-quantity">${display}</span>
            </li>
          `;
        });
        html += `
              </ul>
          </div>
        `;
      }
    }
    container.innerHTML = html;
  }

  // Print shopping list
  function printShoppingList() {
    const shoppingListModal = document.getElementById("shoppingListModal");
    if (!shoppingListModal) return;

    const printContent = shoppingListModal.cloneNode(true);

    // Remove close button and actions from print content
    const closeBtn = printContent.querySelector(".modal-close-btn");
    if (closeBtn) closeBtn.remove();

    const actions = printContent.querySelector(".modal-footer");
    if (actions) actions.remove();

    // Create a new window for printing
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Shopping List</title>');
    // Include necessary CSS for printing
    printWindow.document.write('<link rel="stylesheet" href="index.css">');
    printWindow.document.write('<link rel="stylesheet" href="meal_planner.css">');
    printWindow.document.write('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">');
    printWindow.document.write('<style>');
    printWindow.document.write(`
            body { font-family: 'Inter', sans-serif; margin: 20px; color: #333; }
            .shopping-list-modal-content { padding: 20px; border: none; box-shadow: none; width: 100%; max-width: 800px; margin: 0 auto; }
            .shopping-list-header h3 { text-align: center; color: #129060; margin-bottom: 20px; font-size: 1.8rem; }
            .shopping-list-category { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px; border: 1px solid #e9ecef; }
            .shopping-list-category h4 { color: #129060; margin-top: 0; margin-bottom: 15px; border-bottom: 2px solid #1dd3b0; padding-bottom: 5px; }
            .shopping-list-category ul { list-style: none; padding: 0; margin: 0; }
            .shopping-list-category li { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e0e0e0; }
            .shopping-list-category li:last-child { border-bottom: none; }
            .item-quantity { background: #1dd3b0; color: white; padding: 4px 10px; border-radius: 15px; font-size: 0.9rem; font-weight: 600; }
            .loading-message { text-align: center; color: #6c757d; padding: 20px; }
        `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  }

  // Setup autocomplete (reused from home.js)
  function setupAutocomplete(inputId, suggestionsId, overlayId) {
    const input = document.getElementById(inputId);
    const suggestionsList = document.getElementById(suggestionsId);
    const overlay = document.querySelector(overlayId);

    if (!input || !suggestionsList || !overlay) return;

    // Function to debounce input for performance
    function debounce(func, delay) {
      let timeout;
      return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
      };
    }

    // Handle input event with debounce
    input.addEventListener("input", debounce(async () => {
      const query = input.value.trim();
      suggestionsList.innerHTML = ""; // Clear previous suggestions

      if (query.length < 2) {
        suggestionsList.style.display = "none";
        return;
      }

      try {
        const response = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.meals) {
          const suggestions = data.meals.map(meal => ({
            name: meal.strMeal,
            id: meal.idMeal,
            category: meal.strCategory,
            area: meal.strArea,
            image: meal.strMealThumb
          }));

          suggestions.slice(0, 5).forEach(meal => { // Limit to 5 suggestions
            const li = document.createElement("li");
            li.textContent = meal.name;
            li.addEventListener("click", () => {
              input.value = meal.name;
              suggestionsList.style.display = "none";
              // Optional: trigger search or set selected meal
            });
            suggestionsList.appendChild(li);
          });
          suggestionsList.style.display = "block";
        } else {
          suggestionsList.style.display = "none";
        }
      } catch (error) {
        console.error("Error fetching autocomplete suggestions:", error);
        suggestionsList.style.display = "none";
      }
    }, 300)); // Debounce for 300ms

    // Close suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!overlay.contains(e.target) && e.target !== input) {
        suggestionsList.style.display = "none";
      }
    });
  }

  // Show toast notification (Copied from saved_recipes.js to ensure availability)
  function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastIcon = document.getElementById("toastIcon");
    const toastMessage = document.getElementById("toastMessage");

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
}); // End DOMContentLoaded
