// API config
const API_KEY = '3bad5d4e281dd990377c1ce553f86b54';
const API_URL = 'http://api.aviationstack.com/v1/flights';

// DOM elements
const flightInput = document.getElementById('flight-input');
const searchBtn = document.getElementById('search-btn');
const resultSection = document.getElementById('flight-result');
const favoritesList = document.getElementById('favorites-list');

// Current flight data (used when saving to favorites)
let currentFlight = null;

// Load favorites when page opens
document.addEventListener('DOMContentLoaded', loadFavorites);

// Search button click
searchBtn.addEventListener('click', searchFlight);

// Also search when pressing Enter
flightInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchFlight();
});

// Main search function
async function searchFlight() {
    const flightCode = flightInput.value.trim().toUpperCase();
    
    if (!flightCode) {
        alert('Please enter a flight number');
        return;
    }

    // Show loading state
    resultSection.innerHTML = '<p>Searching...</p>';
    resultSection.classList.add('visible');

    try {
        // Call the API
        const response = await fetch(`${API_URL}?access_key=${API_KEY}&flight_iata=${flightCode}`);
        const data = await response.json();

        // Check if we got results
        if (data.data && data.data.length > 0) {
            currentFlight = data.data[0];
            displayFlight(currentFlight);
        } else {
            resultSection.innerHTML = '<p>No flight found. Check the flight number.</p>';
        }
    } catch (error) {
        console.error('API error:', error);
        resultSection.innerHTML = '<p>Error fetching data. Try again.</p>';
    }
}

// Display flight info on the page
function displayFlight(flight) {
    const status = flight.flight_status || 'unknown';
    const airline = flight.airline?.name || 'Unknown airline';
    const flightNumber = flight.flight?.iata || 'N/A';
    const depAirport = flight.departure?.airport || 'N/A';
    const depCode = flight.departure?.iata || '';
    const arrAirport = flight.arrival?.airport || 'N/A';
    const arrCode = flight.arrival?.iata || '';
    const scheduled = flight.departure?.scheduled || 'N/A';
    const delay = flight.departure?.delay || 0;
    const aircraft = flight.aircraft?.iata || 'N/A';

    // Format departure time nicely
    let depTime = 'N/A';
    if (scheduled !== 'N/A') {
        const date = new Date(scheduled);
        depTime = date.toLocaleString();
    }

    // Pick status CSS class
    let statusClass = 'status-scheduled';
    if (status === 'active') statusClass = 'status-active';
    if (status === 'landed') statusClass = 'status-landed';
    if (status === 'cancelled') statusClass = 'status-cancelled';
    if (delay > 15) statusClass = 'status-delayed';

    // Build the HTML
    resultSection.innerHTML = `
        <h3>${airline} — ${flightNumber}</h3>
        <p><strong>Status:</strong> <span class="${statusClass}">${status.toUpperCase()}</span></p>
        <p><strong>Aircraft:</strong> ${aircraft}</p>
        <p><strong>From:</strong> ${depAirport} (${depCode})</p>
        <p><strong>To:</strong> ${arrAirport} (${arrCode})</p>
        <p><strong>Departure:</strong> ${depTime}</p>
        <p><strong>Delay:</strong> ${delay} min</p>
        <button class="save-btn" onclick="saveFavorite()">Save to Favorites</button>
    `;
    resultSection.classList.add('visible');
}

// Save current flight to favorites
function saveFavorite() {
    if (!currentFlight) return;

    const flightCode = currentFlight.flight?.iata;
    if (!flightCode) return;

    // Get existing favorites from LocalStorage
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    // Check if already saved
    if (favorites.includes(flightCode)) {
        alert('Already in favorites');
        return;
    }

    // Add and save
    favorites.push(flightCode);
    localStorage.setItem('favorites', JSON.stringify(favorites));

    loadFavorites();
}

// Load and display favorites from LocalStorage
function loadFavorites() {
    const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<li>No favorites yet</li>';
        return;
    }

    favoritesList.innerHTML = favorites.map(code => `
        <li>
            <span>${code}</span>
            <button class="remove-btn" onclick="removeFavorite('${code}')">Remove</button>
        </li>
    `).join('');
}

// Remove a flight from favorites
function removeFavorite(code) {
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    favorites = favorites.filter(f => f !== code);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
}