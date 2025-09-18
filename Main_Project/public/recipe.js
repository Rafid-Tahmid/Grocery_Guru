const apiLookupUrl = "https://www.themealdb.com/api/json/v1/1/lookup.php?i=";

// Function to extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Function to store recently viewed recipes
function storeRecentlyViewed(recipe) {
  try {
    // Get existing recently viewed recipes
    let recentlyViewed = JSON.parse(
      localStorage.getItem("recentlyViewed") || "[]"
    );

    // Remove the recipe if it already exists (to avoid duplicates)
    recentlyViewed = recentlyViewed.filter(
      (item) => item.idMeal !== recipe.idMeal
    );

    // Add the new recipe to the beginning
    recentlyViewed.unshift({
      idMeal: recipe.idMeal,
      strMeal: recipe.strMeal,
      strMealThumb: recipe.strMealThumb,
      strCategory: recipe.strCategory,
      strArea: recipe.strArea
    });

    // Keep only the last 10 recipes
    if (recentlyViewed.length > 10) {
      recentlyViewed = recentlyViewed.slice(0, 10);
    }

    // Save back to localStorage
    localStorage.setItem("recentlyViewed", JSON.stringify(recentlyViewed));
  } catch (error) {
    // Error handling for localStorage issues - silently fail
  }
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


function scrapeWoolworths(ingredientName) {
  const api = 'https://www.woolworths.com.au/apis/ui/Search/products?searchTerm=' + encodeURIComponent(ingredientName);

  return fetch(api)
    .then((response) => {
      if (!response.ok) throw new Error("API Issue");
      return response.json();
    })
    .then((data) => {
      // If no matches for search
      if (data.Products === null) {
        return {
          name: null,
          price: null,
          link: null,
          image: null
        };
      }



      const name = data.Products[0].Name;

      const price = data.Products[0].Products[0].Price;

      const link = 'https://www.woolworths.com.au/shop/productdetails/' + encodeURIComponent(data.Products[0].Products[0].Stockcode);

      // If we do end up using this can be changed to larger or smaller image (currently med)
      const image = data.Products[0].Products[0].MediumImageFile;


      return {
        name,
        price,
        link,
        image
      };
    });
}


// Function to fetch ingredient prices and compare stores
async function fetchIngredientPrices(ingredient, colesLogo, woolworthsLogo, priceCell) {

  try {
    const response = await fetch(`/api/ingredients/prices/${encodeURIComponent(ingredient)}`);
    const prices = await response.json();

    const {
      name: wname,
      price: wprice,
      link: wlink,
      image: wimage
    } = await scrapeWoolworths(ingredient);

    // Assign links
    woolworthsLogo.setAttribute('href', wlink || "#");
    colesLogo.setAttribute('href', prices.Coles ? prices.Coles.product_website_link : "#");

    let bestPrice = null;
    let bestStore = null;
    let priceText = "No price data";

    // Find the best price between the two stores
    const colesPrice = prices.Coles ? parseFloat(prices.Coles.product_price) : null;
    const woolworthsPrice = wprice ? parseFloat(wprice) : null;

    if (colesPrice > 0 && woolworthsPrice > 0) {
      // Both prices available - compare them
      bestPrice = colesPrice <= woolworthsPrice ? colesPrice : woolworthsPrice;
      bestStore = colesPrice <= woolworthsPrice ? 'Coles' : 'Woolworths';
    } else if (colesPrice > 0) {
      // Only Coles available
      bestPrice = colesPrice;
      bestStore = 'Coles';
      woolworthsLogo.classList.add('dead');
      woolworthsLogo.removeAttribute("href");
    } else if (woolworthsPrice > 0) {
      // Only Woolworths available
      bestPrice = woolworthsPrice;
      bestStore = 'Woolworths';
      colesLogo.classList.add('dead');
      colesLogo.removeAttribute("href");
    } else {
      // No prices available
      bestPrice = 0;
      bestStore = null;
      priceText = "Out of stock";
      woolworthsLogo.classList.add('dead');
      colesLogo.classList.add('dead');
      woolworthsLogo.removeAttribute("href");
      colesLogo.removeAttribute("href");
    }

    if (bestPrice > 0) {
      priceText = `$${bestPrice.toFixed(2)}`;
    }

    // Update price display
    priceCell.textContent = priceText;

    // Apply highlighting
    if (bestStore === 'Coles') {
      colesLogo.classList.remove('dimmed');
      woolworthsLogo.classList.add('dimmed');
    } else if (bestStore === 'Woolworths') {
      woolworthsLogo.classList.remove('dimmed');
      colesLogo.classList.add('dimmed');
    } else {
      colesLogo.classList.remove('dimmed');
      woolworthsLogo.classList.remove('dimmed');
    }

    return parseFloat(bestPrice);

  } catch (error) {
    priceCell.textContent = "Price unavailable";
    colesLogo.classList.remove('dimmed');
    woolworthsLogo.classList.remove('dimmed');
    return null;
  }
}


// TODO
// Instruction splitting for api results that have no newline chars or multiple e.g
// https://www.themealdb.com/api/json/v1/1/lookup.php?i=53021
// https://www.themealdb.com/api/json/v1/1/lookup.php?i=52969
// Ingredient listing
// Youtube video embed + fallback if inaccessible

document.addEventListener("DOMContentLoaded", () => {
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
      toggleTheme(currentTheme === "dark");
    });
  }

  // Listen for system theme changes
  prefersDarkScheme.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      toggleTheme(e.matches);
    }
  });

  // Back button functionality
  const backButton = document.querySelector(".back-button");
  if (backButton) {
    backButton.addEventListener("click", () => {
      window.history.back();
    });
  } else {
    console.log("Back button element not found."); // Debugging
  }

  if (window.location.pathname.endsWith("recipe.html")) {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const favoriteBtn = document.querySelector(".favorite-btn");

    if (id) {
      // First try to load from external API (TheMealDB)
      var url = apiLookupUrl + encodeURIComponent(id);

      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error("API Issue");
          } else {
            return response.json();
          }
        }).then((data) => {
          if (data.meals && data.meals[0]) {
            // Successfully loaded from external API
            loadRecipeData(data.meals[0], id, favoriteBtn, true);
          } else {
            // No meal found in external API, try our saved recipes
            throw new Error("No meal found in external API");
          }
        }).catch((error) => {
          fetch(`/api/saved-recipes/${encodeURIComponent(id)}`, {
            credentials: 'include'
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Recipe not found in saved recipes");
              }
              return response.json();
            })
            .then((savedRecipe) => {
              // Convert saved recipe format to TheMealDB format
              const mealDbFormat = {
                idMeal: savedRecipe.recipe_id.toString(),
                strMeal: savedRecipe.recipe_name,
                strCategory: savedRecipe.recipe_category,
                strArea: savedRecipe.recipe_region,
                strMealThumb: savedRecipe.recipe_photo,
                strInstructions: savedRecipe.directions,
                strYoutube: savedRecipe.directions_video
              };

              // Add ingredients from the recipe_ingredients table
              if (savedRecipe.ingredients) {
                savedRecipe.ingredients.forEach((ingredient, index) => {
                  if (index < 20) { // TheMealDB format supports up to 20 ingredients
                    mealDbFormat[`strIngredient${index + 1}`] = ingredient.ingredient_name;
                    mealDbFormat[`strMeasure${index + 1}`] = ingredient.measure || '';
                  }
                });
              }

              loadRecipeData(mealDbFormat, id, favoriteBtn, false);
            })
            .catch((savedError) => {
              document.querySelector(".recipe-content").innerHTML = `
              <div style="text-align: center; padding: 2rem;">
                <h2>Recipe Not Found</h2>
                <p>The recipe you're looking for could not be found.</p>
                <a href="/recipe_catalogue.html">Browse Recipes</a>
              </div>
            `;
            });
        });
    }
  }

  // Extracted function to load recipe data regardless of source
  function loadRecipeData(recipe, id, favoriteBtn, isExternalApi) {
    // Store the recipe in recently viewed
    storeRecentlyViewed(recipe);

    // Update page title with recipe name
    document.title = `${recipe.strMeal} - GroceryGuru`;

    // Setup favorite button now that we have recipe data
    // Check if recipe is favorited
    checkIfFavorited(id).then((isFavorited) => {
      if (isFavorited) {
        favoriteBtn.classList.add("active");
        favoriteBtn.querySelector("i").classList.replace("far", "fas");
      }
    });

    // Handle favorite button click
    favoriteBtn.addEventListener("click", async (e) => {
      e.stopPropagation(); // Prevent card click event
      const isFavoritedBeforeClick = favoriteBtn.classList.contains("active");

      const recipeData = {
        recipe_id: recipe.idMeal,
        title: recipe.strMeal,
        image: recipe.strMealThumb,
        category: recipe.strCategory,
        cuisine: recipe.strArea
      };

      const newFavoriteStatus = await toggleFavorite(recipe.idMeal, recipeData);

      if (newFavoriteStatus && newFavoriteStatus.isFavorited) {
        favoriteBtn.classList.add("active");
        favoriteBtn.querySelector("i").classList.replace("far", "fas");
      } else {
        favoriteBtn.classList.remove("active");
        favoriteBtn.querySelector("i").classList.replace("fas", "far");
      }
    });

    // Set recipe image
    document.querySelector(".recipe-image").src = recipe.strMealThumb;

    // Split the meal name into parts for styling
    const mealName = recipe.strMeal;
    const nameParts = mealName.split(' ');

    // If meal name has at least two words
    if (nameParts.length >= 2) {
      // First word goes to main title, rest to highlight
      // Make title visible after text is set
      const [firstWord, ...restWords] = nameParts;
      document.querySelector(".recipe-title-main").textContent = firstWord;
      document.querySelector(".recipe-title-highlight").textContent = restWords.join(' ');
      document.querySelector(".recipe-title-main").style.visibility = 'visible';
      document.querySelector(".recipe-title-highlight").style.visibility = 'visible';

      // Remove any additional main title element if it exists
      const lastMainTitle = document.querySelector(".recipe-title-main:last-child");
      if (lastMainTitle && lastMainTitle !== document.querySelector(".recipe-title-main")) {
        lastMainTitle.remove();
      }
    } else {
      // If meal name has only 1 word
      document.querySelector(".recipe-title-main").textContent = '';
      document.querySelector(".recipe-title-highlight").textContent = mealName;
      document.querySelector(".recipe-title-main").style.visibility = 'visible';
      document.querySelector(".recipe-title-highlight").style.visibility = 'visible';
      // Remove any additional main title element if it exists
      const lastMainTitle = document.querySelector(".recipe-title-main:last-child");
      if (lastMainTitle && lastMainTitle !== document.querySelector(".recipe-title-main")) {
        lastMainTitle.remove();
      }
    }

    const ingredientBody = document.querySelector(".ingredient-body");
    const ingredientRowTemplate = document.querySelector(
      ".ingredient-row-template"
    );
    var ingredientsNum = 0;
    const priceFetchPromises = [];
    for (let i = 1; i <= 20; i++) {
      const curIngredient = recipe[`strIngredient${i}`];
      // If ingredient isn't empty increase number
      if (curIngredient && curIngredient.trim() !== "") {
        ingredientsNum++;

        const cloned = ingredientRowTemplate.content.cloneNode(true);

        // Capitalize the first letter of the ingredient
        const formattedIngredient = curIngredient.charAt(0).toUpperCase()
          + curIngredient.slice(1).toLowerCase();

        cloned.querySelector(".ingredient-name").textContent = formattedIngredient;

        // Set initial state while loading prices
        const colesLogo = cloned.querySelector(".coles");
        const woolworthsLogo = cloned.querySelector(".woolworths");
        const priceCell = cloned.querySelector(".ingredient-price");

        colesLogo.href = "#";
        woolworthsLogo.href = "#";
        priceCell.textContent = "Loading...";

        ingredientBody.appendChild(cloned);

        // hacky fix for common ingredients with matching issues e.g sugar might match with
        // 'no sugar cola' and serve the wrong data

        const ingredientReplacements = {
          sugar: 'white sugar',
          flour: 'plain flour',
          milk: 'full cream milk',
          butter: 'unsalted butter',
          egg: ' large free range eggs',
          eggs: 'large free range eggs',
          beef: 'beef diced',
          oil: 'blended vegetable oil',
          'vegetable oil': 'blended vegetable oil',
          'olive oil': 'australian extra virgin olive oil',
          lime: 'limes',
          lamb: 'lamb leg',
          lemon: 'lemons',
          onion: 'onions',
          mince: 'lean mince',
          'minced beef': 'lean mince',
          salt: 'table salt',
          pepper: 'ground black pepper',
          banana: 'bananas',
          cacao: 'cacao powder',
          cocoa: 'cocoa powder',
          vanilla: 'vanilla extract',
          honey: 'pure honey',
          'sea salt': 'rock salt',
          garlic: 'garlic loose',
          ginger: 'ginger loose',
          'bay leaf': 'bay leaves',
          'tomato puree': 'passata',
          'sour cream': 'light sour cream',
          'cream cheese': 'cream cheese spread',
          bacon: 'middle bacon',
          shallots: 'spring onion',
          challots: 'spring onion',
          'red wine': 'shiraz',
          rosemary: 'hoyts rosemary',
          'dark chocolate': 'old gold',
          vinegar: 'white vinegar',
          peanuts: 'salted peanuts',
          bread: 'white bread',
          chicken: 'chicken breast fillets'
        };

        const filteredIngredient = ingredientReplacements[formattedIngredient.toLowerCase()]
          || formattedIngredient;

        priceFetchPromises.push(
          fetchIngredientPrices(filteredIngredient, colesLogo, woolworthsLogo, priceCell)
        );
      }
    }

    const infoBody = document.querySelector(".recipe-info-boxes");
    const infoBoxTemplate = document.querySelector(".info-box-template");
    const infoCloned1 = infoBoxTemplate.content.cloneNode(true);

    infoCloned1.querySelector(".info-title").textContent = "Ingredients";
    infoCloned1.querySelector(".info-content").textContent = ingredientsNum;

    infoBody.appendChild(infoCloned1);

    const infoCloned2 = infoBoxTemplate.content.cloneNode(true);
    infoCloned2.querySelector(".info-title").textContent = "Instructions";

    infoBody.appendChild(infoCloned2);

    const infoCloned3 = infoBoxTemplate.content.cloneNode(true);
    infoCloned3.querySelector(".info-title").textContent = "Cuisine";
    infoCloned3.querySelector(".info-content").textContent = recipe.strArea;

    infoBody.appendChild(infoCloned3);

    const infoCloned4 = infoBoxTemplate.content.cloneNode(true);
    infoCloned4.querySelector(".info-title").textContent = "Category";
    infoCloned4.querySelector(".info-content").textContent = recipe.strCategory;

    infoBody.appendChild(infoCloned4);

    (async () => {
      const prices = await Promise.all(priceFetchPromises);
      const totalPrice = prices.reduce((acc, price) => acc + (isNaN(price) ? 0 : price), 0);

      const infoCloned5 = infoBoxTemplate.content.cloneNode(true);
      infoCloned5.querySelector(".info-title").textContent = "Total Price";
      infoCloned5.querySelector(".info-content").textContent = `$${totalPrice.toFixed(2)}`;

      infoBody.appendChild(infoCloned5);
    })();


    const relatedGrid = document.querySelector(".related-grid");
    const relatedCardTemplate = document.querySelector(
      ".related-card-template"
    );
    const usedMealIds = new Set();
    usedMealIds.add(id);

    for (let i = 0; i < 4; i++) {
      // Choose randomly to relate through category or country
      const chooseRelation = Math.floor(Math.random() * 2);
      const clonedRelated = relatedCardTemplate.content.cloneNode(true);
      const clickableCard = clonedRelated.querySelector(".related-card");

      var filterUrl;
      if (chooseRelation === 0) {
        filterUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?c=${recipe.strCategory}`;
      } else {
        filterUrl = `https://www.themealdb.com/api/json/v1/1/filter.php?a=${recipe.strArea}`;
      }

      fetch(filterUrl)
        .then((res) => res.json())
        .then((filteredData) => {
          const { meals } = filteredData;
          // ensure that current meal or duplicates dont appear in suggestions
          let uniqueMeal;
          let attempts = 0;

          do {
            uniqueMeal = meals[Math.floor(Math.random() * meals.length)];
            attempts++;
            if (attempts > 10) break; // break if somehow not finding unique (shouldnt happen)
          } while (usedMealIds.has(uniqueMeal.idMeal));

          usedMealIds.add(uniqueMeal.idMeal);

          return fetch(
            `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${uniqueMeal.idMeal}`
          );
        })
        .then((fullMealResponse) => fullMealResponse.json())
        .then((fullMealData) => {
          const meal = fullMealData.meals[0];
          clonedRelated.querySelector(".related-card-title").textContent = meal.strMeal;
          clonedRelated.querySelector(".related-card-image").src = meal.strMealThumb;
          clonedRelated.querySelector(".related-card-category").textContent = meal.strCategory;
          clonedRelated.querySelector(".related-card-cuisine").textContent = meal.strArea;

          // Get the favorite button that's already in the template
          const favBtn = clonedRelated.querySelector(".favorite-btn");

          // Favorite logic
          checkIfFavorited(meal.idMeal).then((isFavorited) => {
            const favIcon = favBtn.querySelector("i");
            if (isFavorited) {
              favBtn.classList.add("active");
              favIcon.classList.remove("fa-regular");
              favIcon.classList.add("fa-solid");
            }

            favBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();

              // Toggle favorite state
              favBtn.classList.toggle("active");
              favIcon.classList.toggle("fa-regular");
              favIcon.classList.toggle("fa-solid");

              const isCurrentlyFavorited = favBtn.classList.contains("active");
              const recipeData = {
                idMeal: meal.idMeal,
                isFavorite: isCurrentlyFavorited
              };

              const result = await toggleFavorite(meal.idMeal, recipeData);

              if (!result) {
                // Revert if there was an error
                favBtn.classList.toggle("active");
                favIcon.classList.toggle("fa-regular");
                favIcon.classList.toggle("fa-solid");
              }
            });
          });

          // Remove inline styles - we'll use CSS classes instead
          if (chooseRelation === 0) {
            // Highlight that this is related by category
            clonedRelated
              .querySelector(".related-card-category")
              .classList.add("highlighted");
          } else {
            // Highlight that this is related by cuisine
            clonedRelated
              .querySelector(".related-card-cuisine")
              .classList.add("highlighted");
          }

          clickableCard.addEventListener("click", () => {
            window.location.href = `recipe.html?id=${fullMealData.meals[0].idMeal}`;
          });

          relatedGrid.appendChild(clonedRelated);
        })
        .catch(() => {
          // Error handling for related recipes - silently fail
        });
    }

    // Handle YouTube video embedding
    const videoContainer = document.querySelector(".video-container");
    const videoSection = document.querySelector(".video-section");
    const youtubeUrl = recipe.strYoutube;

    if (youtubeUrl && youtubeUrl.trim() !== "") {
      // Extract video ID from YouTube URL
      const videoId = extractYouTubeId(youtubeUrl);

      if (videoId) {
        // Create responsive iframe embed
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        iframe.title = `${recipe.strMeal} Video Tutorial`;
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;

        // Replace placeholder with iframe
        videoContainer.innerHTML = "";
        videoContainer.appendChild(iframe);

        // Add direct link below the video in case embedding is disabled
        const linkContainer = document.createElement("div");
        linkContainer.className = "video-link-container";

        // Create paragraph element with proper class
        const embedNote = document.createElement("p");
        embedNote.className = "embed-note";
        embedNote.textContent = "Video not playing? Some videos cannot be embedded due to creator settings.";

        // Create link element
        const youtubeLink = document.createElement("a");
        youtubeLink.href = youtubeUrl;
        youtubeLink.target = "_blank";
        youtubeLink.className = "youtube-direct-link";
        youtubeLink.innerHTML = '<i class="fa-brands fa-youtube"></i> Watch directly on YouTube';

        // Append elements to the container
        linkContainer.appendChild(embedNote);
        linkContainer.appendChild(youtubeLink);

        // Apply dark mode styles if needed
        if (
          document.documentElement.getAttribute("data-theme") === "dark"
        ) {
          embedNote.style.color = "#aaaaaa";
        }

        videoSection.appendChild(linkContainer);
      } else {
        // Invalid YouTube URL
        videoContainer.innerHTML = '<p class="video-placeholder">Sorry, the video is unavailable</p>';
      }
    } else {
      // No video available
      videoSection.style.display = "none";
    }

    // ——— Format & display instructions as a proper list ———
    var raw = recipe.strInstructions || "";

    var ol = document.createElement("ol");
    ol.className = "instructions-list";

    // Try several approaches to parse instructions effectively

    // 1. First check if there are already numbered steps with periods (1. Step one)
    const numberedStepsPattern = /^\s*\d+\s*[.)-]\s*.+$/gm;
    const hasFormattedNumberedSteps = numberedStepsPattern.test(raw);

    // 2. Check for line breaks that might indicate steps
    const hasLineBreaks = raw.includes('\n');

    // 3. Check if there are steps labeled as "STEP 1:" format
    const hasStepLabels = /STEP\s+\d+\s*[:.-]/i.test(raw);

    // 4. Check if step numbers are on separate lines
    const hasSeparateNumbers = /^\s*\d+\.\s*$/m.test(raw);
    // Process based on detected format
    if (hasLineBreaks || hasFormattedNumberedSteps || hasStepLabels || hasSeparateNumbers) {
      // Split by line breaks
      let lines = raw.split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      // Handle case where step numbers are on separate lines
      let processedLines = [];
      for (let i = 0; i < lines.length; i++) {
        const currentLine = lines[i];

        // Check if this line is just a step number (like "1." or "2.")
        if (/^\s*\d+[.)-]\s*$/.test(currentLine)) {
          // Collect all following lines until we hit another step number or end
          let combinedText = currentLine;
          let j = i + 1;

          while (j < lines.length && !/^\s*\d+[.)-]\s*$/.test(lines[j])) {
            combinedText += " " + lines[j];
            j++;
          }

          processedLines.push(combinedText);
          i = j - 1; // Skip all the lines we just combined
        } else if (!/^\s*\d+[.)-]\s*$/.test(currentLine)) {
          // Only add non-step-number lines that weren't already combined
          processedLines.push(currentLine);
        }
      }

      lines = processedLines;

      if (lines.length <= 3 && raw.length > 200) {
        // Split long paragraphs into sentences
        lines = lines.flatMap((paragraph) => {
          // Use a more accurate sentence splitter
          const sentenceMatches = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          return sentenceMatches.map((s) => s.trim()).filter((s) => s.length > 0);
        });
      }

      // Process each line
      lines.forEach((line) => {
        // More aggressive cleaning of step numbers at the beginning
        let cleanLine = line
          // Remove any variation of step numbers (1., 1), Step 1:, etc.)
          .replace(/^\s*(?:STEP\s*)?(?:\d+\.|\d+\)|\d+)\s*/i, '')
          // Also clean any residual numbers that might be at the start
          .replace(/^\s*\d+\s*/, '')
          .trim();

        // Skip empty lines
        if (cleanLine.length === 0) {
          return;
        }

        // Clean up extra whitespace and normalize spacing
        cleanLine = cleanLine.replace(/\s+/g, ' ').trim();

        // Create list item
        const li = document.createElement("li");

        // Ensure first letter is capital
        cleanLine = cleanLine.charAt(0).toUpperCase() + cleanLine.slice(1);
        // Only add period if it doesn't already end with punctuation
        if (!/[.!?]$/.test(cleanLine)) {
          cleanLine += '.';
        }

        li.textContent = cleanLine;
        ol.appendChild(li);
      });
    } else {
      // For recipes that are just one big block of text

      // Try to find numbered instructions within the text - improved pattern
      const numberedInstructionPattern = /(\d+)[.)-]\s+([^]*?)(?=\d+[.)-]\s+|$)/g;
      const numberedMatches = Array.from(raw.matchAll(numberedInstructionPattern));

      if (numberedMatches.length > 0) {
        // Process numbered instructions
        numberedMatches.forEach((match) => {
          let instruction = match[2].trim();

          // Clean up the instruction text
          instruction = instruction.replace(/\s+/g, ' ').trim();

          // Ensure proper capitalization and punctuation
          if (instruction.length > 0) {
            instruction = instruction.charAt(0).toUpperCase() + instruction.slice(1);
            if (!/[.!?]$/.test(instruction)) {
              instruction += '.';
            }
          }

          const li = document.createElement("li");
          li.textContent = instruction;
          ol.appendChild(li);
        });
      } else {
        // Last resort: just split by sentences

        // Improved sentence splitting - handles periods in measurements (e.g., "1.5 cups")
        const sentences = raw
          // Replace periods in common measurements to avoid splitting
          .replace(/(\d+)\.(\d+)/g, '$1DECIMAL$2')
          // Now split by actual sentence endings
          .match(/[^.!?]+[.!?]+/g) || [raw];

        sentences.forEach((sentence) => {
          // Restore decimal points
          let trimmed = sentence.replace(/DECIMAL/g, '.').trim();

          if (trimmed.length > 0) {
            const li = document.createElement("li");
            // Ensure first letter is capital
            const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
            li.textContent = formatted;
            ol.appendChild(li);
          }
        });
      }
    }

    // swap out the old <p> placeholder for our new list
    var sec = document.querySelector(".instructions-section");
    var oldP = sec.querySelector("p");
    if (oldP) sec.removeChild(oldP);
    sec.appendChild(ol);

    // Add CSS to improve spacing between instruction items
    const style = document.createElement('style');
    style.textContent = `
      .instructions-list li {
        margin-bottom: 15px;
        line-height: 1.6;
      }
    `;
    document.head.appendChild(style);

    // update the count to the actual number of steps
    document.querySelectorAll(".info-content")[1].textContent = ol.children.length;

    // Update recipe stats
    // Count ingredients
    let ingredientCount = 0;
    for (let i = 1; i <= 20; i++) {
      if (recipe[`strIngredient${i}`] && recipe[`strIngredient${i}`].trim() !== '') {
        ingredientCount++;
      }
    }

    // Count instructions (use the number of list items)
    const instructionCount = ol.children.length;

    // Update the stats in the UI
    document.querySelectorAll('.recipe-stat-item').forEach((statItem) => {
      const statLabel = statItem.querySelector('.stat-label').textContent.trim().toLowerCase();
      const statCountElement = statItem.querySelector('.stat-count');

      if (statLabel === 'ingredients') {
        statCountElement.textContent = ingredientCount;
      } else if (statLabel === 'instructions') {
        statCountElement.textContent = instructionCount;
      } else if (statLabel === 'cuisine') {
        statCountElement.textContent = recipe.strArea;
      } else if (statLabel === 'category') {
        statCountElement.textContent = recipe.strCategory;
      }
    });
  }
});
