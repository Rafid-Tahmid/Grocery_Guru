document.addEventListener('DOMContentLoaded', function () {
    const recipesPerPage = 24;
    let currentPage = 1;
    let allRecipes = new Map(); // Hashmap to store recipe names and IDs
    let filteredRecipes = [];
    const API_BASE_URL = 'https://www.themealdb.com/api/json/v1/1';

    // URL parameter management
    function getURLParameters() {
        const params = new URLSearchParams(window.location.search);
        return {
            cuisines: params.get('cuisines') ? params.get('cuisines').split(',') : [],
            categories: params.get('categories') ? params.get('categories').split(',') : [],
            sort: params.get('sort') || 'a-z',
            page: parseInt(params.get('page'), 10) || 1
        };
    }

    function updateURL() {
        const selectedCuisines = Array.from(document.querySelectorAll('#cuisineSelect .checkbox-list input:checked')).map((cb) => cb.value);
        const selectedCategories = Array.from(document.querySelectorAll('#categorySelect .checkbox-list input:checked')).map((cb) => cb.value);
        const sortOrder = document.getElementById('sortSelect').value;

        // Get total available options
        const totalCuisines = document.querySelectorAll('#cuisineSelect .checkbox-list input').length;
        const totalCategories = document.querySelectorAll('#categorySelect .checkbox-list input').length;

        const params = new URLSearchParams();

        // Only add cuisines to URL if not all are selected and some are selected
        if (selectedCuisines.length > 0 && selectedCuisines.length < totalCuisines) {
            params.set('cuisines', selectedCuisines.join(','));
        }

        // Only add categories to URL if not all are selected and some are selected
        if (selectedCategories.length > 0 && selectedCategories.length < totalCategories) {
            params.set('categories', selectedCategories.join(','));
        }

        if (sortOrder !== 'a-z') {
            params.set('sort', sortOrder);
        }

        if (currentPage > 1) {
            params.set('page', currentPage.toString());
        }

        const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newURL);
    }

    function initializeFromURL() {
        const urlParams = getURLParameters();

        // Set current page
        currentPage = urlParams.page;

        // Set sort order
        document.getElementById('sortSelect').value = urlParams.sort;

        // Get available cuisines and categories from the fetched data
        const availableCuisines = new Set();
        const availableCategories = new Set();

        Array.from(allRecipes.values()).forEach((recipe) => {
            if (recipe.region && recipe.region !== 'Unknown') {
                availableCuisines.add(recipe.region);
            }
            if (recipe.category && recipe.category !== 'Uncategorized') {
                availableCategories.add(recipe.category);
            }
        });

        // Filter URL parameters to only include valid options
        const validCuisines = urlParams.cuisines.filter((cuisine) => availableCuisines.has(cuisine));
        const validCategories = urlParams.categories.filter((category) => availableCategories.has(category));

        // Set cuisine filters
        const cuisineCheckboxes = document.querySelectorAll('#cuisineSelect .checkbox-list input');
        if (urlParams.cuisines.length === 0) {
            // No cuisines in URL means all should be selected
            cuisineCheckboxes.forEach((checkbox) => {
                checkbox.checked = true;
            });
        } else {
            // Only select cuisines that are in the URL and valid
            cuisineCheckboxes.forEach((checkbox) => {
                checkbox.checked = validCuisines.includes(checkbox.value);
            });
        }

        // Set category filters
        const categoryCheckboxes = document.querySelectorAll('#categorySelect .checkbox-list input');
        if (urlParams.categories.length === 0) {
            // No categories in URL means all should be selected
            categoryCheckboxes.forEach((checkbox) => {
                checkbox.checked = true;
            });
        } else {
            // Only select categories that are in the URL and valid
            categoryCheckboxes.forEach((checkbox) => {
                checkbox.checked = validCategories.includes(checkbox.value);
            });
        }

        // Update "All" checkboxes state
        updateAllCheckboxState('cuisine');
        updateAllCheckboxState('category');

        // Update button text
        updateButtonText({ id: 'cuisine-all' });
        updateButtonText({ id: 'category-all' });
    }

    function fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            document.execCommand('copy');
            showCopyMessage('Filters URL copied to clipboard!');
        } catch (err) {
            showCopyMessage('Unable to copy URL. Please copy manually from the address bar.');
        }

        document.body.removeChild(textArea);
    }

    function showCopyMessage(message) {
        const shareBtn = document.getElementById('shareFiltersBtn');
        const originalText = shareBtn.innerHTML;

        shareBtn.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
        shareBtn.style.background = '#4CAF50';
        shareBtn.style.borderColor = '#4CAF50';
        shareBtn.style.color = 'white';

        setTimeout(() => {
            shareBtn.innerHTML = originalText;
            shareBtn.style.background = '';
            shareBtn.style.borderColor = '';
            shareBtn.style.color = '';
        }, 2000);
    }

    // Function to toggle favorite state
    async function toggleFavorite(recipeId, recipeData) {
        try {
            const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(recipeData)
            });

            if (!response.ok) {
                throw new Error("Failed to toggle favorite");
            }

            return await response.json();
        } catch (error) {
            return null;
        }
    }

    // Function to check if a recipe is favorited
    async function checkIfFavorited(recipeId) {
        try {
            const response = await fetch(`/api/recipes/${recipeId}/favorite`, {
                credentials: "include"
            });
            if (!response.ok) {
                throw new Error("Failed to check favorite status");
            }
            const data = await response.json();
            return data.isFavorited;
        } catch (error) {
            return false;
        }
    }

    function createEllipsis() {
        const span = document.createElement('span');
        span.className = 'pagination-ellipsis';
        span.textContent = '...';
        return span;
    }

    function updateUI() {
        // Get selected cuisines and categories
        const selectedCuisines = Array.from(document.querySelectorAll('#cuisineSelect .checkbox-list input:checked')).map((cb) => cb.value);
        const selectedCategories = Array.from(document.querySelectorAll('#categorySelect .checkbox-list input:checked')).map((cb) => cb.value);

        // If no cuisines or categories are selected, show no results
        if (selectedCuisines.length === 0 || selectedCategories.length === 0) {
            filteredRecipes = [];
        } else {
            // Filter recipes
            filteredRecipes = Array.from(allRecipes.values()).filter((recipe) => {
                const cuisineMatch = selectedCuisines.includes(recipe.region);
                const categoryMatch = selectedCategories.includes(recipe.category);
                return cuisineMatch && categoryMatch;
            });

            // Sort filtered recipes
            const sortOrder = document.getElementById('sortSelect').value;
            if (sortOrder === 'a-z') {
                filteredRecipes.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sortOrder === 'z-a') {
                filteredRecipes.sort((a, b) => b.name.localeCompare(a.name));
            }
        }

        // Update results count
        const startIndex = (currentPage - 1) * recipesPerPage;
        const endIndex = Math.min(startIndex + recipesPerPage, filteredRecipes.length);
        const resultsCount = document.getElementById('resultsCount');

        if (filteredRecipes.length === 0) {
            resultsCount.textContent = selectedCuisines.length === 0 || selectedCategories.length === 0
                ? 'Please select at least one cuisine and one category'
                : 'No recipes found matching your filters';
        } else {
            resultsCount.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredRecipes.length} recipes`;
        }

        // Update recipe grid
        const recipeGrid = document.querySelector('.recipe-grid');
        recipeGrid.innerHTML = '';

        const recipesToShow = filteredRecipes.slice(startIndex, endIndex);

        if (recipesToShow.length === 0) {
            const message = selectedCuisines.length === 0 || selectedCategories.length === 0
                ? 'Please select at least one cuisine and one category to see recipes.'
                : 'No recipes found for the selected filters.';
            recipeGrid.innerHTML = `<div class="no-recipes-message">${message}</div>`;
        } else {
            recipesToShow.forEach((recipe) => {
                const card = createRecipeCard(recipe);
                recipeGrid.appendChild(card);
            });
        }

        // Update pagination
        const pageNumbers = document.querySelector('.page-numbers');
        pageNumbers.innerHTML = '';

        const totalPages = Math.ceil(filteredRecipes.length / recipesPerPage);
        const maxVisiblePages = 5;

        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            pageNumbers.appendChild(createPageButton(1));
            if (startPage > 2) {
                pageNumbers.appendChild(createEllipsis());
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.appendChild(createPageButton(i));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pageNumbers.appendChild(createEllipsis());
            }
            pageNumbers.appendChild(createPageButton(totalPages));
        }

        // Update navigation button states
        document.querySelector('.prev-btn').disabled = currentPage === 1;
        document.querySelector('.next-btn').disabled = endIndex >= filteredRecipes.length;
    }

    function createPageButton(pageNum) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = pageNum;
        button.classList.add('page-number');
        if (pageNum === currentPage) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => {
            currentPage = pageNum;
            updateUI();
            updateURL();
        });
        return button;
    }

    function updateButtonText(checkbox) {
        const type = checkbox.id.startsWith('cuisine') ? 'cuisine' : 'category';
        const button = document.getElementById(`${type}Button`);
        const checkboxes = document.querySelectorAll(`#${type}Select .checkbox-list input`);
        const checkedCount = Array.from(checkboxes).filter((cb) => cb.checked).length;
        const totalCount = checkboxes.length;

        if (checkedCount === totalCount) {
            button.innerHTML = `All ${type === 'cuisine' ? 'Cuisines' : 'Categories'} <i class="fas fa-chevron-down"></i>`;
        } else if (checkedCount === 0) {
            button.innerHTML = `No ${type === 'cuisine' ? 'Cuisines' : 'Categories'} <i class="fas fa-chevron-down"></i>`;
        } else {
            button.innerHTML = `${checkedCount} ${type === 'cuisine' ? 'Cuisines' : 'Categories'} selected <i class="fas fa-chevron-down"></i>`;
        }
    }

    function updateAllCheckboxState(type) {
        const allCheckbox = document.getElementById(`${type}-all`);
        const checkboxes = document.querySelectorAll(`#${type}Select .checkbox-list input`);
        const checkedCount = Array.from(checkboxes).filter((cb) => cb.checked).length;
        allCheckbox.checked = checkedCount === checkboxes.length;
    }

    function setupAllCheckbox(type) {
        const allCheckbox = document.getElementById(`${type}-all`);
        allCheckbox.addEventListener('change', () => {
            const isChecked = allCheckbox.checked;
            const checkboxes = document.querySelectorAll(`#${type}Select .checkbox-list input`);
            checkboxes.forEach((cb) => {
                cb.checked = isChecked;
            });
            updateButtonText({ id: `${type}-all` });
            currentPage = 1;
            updateUI();
            updateURL();
        });
    }

    function setupDropdown(type) {
        const button = document.getElementById(`${type}Button`);
        const dropdown = document.getElementById(`${type}Select`);

        button.addEventListener('click', (e) => {
            e.stopPropagation();

            // Close all other dropdowns
            document.querySelectorAll('.select-button').forEach((btn) => {
                if (btn !== button) {
                    btn.classList.remove('active');
                    btn.nextElementSibling.classList.remove('show');
                }
            });

            // Toggle current dropdown
            button.classList.toggle('active');
            dropdown.classList.toggle('show');
        });

        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    function updateFilterOptions() {
        const cuisineSelect = document.getElementById('cuisineSelect');
        const categorySelect = document.getElementById('categorySelect');
        const cuisines = new Set();
        const categories = new Set();

        Array.from(allRecipes.values()).forEach((recipe) => {
            if (recipe.region && recipe.region !== 'Unknown') {
                cuisines.add(recipe.region);
            }
            if (recipe.category && recipe.category !== 'Uncategorized') {
                categories.add(recipe.category);
            }
        });

        const sortedCuisines = Array.from(cuisines).sort();
        const sortedCategories = Array.from(categories).sort();

        // Populate cuisine dropdown
        cuisineSelect.querySelector('.checkbox-list').innerHTML = sortedCuisines.map((cuisine) => `
            <div class="checkbox-item">
                <input type="checkbox" id="cuisine-${cuisine}" value="${cuisine}" checked>
                <label for="cuisine-${cuisine}">${cuisine}</label>
            </div>
        `).join('');

        // Populate category dropdown
        categorySelect.querySelector('.checkbox-list').innerHTML = sortedCategories.map((category) => `
            <div class="checkbox-item">
                <input type="checkbox" id="category-${category}" value="${category}" checked>
                <label for="category-${category}">${category}</label>
            </div>
        `).join('');

        // Setup All checkbox handlers
        setupAllCheckbox('cuisine');
        setupAllCheckbox('category');

        // Add event listeners to individual checkboxes
        document.querySelectorAll('.checkbox-list .checkbox-item input').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                const type = checkbox.id.startsWith('cuisine') ? 'cuisine' : 'category';
                updateAllCheckboxState(type);
                currentPage = 1;
                updateButtonText(checkbox);
                updateUI();
                updateURL();
            });
        });
    }

    function setupEventListeners() {
        // Setup dropdowns
        setupDropdown('cuisine');
        setupDropdown('category');

        // Sort select change event
        document.getElementById('sortSelect').addEventListener('change', () => {
            updateUI();
            updateURL();
        });

        // Pagination events
        document.querySelector('.prev-btn').addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                updateUI();
                updateURL();
            }
        });

        document.querySelector('.next-btn').addEventListener('click', () => {
            const maxPages = Math.ceil(filteredRecipes.length / recipesPerPage);
            if (currentPage < maxPages) {
                currentPage++;
                updateUI();
                updateURL();
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            const dropdowns = document.querySelectorAll('.select-dropdown');
            dropdowns.forEach((dropdown) => {
                const button = dropdown.previousElementSibling;
                if (!dropdown.contains(e.target) && !button.contains(e.target)) {
                    dropdown.classList.remove('show');
                    button.classList.remove('active');
                }
            });
        });

        // Handle browser back/forward navigation
        window.addEventListener('popstate', () => {
            initializeFromURL();
            updateUI();
        });

        // Share filters button
        document.getElementById('shareFiltersBtn').addEventListener('click', () => {
            copyFiltersURL();
        });
    }

    async function fetchAllRecipes() {
        try {
            // First, fetch the list of all meal IDs and names
            const response = await fetch(`${API_BASE_URL}/search.php?f=a`);
            const initialData = await response.json();

            if (initialData.meals) {
                // Process each meal
                initialData.meals.forEach((meal) => {
                    allRecipes.set(meal.strMeal, {
                        id: meal.idMeal,
                        name: meal.strMeal,
                        category: meal.strCategory || 'Uncategorized',
                        region: meal.strArea || 'Unknown',
                        image: meal.strMealThumb,
                        isFavorite: false
                    });
                });
            }

            // Fetch meals starting with other letters (b through z)
            const letters = 'bcdefghijklmnopqrstuvwxyz'.split('');
            const promises = letters.map((letter) => fetch(`${API_BASE_URL}/search.php?f=${letter}`)
                .then((res) => res.json())
                .then((letterData) => {
                    if (letterData.meals) {
                        letterData.meals.forEach((meal) => {
                            allRecipes.set(meal.strMeal, {
                                id: meal.idMeal,
                                name: meal.strMeal,
                                category: meal.strCategory || 'Uncategorized',
                                region: meal.strArea || 'Unknown',
                                image: meal.strMealThumb,
                                isFavorite: false
                            });
                        });
                    }
                })
                .catch((error) => console.error(`Error fetching recipes for ${letter}:`, error)));

            await Promise.all(promises);

            // Initialize filteredRecipes
            filteredRecipes = Array.from(allRecipes.values());

            // Update filter options
            updateFilterOptions();

            // Initialize from URL parameters
            initializeFromURL();

            // Initial update
            updateUI();

            // Update URL to reflect current state
            updateURL();
        } catch (error) {
            // console.error('Error fetching recipes:', error);
            const recipeGrid = document.querySelector('.recipe-grid');
            recipeGrid.innerHTML = '<div class="error-message">Failed to load recipes. Please try again later.</div>';
        }
    }

    async function init() {
        await fetchAllRecipes();
        setupEventListeners();
    }

    // Initialize the page
    init();

    function createRecipeCard(recipe) {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.name}" loading="lazy">
            <div class="recipe-card-content">
                <h3 class="recipe-title">${recipe.name}</h3>
                <div class="recipe-tags">
                    <span class="tag category-tag">${recipe.category}</span>
                    <span class="tag region-tag">${recipe.region}</span>
                </div>
                <button type="button" class="favorite-btn" aria-label="Add to favorites">
                    <i class="fa-regular fa-star"></i>
                </button>
            </div>
        `;

        // Add click event for the favorite button
        const favoriteBtn = card.querySelector('.favorite-btn');

        // Check initial favorite state
        checkIfFavorited(recipe.id).then((isFavorited) => {
            const icon = favoriteBtn.querySelector('i');
            if (isFavorited) {
                favoriteBtn.classList.add('active');
                icon.className = 'fa-solid fa-star';
            }
        });

        favoriteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const icon = favoriteBtn.querySelector('i');
            const isCurrentlyFavorited = favoriteBtn.classList.contains('active');

            // Get current recipe data
            const recipeData = {
                recipe_name: recipe.name,
                recipe_category: recipe.category,
                recipe_region: recipe.region,
                recipe_photo: recipe.image
            };

            // Send request to server
            const newFavoriteStatus = await toggleFavorite(recipe.id, recipeData);

            if (newFavoriteStatus !== null) {
                // Update UI based on server response
                if (newFavoriteStatus.isFavorited) {
                    favoriteBtn.classList.add('active');
                    icon.className = 'fa-solid fa-star';
                } else {
                    favoriteBtn.classList.remove('active');
                    icon.className = 'fa-regular fa-star';
                }
            } else {
                // If there was an error, revert to previous state
                favoriteBtn.classList.toggle('active', isCurrentlyFavorited);
                icon.className = isCurrentlyFavorited ? 'fa-solid fa-star' : 'fa-regular fa-star';
            }
        });

        // Add click event for the entire card
        card.addEventListener('click', () => {
            window.location.href = `recipe.html?id=${recipe.id}`;
        });

        return card;
    }
});
