// home.js

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

    if (response.status === 401) {
      // User is not logged in
      window.location.href = "/log_in.html";
      return null;
    }

    if (!response.ok) {
      throw new Error("Failed to toggle favorite");
    }

    const data = await response.json();
    // console.log("Server data:", data);
    // console.log("Returning favorite status:", data.isFavorited);
    return data.isFavorited;
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
    if (response.status === 401) {
      // User is not logged in, don't redirect but return false
      return false;
    }
    if (!response.ok) {
      throw new Error("Failed to check favorite status");
    }
    const data = await response.json();
    return data.isFavorited;
  } catch (error) {
    return false;
  }
}

// TODO:
// error handling if data doesn't exist in fields from api
// display when nothing matches search criteria
// filter by category?

// List of items for autocomplete
let suggestions = [];
const apiurl = "https://www.themealdb.com/api/json/v1/1/search.php?s=";

function createResultCard(id, image, name, text) {
  // Creates a formatted div for each result returned by API

  /* Template for result element

  <div class="resultCard" data-meal-id="123">
    <img src="grocery.png" alt="Meal Image" class="resultImage">
      <div class="resultText">
        <h2>Food Name</h2>
        <p>Lorem ipsum...</p>
      </div>
  </div>

  */

  const card = document.createElement("div");
  card.classList.add("resultCard");
  card.dataset.mealId = id;

  const img = document.createElement("img");
  // Preview uses smaller image to improve loading times
  img.src = image + "/preview";
  img.alt = "Meal Image";
  img.classList.add("resultImage");

  const textDiv = document.createElement("div");
  textDiv.classList.add("resultText");

  const titleContainer = document.createElement("div");
  titleContainer.classList.add("recipe-title-container");

  const title = document.createElement("h2");
  title.textContent = name;

  const favoriteBtn = document.createElement("button");
  favoriteBtn.type = "button";
  favoriteBtn.className = "favorite-btn";
  favoriteBtn.setAttribute("aria-label", "Add to favorites");
  favoriteBtn.innerHTML = '<i class="fa-regular fa-star"></i>';

  // Check initial favorite state
  checkIfFavorited(id).then((isFavorited) => {
    // console.log("Initial favorite state for", name, ":", isFavorited);
    if (isFavorited) {
      favoriteBtn.classList.add("active");
      const icon = favoriteBtn.querySelector("i");
      icon.classList.remove("fa-regular");
      icon.classList.add("fa-solid");
      // console.log("Initial setup: added active class and solid star for", name);
      // console.log("Initial classes:", favoriteBtn.className);
      // console.log("Initial icon classes:", icon.className);
    } else {
      // console.log("Recipe not favorited initially:", name);
    }
  });

  favoriteBtn.addEventListener("click", async (e) => {
    // console.log("Favorite button clicked for recipe:", id, name);
    e.stopPropagation(); // Prevent card click when clicking star
    const icon = favoriteBtn.querySelector("i");
    const isCurrentlyFavorited = favoriteBtn.classList.contains("active");
    // console.log("Current favorite state:", isCurrentlyFavorited);
    // console.log("Current classes:", favoriteBtn.className);
    // console.log("Current icon classes:", icon.className);

    // Get current recipe data
    const recipeData = {
      recipe_name: name,
      recipe_category: text,
      recipe_region: "",
      recipe_photo: image
    };

    // Send request to server
    const newFavoriteStatus = await toggleFavorite(id, recipeData);
    // console.log("New favorite status from server:", newFavoriteStatus);

    if (newFavoriteStatus !== null) {
      // Update UI based on server response
      // console.log("Updating UI with new state:", newFavoriteStatus);

      if (newFavoriteStatus) {
        favoriteBtn.classList.add("active");
        icon.classList.remove("fa-regular");
        icon.classList.add("fa-solid");
        // console.log("Added active class and solid star");
      } else {
        favoriteBtn.classList.remove("active");
        icon.classList.remove("fa-solid");
        icon.classList.add("fa-regular");
        // console.log("Removed active class and added regular star");
      }

      // console.log("Final classes:", favoriteBtn.className);
      // console.log("Final icon classes:", icon.className);
    } else {
      // If there was an error, revert to previous state
      // console.log("Error occurred, reverting to previous state:", isCurrentlyFavorited);
      favoriteBtn.classList.toggle("active", isCurrentlyFavorited);
      icon.classList.toggle("fa-regular", !isCurrentlyFavorited);
      icon.classList.toggle("fa-solid", isCurrentlyFavorited);
    }
  });

  titleContainer.appendChild(title);
  titleContainer.appendChild(favoriteBtn);

  const description = document.createElement("p");
  description.textContent = text;
  textDiv.appendChild(titleContainer);
  textDiv.appendChild(description);

  card.appendChild(img);
  card.appendChild(textDiv);

  card.addEventListener("click", () => {
    window.location.href = `recipe.html?id=${id}`;
  });

  return card;
}

function mealSearch(searchurl) {
  const resultSection = document.querySelector(".resultSection");

  // Clear previous results
  if (resultSection) {
    resultSection.innerHTML = "";
  }

  fetch(searchurl)
    .then((response) => response.json())
    .then((data) => {
      if (!data.meals) {
        // Show no results message
        resultSection.innerHTML = `
          <div class="no-results-message">
            <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 15px; opacity: 0.7;"></i>
            <p>No recipes found. Try a different search term.</p>
          </div>
        `;
        return;
      }

      // Create and append result cards
      data.meals.forEach((meal) => {
        const card = createResultCard(
          meal.idMeal,
          meal.strMealThumb,
          meal.strMeal,
          `${meal.strCategory}${meal.strArea ? ` • ${meal.strArea}` : ""}`
        );
        resultSection.appendChild(card);
      });
    })
    .catch((error) => {
      resultSection.innerHTML = `
        <div class="no-results-message">
          <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 15px; color: #ff6b6b;"></i>
          <p>An error occurred while searching. Please try again.</p>
        </div>
      `;
    });
}

function randomMeal() {
  const randomUrl = "https://www.themealdb.com/api/json/v1/1/random.php";

  const searchInput = document.querySelector("#searchBarInput");
  if (searchInput) {
    searchInput.placeholder = "Fetching a random meal...";
    setTimeout(() => {
      searchInput.placeholder = "Search for food...";
    }, 250);
    searchInput.value = "";
  }

  // Fetch random meal and redirect to its recipe page
  fetch(randomUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.meals && data.meals[0]) {
        const meal = data.meals[0];
        window.location.href = `recipe.html?id=${meal.idMeal}`;
      }
    })
    .catch((error) => {
      // Error handling for random meal fetch
    });
}

// Function for attaching autocomplete to any search block
function setupAutocomplete(inputId, listId, formSelector) {
  const input = document.getElementById(inputId);
  const suggestionsList = document.getElementById(listId);
  const form = document.querySelector(formSelector);

  if (input && suggestionsList && form) {
    input.addEventListener("input", () => {
      const value = input.value.trim().toLowerCase();
      suggestionsList.innerHTML = "";
      if (!value) {
        suggestionsList.style.display = "none";
        return;
      }
      const filtered = suggestions.filter((item) => item.name.toLowerCase().includes(value));
      if (!filtered.length) {
        suggestionsList.style.display = "none";
        return;
      }
      filtered.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item.name;
        li.dataset.mealId = item.id;
        li.addEventListener("click", () => {
          // Redirect directly to recipe page when suggestion is clicked
          window.location.href = `recipe.html?id=${item.id}`;
        });
        suggestionsList.appendChild(li);
      });
      suggestionsList.style.display = "block";
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".searchInputWrapper")) {
        suggestionsList.style.display = "none";
      }
    });
  }
}

function fetchAllMealsAZ() {
  const letters = "abcdefghijklmnopqrstuvwxyz".split("");

  let allMeals = [];

  Promise.all(
    letters.map((letter) => fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.meals) {
          allMeals = allMeals.concat(data.meals.map((m) => ({
            name: m.strMeal,
            id: m.idMeal
          })));
        }
      }))
  ).then(() => {
    suggestions = allMeals;
  });
}

// Audio toggle functionality
const audio = document.getElementById("starWarsAudio");
const toggleBtn = document.getElementById("toggleAudio");
if (audio && toggleBtn) {
  const icon = toggleBtn.querySelector("i");

  // Ensure audio starts muted
  audio.muted = true;
  icon.className = "fas fa-volume-mute";
  toggleBtn.classList.add("muted");

  toggleBtn.addEventListener("click", function () {
    audio.muted = !audio.muted;
    icon.className = audio.muted ? "fas fa-volume-mute" : "fas fa-volume-up";
    toggleBtn.classList.toggle("muted", audio.muted);
  });
}

fetchAllMealsAZ();

// Grab everything _after_ the DOM is ready
const input = document.getElementById("searchBarInput");
const suggestionsList = document.getElementById("suggestionsList");
const form = document.querySelector(".searchBox");
const navLinks = document.querySelectorAll(".navbar a");
const header = document.querySelector(".header");
const navSearch = document.getElementById("navSearch");
const profileContainer = document.querySelector(".profile-container");
const profileIconWindow = document.querySelector(".profileIconWindow");
const profileNameEl = document.querySelector(".profileCard-name");
const loginBtn = document.querySelector(".profileCard-bubble.login-btn");
const signoutBtn = document.querySelector(".profileCard-bubble.signout-btn");
const savedRecipesBtn = document.querySelector('.profileCard-bubble[href="saved_recipes.html"]');
const mealPlanBtn = document.querySelector('.profileCard-bubble[href="meal_planner.html"]');
const editProfileBtn = document.querySelector('.profileCard-bubble[href="edit_profile.html"]');

let hideDropdownTimeout;

// Autocomplete: only hook up if that search bar actually exists here
if (input && suggestionsList && form) {
  input.addEventListener("input", () => {
    const value = input.value.trim().toLowerCase();
    suggestionsList.innerHTML = "";
    if (!value) {
      suggestionsList.style.display = "none";
      return;
    }
    const filtered = suggestions.filter((item) => item.name.toLowerCase().includes(value));
    if (!filtered.length) {
      suggestionsList.style.display = "none";
      return;
    }
    filtered.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item.name;
      li.dataset.mealId = item.id;
      li.addEventListener("click", () => {
        // Redirect directly to recipe page when suggestion is clicked
        window.location.href = `recipe.html?id=${item.id}`;
      });
      suggestionsList.appendChild(li);
    });
    suggestionsList.style.display = "block";
  });

  document.getElementById("randomMealButton").addEventListener("click", (e) => {
    var urlChange = new URL(window.location);
    urlChange.searchParams.set("search", encodeURIComponent("random"));
    window.history.pushState({}, "", urlChange);

    randomMeal();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".searchInputWrapper")) {
      suggestionsList.style.display = "none";
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const search = input.value;
    if (search) {
      // Check if the exact search matches any suggestion
      const exactMatch = suggestions.find((item) => (
        item.name.toLowerCase() === search.toLowerCase()
      ));
      if (exactMatch) {
        // If exact match found, redirect to recipe page
        window.location.href = `recipe.html?id=${exactMatch.id}`;
      } else if (search === "random") {
        randomMeal();
      } else {
        var url = apiurl + search;
        mealSearch(url);
      }

      // If search on main page update the url without a full refresh
      const urlChange = new URL(window.location);
      urlChange.searchParams.set("search", encodeURIComponent(search));
      window.history.pushState({}, "", urlChange);
    }
  });
}

// Highlight the active nav link on every page
const currentPage = window.location.pathname
  .split('/')
  .pop()
  .replace(".html", "")
  .toLowerCase();

navLinks.forEach((link) => {
  const href = link.getAttribute("href");
  if (!href) return;
  const normalizedHref = href.replace(".html", "").toLowerCase();
  if (
    normalizedHref === currentPage
    || (normalizedHref === "index" && currentPage === "")
  ) {
    link.classList.add("active");
  }
});

// Hide the header search on home if you want
if (navSearch && /index\.html$|\/$/.test(window.location.pathname)) {
  navSearch.style.visibility = "hidden";
}

function showDropdown() {
  clearTimeout(hideDropdownTimeout);
  if (profileIconWindow) {
    profileIconWindow.style.opacity = "1";
    profileIconWindow.style.pointerEvents = "auto";
  }
}

function hideDropdown() {
  hideDropdownTimeout = setTimeout(() => {
    if (profileIconWindow) {
      profileIconWindow.style.opacity = "0";
      profileIconWindow.style.pointerEvents = "none";
    }
  }, 300);
}

// Show the profile icon dropdown
if (profileContainer && profileIconWindow) {
  profileContainer.addEventListener("mouseenter", showDropdown);
  profileContainer.addEventListener("mouseleave", hideDropdown);
  profileIconWindow.addEventListener("mouseenter", showDropdown);
  profileIconWindow.addEventListener("mouseleave", hideDropdown);
}

// Hide/reveal header on scroll
let lastY = window.scrollY;
window.addEventListener("scroll", () => {
  if (window.scrollY > lastY) header.classList.add("hide-on-scroll");
  else header.classList.remove("hide-on-scroll");
  lastY = window.scrollY;
});

// Toggle search modal
const openSearchModalBtn = document.getElementById("openSearchModal");
const spotlightOverlay = document.getElementById("spotlightOverlay");
const spotlightInput = document.getElementById("spotlightInput");
const spotlightSuggestions = document.getElementById("spotlightSuggestions");

if (openSearchModalBtn && spotlightOverlay && spotlightInput && spotlightSuggestions) {
  openSearchModalBtn.addEventListener("click", () => {
    spotlightOverlay.style.display = "flex";
    setTimeout(() => spotlightInput.focus(), 10);
  });

  spotlightOverlay.addEventListener("click", (event) => {
    if (event.target === spotlightOverlay) {
      spotlightOverlay.style.display = "none";
      spotlightSuggestions.innerHTML = "";
    }
  });

  setupAutocomplete("spotlightInput", "spotlightSuggestions", ".spotlight-bar");
}

// If on index or root and search param in url, fill field and perform search
// (for spotlight searches and direct linking)
if (
  window.location.pathname.endsWith("index.html")
  || window.location.pathname === "/"
) {
  const params = new URLSearchParams(window.location.search);
  const search = params.get("search");

  if (search) {
    if (search === "random") {
      randomMeal();
    } else {
      const searchInput = document.querySelector("#searchBarInput");
      if (searchInput) {
        searchInput.value = search;
      }

      var url = apiurl + encodeURIComponent(search);
      mealSearch(url);
    }
  }
}

// Detect click on resultCards and redirect to recipe page
document.addEventListener("click", function (e) {
  const card = e.target.closest(".resultCard");
  if (card) {
    e.preventDefault();
    const id = card.dataset.mealId;
    window.location.href = "recipe.html?id=" + encodeURIComponent(id);
  }
});


function setLoggedIn(name) {
  // console.log("setLoggedIn called for user:", name);
  if (profileNameEl) profileNameEl.textContent = `Welcome, ${name}`;
  if (loginBtn) loginBtn.style.display = "none";
  if (signoutBtn) signoutBtn.style.display = "block";
  if (savedRecipesBtn) savedRecipesBtn.style.display = "block";
  if (mealPlanBtn) mealPlanBtn.style.display = "block";
  if (editProfileBtn) editProfileBtn.style.display = "block";
  // console.log("Profile menu buttons visibility set for logged in state.");
}

function setLoggedOut() {
  const profileCardName = document.querySelector(".profileCard-name");
  const savedRecipesLink = document.querySelector(".profileCard-bubble[href=\"saved_recipes.html\"]");
  const mealPlanLink = document.querySelector(".profileCard-bubble[href=\"meal_planner.html\"]");
  const editProfileLink = document.querySelector(".profileCard-bubble[href=\"edit_profile.html\"]");

  if (savedRecipesLink) savedRecipesLink.style.display = "none";
  if (mealPlanLink) mealPlanLink.style.display = "none";
  if (editProfileLink) editProfileLink.style.display = "none";

  // Ensure 'Welcome, User' is displayed when logged out
  if (profileCardName) profileCardName.textContent = "Welcome, User";
}

// Check login state immediately
fetch("/profile", {
  credentials: "include"
})
  .then((res) => {
    // console.log("Profile fetch response status:", res.status);
    if (!res.ok) {
      // console.log("User not logged in or session expired (status not ok).");
      setLoggedOut();
      throw new Error("Not logged in");
    }
    return res.json();
  })
  .then((data) => {
    // console.log("Profile data received:", data);
    if (data.first_name) {
      setLoggedIn(data.first_name);
    } else {
      setLoggedOut();
    }
  })
  .catch((error) => {
    // console.error("Error checking login status:", error);
    setLoggedOut();
  });

// Sign out handler
if (signoutBtn) {
  signoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/logout", {
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        // console.log("Logged out successfully.");
        setLoggedOut();
        window.location.href = "/log_in.html"; // Redirect to login page after logout
      } else {
        // console.error("Logout failed.", response.status, response.statusText);
      }
    } catch (error) {
      // console.error("Network error during logout:", error);
    }
  });
}

// Function to create a carousel card for a recipe
function createCarouselCard(recipe) {
  if (!recipe || !recipe.idMeal) return null;

  const card = document.createElement("div");
  card.className = "carousel-card";
  card.dataset.mealId = recipe.idMeal;

  // Safely get recipe properties with defaults
  const mealName = recipe.strMeal || "Unnamed Recipe";
  const mealThumb = recipe.strMealThumb || "default-recipe-image.jpg";
  const category = recipe.strCategory || "";
  const area = recipe.strArea || "";

  card.innerHTML = `
    <div class="card-image-container">
      <img src="${mealThumb}" alt="${mealName}" class="card-img" loading="lazy">
    </div>
    <div class="card-content">
      <div class="recipe-title-container">
        <h3>${mealName}</h3>
        <button class="favorite-btn" data-meal-id="${recipe.idMeal
    }" aria-label="Add to favorites">
          <i class="fa-regular fa-star"></i>
        </button>
      </div>
      <div class="card-tags">
        ${category
      ? `<span class="card-tag" style="background: #4CAF50">${category}</span>`
      : ""
    }
        ${area
      ? `<span class="card-tag" style="background: #2196F3">${area}</span>`
      : ""
    }
      </div>
    </div>
  `;

  // Add click handler to the favorite button
  const favoriteBtn = card.querySelector(".favorite-btn");
  if (favoriteBtn) {
    // Check if recipe is favorited first
    checkIfFavorited(recipe.idMeal).then((isFavorited) => {
      const icon = favoriteBtn.querySelector("i");
      if (icon) {
        // console.log("Carousel card favorite check for", mealName, ":", isFavorited);
        if (isFavorited) {
          icon.className = "fa-solid fa-star";
          favoriteBtn.classList.add("active");
          // console.log("Carousel: set as favorited for", mealName);
        } else {
          icon.className = "fa-regular fa-star";
          favoriteBtn.classList.remove("active");
          // console.log("Carousel: set as not favorited for", mealName);
        }
        // console.log("Carousel final classes:", favoriteBtn.className);
        // console.log("Carousel final icon classes:", icon.className);
      }
    });

    favoriteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const icon = favoriteBtn.querySelector("i");
      const isCurrentlyFavorited = favoriteBtn.classList.contains("active");

      // Get current recipe data
      const recipeData = {
        recipe_name: mealName,
        recipe_category: category,
        recipe_region: area,
        recipe_photo: mealThumb
      };

      // Send request to server
      const newFavoriteStatus = await toggleFavorite(recipe.idMeal, recipeData);
      // console.log("New favorite status from server:", newFavoriteStatus);

      if (newFavoriteStatus !== null) {
        // Update UI based on server response
        if (newFavoriteStatus) {
          favoriteBtn.classList.add("active");
          icon.className = "fa-solid fa-star";
        } else {
          favoriteBtn.classList.remove("active");
          icon.className = "fa-regular fa-star";
        }
      } else {
        // If there was an error, revert to previous state
        favoriteBtn.classList.toggle("active", isCurrentlyFavorited);
        icon.className = isCurrentlyFavorited ? "fa-solid fa-star" : "fa-regular fa-star";
      }
    });
  }

  // Add click handler to the card
  card.addEventListener("click", () => {
    window.location.href = `recipe.html?id=${recipe.idMeal}`;
  });

  return card;
}

// Function to create carousel dots
function createCarouselDots(trackElement, dotsElement) {
  if (!trackElement || !dotsElement) return;

  const track = trackElement; // Create local reference
  const cards = track.querySelectorAll(".carousel-card");
  const cardWidth = cards.length > 0 ? cards[0].offsetWidth + 20 : 0; // including margin
  const visibleCards = Math.floor(track.parentElement.offsetWidth / cardWidth);
  const totalDots = Math.ceil(cards.length / visibleCards);

  // Create new dots container
  const newDotsContent = document.createDocumentFragment();

  // Create new dots
  for (let i = 0; i < totalDots; i++) {
    const dot = document.createElement("div");
    dot.className = "dot" + (i === 0 ? " active" : "");
    dot.addEventListener("click", () => {
      // Calculate scroll position
      const scrollAmount = i * (visibleCards * cardWidth);
      track.style.transform = `translateX(-${scrollAmount}px)`;

      // Update active dot
      dotsElement.querySelectorAll(".dot").forEach((d, index) => {
        d.classList.toggle("active", index === i);
      });
    });
    newDotsContent.appendChild(dot);
  }

  // Clear and update dots container
  while (dotsElement.firstChild) {
    dotsElement.removeChild(dotsElement.firstChild);
  }
  dotsElement.appendChild(newDotsContent);
}

// Function to load and display recently viewed recipes
function loadRecentlyViewed() {
  try {
    const recentlyViewed = JSON.parse(
      localStorage.getItem("recentlyViewed") || "[]"
    );
    const section = document.getElementById("recentlyViewedSection");

    if (!section) return;

    // Ensure section has the carousel class
    section.classList.add("carousel");

    // Add clear button next to the heading if it doesn't exist
    let clearButton = section.querySelector(".clear-history-btn");
    if (!clearButton) {
      const heading = section.querySelector("h2");
      if (heading) {
        clearButton = document.createElement("button");
        clearButton.className = "clear-history-btn";
        clearButton.innerHTML = '<i class="fas fa-trash-alt"></i> Clear History';
        clearButton.addEventListener("click", function clearRecentlyViewed() {
          try {
            localStorage.removeItem("recentlyViewed");
            loadRecentlyViewed(); // Reload the section to show empty state
          } catch (error) {
            // Error clearing recently viewed recipes
          }
        });
        heading.insertAdjacentElement("afterend", clearButton);
      }
    }

    // Ensure carousel container exists
    let carouselContainer = section.querySelector(".carousel-container");
    if (!carouselContainer) {
      carouselContainer = document.createElement("div");
      carouselContainer.className = "carousel-container";
      section.appendChild(carouselContainer);
    }

    // Create or update carousel structure
    if (!recentlyViewed.length) {
      carouselContainer.innerHTML = `
        <div class="carousel-window">
          <div class="carousel-track-wrapper">
            <div class="carousel-track">
              <div class="no-recipes-message">
                No recently viewed recipes
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Create carousel structure
    carouselContainer.innerHTML = `
      <div class="carousel-window">
        <div class="carousel-track-wrapper">
          <div class="carousel-track"></div>
        </div>
      </div>
    `;

    // Add recipe cards to the track
    const track = carouselContainer.querySelector(".carousel-track");
    if (track) {
      // Filter out any invalid recipes and create cards
      recentlyViewed
        .filter((recipe) => recipe && recipe.idMeal)
        .forEach((recipe) => {
          const card = createCarouselCard(recipe);
          if (card) {
            track.appendChild(card);
          }
        });

      // Only add dots if we have valid cards
      if (track.children.length > 0) {
        const dotsContainer = document.createElement("div");
        dotsContainer.className = "carousel-dots";
        carouselContainer.appendChild(dotsContainer);
        createCarouselDots(track, dotsContainer);
      }
    }
  } catch (error) {
    // Error loading recently viewed recipes
  }
}

// Update dots on window resize
window.addEventListener("resize", () => {
  const recentlyViewedTrack = document.querySelector("#recentlyViewedTrack");
  const recentlyViewedDots = document.querySelector("#recentlyViewedDots");
  if (recentlyViewedTrack && recentlyViewedDots) {
    createCarouselDots(recentlyViewedTrack, recentlyViewedDots);
  }
});

// Load recently viewed recipes
loadRecentlyViewed();

// Reload recently viewed when returning to the page
window.addEventListener("focus", loadRecentlyViewed);

// Dark mode functionality
function initDarkMode() {
  const darkModeToggle = document.getElementById('darkModeToggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

  // Function to toggle theme
  function toggleTheme(isDark) {
    // console.log('Toggling theme to:', isDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    // console.log('Document data-theme set to:',
    // document.documentElement.getAttribute('data-theme'));
    if (darkModeToggle) {
      const icon = darkModeToggle.querySelector('i');
      if (icon) {
        // const oldClass = icon.className;
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        // console.log('Icon changed from', oldClass, 'to', icon.className);
      }
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    // console.log('Saved theme to localStorage:', localStorage.getItem('theme'));
  }

  // Check for saved user preference, first in localStorage, then system pref
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    toggleTheme(savedTheme === 'dark');
  } else {
    toggleTheme(prefersDarkScheme.matches);
  }

  // Listen for toggle button click
  if (darkModeToggle) {
    // console.log('Dark mode toggle button found, adding click listener');
    darkModeToggle.addEventListener('click', () => {
      // console.log('Dark mode toggle clicked!');
      const currentTheme = document.documentElement.getAttribute('data-theme');
      // console.log('Current theme:', currentTheme);
      const shouldBeDark = currentTheme !== 'dark';
      // console.log('Should be dark:', shouldBeDark);
      toggleTheme(shouldBeDark);
    });
  } else {
    // console.log('Dark mode toggle button not found!');
  }

  // Listen for system theme changes
  prefersDarkScheme.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      toggleTheme(e.matches);
    }
  });
}

// Initialize dark mode
initDarkMode();
