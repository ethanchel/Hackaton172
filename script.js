// ============================================
// API CONFIG
// ============================================
var API_KEY = '3bad5d4e281dd990377c1ce553f86b54';
var API_URL = 'http://api.aviationstack.com/v1/flights';

// ============================================
// DOM ELEMENTS
// ============================================
var flightInput = document.getElementById('flight-input');
var searchBtn = document.getElementById('search-btn');
var resultSection = document.getElementById('flight-result');
var favoritesList = document.getElementById('favorites-list');

// Current flight data
var currentFlight = null;

// Aircraft code to name mapping
var aircraftNames = {
    'A21N': 'Airbus A321neo', 'A320': 'Airbus A320', 'A321': 'Airbus A321',
    'A319': 'Airbus A319', 'A333': 'Airbus A330-300', 'A359': 'Airbus A350-900',
    'A388': 'Airbus A380-800', 'B738': 'Boeing 737-800', 'B739': 'Boeing 737-900',
    'B77W': 'Boeing 777-300ER', 'B789': 'Boeing 787-9', 'B788': 'Boeing 787-8',
    'E190': 'Embraer E190', 'E195': 'Embraer E195'
};

// Timezone offsets from UTC
var timezoneOffsets = {
    'Asia/Jerusalem': 2, 'Asia/Dubai': 4, 'Asia/Abu_Dhabi': 4,
    'Europe/Paris': 1, 'Europe/London': 0, 'Europe/Berlin': 1,
    'America/New_York': -5, 'America/Los_Angeles': -8, 'Asia/Tokyo': 9
};

// User timezone offset
var USER_OFFSET = 2;

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', loadFavorites);
searchBtn.addEventListener('click', searchFlight);
flightInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchFlight();
});

// ============================================
// SEARCH FLIGHT - Fetch data from API
// ============================================
async function searchFlight(flightCode) {
    var code = flightCode || flightInput.value.trim().toUpperCase();
    
    if (!code) {
        alert('Please enter a flight number');
        return;
    }

    flightInput.value = code;
    resultSection.innerHTML = '<div class="loader"><div class="spinner"></div></div>';
    resultSection.classList.add('visible');

    try {
        var response = await fetch(API_URL + '?access_key=' + API_KEY + '&flight_iata=' + code);
        var data = await response.json();

        if (data.data && data.data.length > 0) {
            currentFlight = data.data[0];
            displayFlight(currentFlight);
        } else {
            resultSection.innerHTML = '<div class="error-message"><p>No flight found for "' + code + '"</p></div>';
        }
    } catch (error) {
        console.error('API error:', error);
        resultSection.innerHTML = '<div class="error-message"><p>Connection error. Try again.</p></div>';
    }
}

// ============================================
// TIME FORMATTING
// ============================================

// Format airport local time: "2026-01-22T19:30:00" -> "22 Jan — 19:30"
function formatAirportTime(dateString) {
    if (!dateString) return '--:--';
    
    var parts = dateString.split('T');
    var datePieces = parts[0].split('-');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return datePieces[2] + ' ' + months[parseInt(datePieces[1]) - 1] + ' — ' + parts[1].substring(0, 5);
}

// Convert to user's local time
function formatUserTime(dateString, airportTimezone) {
    if (!dateString) return '--:--';
    
    var airportOffset = timezoneOffsets[airportTimezone] || USER_OFFSET;
    var diff = USER_OFFSET - airportOffset;
    
    var parts = dateString.split('T');
    var datePieces = parts[0].split('-');
    var day = parseInt(datePieces[2]);
    var monthNum = parseInt(datePieces[1]);
    var hour = parseInt(parts[1].substring(0, 2)) + diff;
    var minute = parts[1].substring(3, 5);
    
    // Handle day change
    if (hour >= 24) { hour -= 24; day += 1; }
    if (hour < 0) { hour += 24; day -= 1; }
    
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var hourStr = hour < 10 ? '0' + hour : hour.toString();
    
    return day + ' ' + months[monthNum - 1] + ' — ' + hourStr + ':' + minute;
}

// Get city name from timezone: "Asia/Jerusalem" -> "Jerusalem"
function getCityFromTimezone(tz) {
    if (!tz) return 'Local';
    var city = tz.split('/').pop();
    return city.replace(/_/g, ' ');
}

// Get aircraft full name from code
function getAircraftName(code) {
    return aircraftNames[code] || code || 'Unknown';
}

// ============================================
// DISPLAY FLIGHT INFO
// ============================================
function displayFlight(flight) {
    // Get data with fallbacks
    var status = flight.flight_status || 'unknown';
    var airline = (flight.airline && flight.airline.name) || 'Unknown';
    var flightNum = (flight.flight && flight.flight.iata) || 'N/A';
    
    var dep = flight.departure || {};
    var arr = flight.arrival || {};
    var aircraft = flight.aircraft || {};
    var live = flight.live || {};
    
    // Status class
    var statusClass = 'status-scheduled';
    if (status === 'active') statusClass = 'status-active';
    if (status === 'landed') statusClass = 'status-landed';
    if (status === 'cancelled') statusClass = 'status-cancelled';
    if (dep.delay > 15) statusClass = 'status-delayed';
    
    var depCity = getCityFromTimezone(dep.timezone);
    var arrCity = getCityFromTimezone(arr.timezone);

    // Build HTML
    var html = '<h3>✈️ ' + airline + ' — ' + flightNum + '</h3>';
    
    // Status badge
    var delayText = dep.delay > 0 ? ' (+' + dep.delay + ' min)' : '';
    html += '<p><span class="status-badge ' + statusClass + '">' + status.toUpperCase() + delayText + '</span></p>';

    // Live tracking (if flight is active)
    if (live.latitude && status === 'active') {
        var alt = live.altitude ? Math.round(live.altitude).toLocaleString() + ' m' : 'N/A';
        var spd = live.speed_horizontal ? Math.round(live.speed_horizontal) + ' km/h' : 'N/A';
        html += '<div class="live-indicator"><div class="live-dot"></div><div class="live-data">';
        html += '<span><strong>Live Tracking</strong></span>';
        html += '<span>Altitude: <strong>' + alt + '</strong></span>';
        html += '<span>Speed: <strong>' + spd + '</strong></span>';
        html += '</div></div>';
    }

    // Flight info grid
    html += '<div class="flight-grid">';
    
    // From/To
    html += '<div class="info-box"><div class="label">From</div><div class="value">' + (dep.iata || '') + '</div><div class="label" style="margin-top:5px">' + (dep.airport || 'N/A') + '</div></div>';
    html += '<div class="info-box"><div class="label">To</div><div class="value">' + (arr.iata || '') + '</div><div class="label" style="margin-top:5px">' + (arr.airport || 'N/A') + '</div></div>';
    
    // Departure time
    html += '<div class="info-box"><div class="label">Departure (' + depCity + ')</div><div class="value">' + formatAirportTime(dep.scheduled) + '</div>';
    html += '<div class="label" style="margin-top:8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:8px;">Your time</div>';
    html += '<div class="value" style="font-size:1rem">' + formatUserTime(dep.scheduled, dep.timezone) + '</div></div>';
    
    // Arrival time
    html += '<div class="info-box"><div class="label">Arrival (' + arrCity + ')</div><div class="value">' + formatAirportTime(arr.scheduled) + '</div>';
    html += '<div class="label" style="margin-top:8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:8px;">Your time</div>';
    html += '<div class="value" style="font-size:1rem">' + formatUserTime(arr.scheduled, arr.timezone) + '</div></div>';
    
    // Terminal/Gate
    html += '<div class="info-box"><div class="label">Departure Terminal / Gate</div><div class="value">T' + (dep.terminal || '-') + ' / ' + (dep.gate || 'N/A') + '</div>';
    html += '<div class="label" style="margin-top:8px">Arrival Terminal / Gate</div><div class="value" style="font-size:1rem">T' + (arr.terminal || '-') + ' / ' + (arr.gate || 'N/A') + '</div></div>';
    
    // Aircraft
    var aircraftName = getAircraftName(aircraft.iata);
    var regDisplay = aircraft.registration ? '(' + aircraft.registration + ')' : '';
    html += '<div class="info-box"><div class="label">Aircraft</div><div class="value" style="font-size:1rem">' + aircraftName + '</div><div class="label" style="margin-top:3px">' + regDisplay + '</div></div>';
    
    html += '</div>'; // Close grid

    // Save button
    html += '<button class="save-btn" onclick="saveFavorite()">⭐ Save to Favorites</button>';

    resultSection.innerHTML = html;
    resultSection.classList.add('visible');
}

// ============================================
// FAVORITES - LocalStorage functions
// ============================================

function saveFavorite() {
    if (!currentFlight || !currentFlight.flight) return;
    
    var code = currentFlight.flight.iata;
    if (!code) return;

    var favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    
    if (favorites.indexOf(code) !== -1) {
        alert('Already in favorites');
        return;
    }

    favorites.push(code);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
}

function loadFavorites() {
    var favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<li class="no-favorites">No favorites yet</li>';
        return;
    }

    var html = '';
    for (var i = 0; i < favorites.length; i++) {
        var code = favorites[i];
        html += '<li onclick="searchFlight(\'' + code + '\')"><span>✈️ ' + code + '</span>';
        html += '<button class="remove-btn" onclick="event.stopPropagation(); removeFavorite(\'' + code + '\')">Remove</button></li>';
    }
    favoritesList.innerHTML = html;
}

function removeFavorite(code) {
    var favorites = JSON.parse(localStorage.getItem('favorites')) || [];
    var newFavorites = [];
    
    for (var i = 0; i < favorites.length; i++) {
        if (favorites[i] !== code) newFavorites.push(favorites[i]);
    }
    
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    loadFavorites();
}