/* global google */

// Store locator functionality
let map;
let userLocation;
let markers = [];
let allStores = []; // Store all stores for combined sorting

// Convert degrees to radians
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Calculate distance between two points in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2))
    * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return Math.round(d * 10) / 10; // Round to 1dp
}

// Show error message to user
function showError(message) {
  const errorDiv = document.getElementById('map-error');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }
}

// Handle geolocation errors
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  const content = browserHasGeolocation
    ? 'Error: The Geolocation service failed.'
    : 'Error: Your browser doesn\'t support geolocation.';

  showError(content);
}

// Helper function to determine if a place is open
function determineIfOpen(currentHours, openingHours) {
  try {
    // First try current_opening_hours.open_now as it's most reliable
    if (currentHours && typeof currentHours.open_now === 'boolean') {
      return currentHours.open_now;
    }

    // Then try opening_hours.isOpen()
    if (openingHours && typeof openingHours.isOpen === 'function') {
      const isOpen = openingHours.isOpen();
      // Only use isOpen() result if it's a boolean
      if (typeof isOpen === 'boolean') {
        return isOpen;
      }
    }

    // Try to use periods as a last resort
    if (currentHours && Array.isArray(currentHours.periods)) {
      const now = new Date();
      const day = now.getDay();
      const minutes = now.getHours() * 60 + now.getMinutes();

      // Find a period that matches current day and time
      const todayPeriod = currentHours.periods.find((period) => {
        if (!period.open || !period.close) return false;

        const openDay = period.open.day;
        const closeDay = period.close.day;
        const openTime = period.open.hours * 60 + (period.open.minutes || 0);
        const closeTime = period.close.hours * 60 + (period.close.minutes || 0);

        if (openDay === day && closeDay === day) {
          // Same day period
          return minutes >= openTime && minutes < closeTime;
        }
        if (openDay === day && closeDay === (day + 1) % 7) {
          // Overnight period
          return minutes >= openTime || minutes < closeTime;
        }
        return false;
      });

      return !!todayPeriod;
    }

    // If all methods fail, default to false
    return false;

  } catch (e) {
    return false;
  }
}

// Get opening hours status safely
function getOpeningHoursStatus(placeDetails) {
  try {
    // Default status
    let status = {
      isOpen: false,
      text: 'Hours not available'
    };

    // Get both hours objects
    const openingHours = placeDetails.opening_hours;
    const currentHours = placeDetails.current_opening_hours;

    // Use currentHours for text/periods
    const hours = currentHours || openingHours;
    if (!hours) {
      return status;
    }

    // Get today's hours
    const today = new Date().getDay();
    const weekdayText = hours.weekday_text;

    if (!weekdayText || !weekdayText[today]) {
      // Just use open status without time range
      const isOpen = determineIfOpen(currentHours, openingHours);
      return {
        isOpen: isOpen,
        text: isOpen ? 'Open Now' : 'Closed'
      };
    }

    // Get the hours string for today
    const todayHours = weekdayText[today];

    const [, timeRange] = todayHours.split(': ');
    if (!timeRange) {
      return status;
    }

    // Handle special cases in the time range
    const lowerTimeRange = timeRange.toLowerCase();
    if (lowerTimeRange.includes('closed')) {
      return {
        isOpen: false,
        text: `Closed - ${timeRange}`
      };
    }
    if (lowerTimeRange.includes('24 hours') || lowerTimeRange.includes('24/7')) {
      return {
        isOpen: true,
        text: 'Open 24 Hours'
      };
    }

    // Determine if the place is open
    const isOpen = determineIfOpen(currentHours, openingHours);

    // Return the status with the time range
    return {
      isOpen: isOpen,
      text: isOpen ? `Open Now - ${timeRange}` : `Closed - ${timeRange}`
    };

  } catch (e) {
    return {
      isOpen: false,
      text: 'Hours not available'
    };
  }
}

// Update the list of stores in the sidebar
function updateStoreList(stores) {
  const listContainer = document.getElementById('store-list');
  if (!listContainer) return;

  // Clear existing stores
  listContainer.innerHTML = '';

  stores.forEach((store) => {
    // First create and add the basic store element
    const storeElement = document.createElement('div');
    storeElement.className = 'store-item';
    storeElement.innerHTML = `
      <h4>${store.name}</h4>
      <p>${store.vicinity}</p>
      <p><strong>${store.distance} km away</strong></p>
      <p>Rating: ${store.rating ? store.rating + '/5.0' : 'N/A'}</p>
      <p class="hours-status">Checking hours...</p>
      <a href="https://www.google.com/maps/dir/?api=1&destination=${store.geometry.location.lat()},${store.geometry.location.lng()}"
         target="_blank" class="directions-link">Get Directions</a>
    `;

    storeElement.addEventListener('click', () => {
      map.setCenter(store.geometry.location);
      map.setZoom(15);
    });

    listContainer.appendChild(storeElement);

    // Then fetch and update the opening hours
    const service = new google.maps.places.PlacesService(map);
    service.getDetails({
      placeId: store.place_id,
      fields: [
        'name',
        'opening_hours',
        'current_opening_hours',
        'business_status'
      ]
    }, (placeDetails, status) => {
      const hoursElement = storeElement.querySelector('.hours-status');
      if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
        const openStatus = getOpeningHoursStatus(placeDetails);
        hoursElement.className = `hours-status ${openStatus.isOpen ? 'open' : 'closed'}`;
        hoursElement.textContent = openStatus.text;
      } else {
        hoursElement.textContent = 'Hours not available';
      }
    });
  });
}

// Create a marker for each store
function createMarker(place, brand) {
  // Create a canvas element to make a circular icon
  const canvas = document.createElement('canvas');
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Draw circular background
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
  ctx.fillStyle = 'white';
  ctx.fill();

  // Load the store logo
  const img = new Image();
  img.onload = function () {
    // Draw the image inside the circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(img, 2, 2, size - 4, size - 4);
    ctx.restore();

    // Create marker with the circular icon
    const marker = new google.maps.Marker({
      map: map,
      position: place.geometry.location,
      title: place.name,
      icon: {
        url: canvas.toDataURL(),
        scaledSize: new google.maps.Size(32, 32),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(16, 16)
      }
    });

    markers.push(marker);

    // Create info window with basic info first
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div class="store-info">
          <h3>${place.name}</h3>
          <p>${place.vicinity}</p>
          <p><strong>${place.distance} km away</strong></p>
          <p>Rating: ${place.rating ? place.rating + '/5' : 'N/A'}</p>
          <p class="hours-status">Checking hours...</p>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}"
             target="_blank" class="directions-link">Get Directions</a>
        </div>
      `
    });

    marker.addListener('click', () => {
      // Update hours when info window is opened
      const service = new google.maps.places.PlacesService(map);
      service.getDetails({
        placeId: place.place_id,
        fields: [
          'name',
          'opening_hours',
          'current_opening_hours',
          'business_status'
        ]
      }, (placeDetails, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
          const openStatus = getOpeningHoursStatus(placeDetails);
          const content = `
            <div class="store-info">
              <h3>${place.name}</h3>
              <p>${place.vicinity}</p>
              <p><strong>${place.distance} km away</strong></p>
              <p>Rating: ${place.rating ? place.rating + '/5' : 'N/A'}</p>
              <p class="${openStatus.isOpen ? 'open' : 'closed'}">${openStatus.text}</p>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}"
                 target="_blank" class="directions-link">Get Directions</a>
            </div>
          `;
          infoWindow.setContent(content);
        } else {
          infoWindow.setContent(`
            <div class="store-info">
              <h3>${place.name}</h3>
              <p>${place.vicinity}</p>
              <p><strong>${place.distance} km away</strong></p>
              <p>Rating: ${place.rating ? place.rating + '/5' : 'N/A'}</p>
              <p class="hours-status">Hours not available</p>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${place.geometry.location.lat()},${place.geometry.location.lng()}"
                 target="_blank" class="directions-link">Get Directions</a>
            </div>
          `);
        }
      });
      infoWindow.open(map, marker);
    });
  };
  img.src = brand === 'Coles' ? 'coles.jpg' : 'woolworths.jpg';
}

// Find nearby Coles and Woolworths stores
function findNearbyStores() {
  if (!userLocation) return;

  // Reset stores array and markers before new search
  allStores = [];
  markers.forEach((marker) => marker.setMap(null));
  markers = [];

  const service = new google.maps.places.PlacesService(map);

  // Create promises for both store searches
  const searchPromise = (request) => new Promise((resolve) => {
    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        resolve(results);
      } else {
        resolve([]);
      }
    });
  });

  // Search parameters - using rankBy.DISTANCE requires removing radius
  const colesRequest = {
    location: userLocation,
    keyword: 'Coles Supermarket',
    type: 'supermarket',
    rankBy: google.maps.places.RankBy.DISTANCE
  };

  const woolworthsRequest = {
    location: userLocation,
    name: 'Woolworths',
    type: 'supermarket',
    rankBy: google.maps.places.RankBy.DISTANCE
  };

  // Wait for both searches to complete before processing
  Promise.all([
    searchPromise(colesRequest),
    searchPromise(woolworthsRequest)
  ]).then(([colesResults, woolworthsResults]) => {
    // Process Coles results
    const colesStores = colesResults
      .filter((place) => {
        const name = place.name.toLowerCase();
        return name.includes('coles') && !name.includes('express');
      })
      .map((place, index) => ({
        ...place,
        brand: 'Coles',
        originalIndex: index,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          place.geometry.location.lat(),
          place.geometry.location.lng()
        )
      }));

    // Process Woolworths results - keep original order from Places API
    const woolworthsStores = woolworthsResults
      .filter((place) => {
        const name = place.name.toLowerCase();
        return name.includes('woolworths')
          && !name.includes('petrol')
          && !name.includes('metro')
          && !name.includes('fuel');
      })
      .map((place, index) => ({
        ...place,
        brand: 'Woolworths',
        originalIndex: index,
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          place.geometry.location.lat(),
          place.geometry.location.lng()
        )
      }));

    // Merge stores maintaining their original distance-based order
    allStores = [];
    let colesIndex = 0;
    let woolworthsIndex = 0;

    while (colesIndex < colesStores.length || woolworthsIndex < woolworthsStores.length) {
      const nextColes = colesStores[colesIndex];
      const nextWoolworths = woolworthsStores[woolworthsIndex];

      // Compare distances for merging
      if (!nextWoolworths || (nextColes && nextColes.distance <= nextWoolworths.distance)) {
        if (nextColes) {
          allStores.push(nextColes);
          colesIndex++;
        }
      } else {
        allStores.push(nextWoolworths);
        woolworthsIndex++;
      }
    }

    // Remove any duplicates while maintaining order
    allStores = allStores.filter((store, index, self) => index
      === self.findIndex((s) => s.vicinity === store.vicinity && s.name === store.name));

    // Create markers and update list
    allStores.forEach((place) => {
      createMarker(place, place.brand);
    });

    // Update the list and show error if no stores found
    if (allStores.length === 0) {
      const errorDiv = document.getElementById('map-error');
      if (errorDiv) {
        errorDiv.textContent = 'No supermarkets found in your area. Try a different location.';
        errorDiv.style.display = 'block';
      }
    }
    updateStoreList(allStores);
  });
}

// Initialize the map
window.initMap = function () {
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    showError('Map container not found');
    return;
  }

  // Remove loading message if it exists
  const loadingMsg = mapContainer.querySelector('.map-loading');
  if (loadingMsg) {
    loadingMsg.remove();
  }

  try {
    map = new google.maps.Map(mapContainer, {
      zoom: 13,
      center: { lat: -34.9285, lng: 138.6007 }, // Default to Adelaide
      styles: [
        {
          featureType: 'poi.business',
          stylers: [{ visibility: 'off' }] // Hide business POIs except those we add
        }
      ]
    });

    // Create info window for markers
    const infoWindow = new google.maps.InfoWindow();

    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Center map on user's location
          map.setCenter(userLocation);

          // Add marker for user's location and store reference
          markers.push(new google.maps.Marker({
            position: userLocation,
            map: map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            },
            title: 'Your Location'
          }));

          // Search for nearby stores
          findNearbyStores();
        },
        () => {
          handleLocationError(true, infoWindow, map.getCenter());
        }
      );
    } else {
      handleLocationError(false, infoWindow, map.getCenter());
    }
  } catch (error) {
    showError('Failed to load the map. Please try refreshing the page.');
  }
};
