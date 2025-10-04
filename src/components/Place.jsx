import React, { useState } from "react";

const apiKey = "84254d5ce02335eb1d0ed7c9393e2ebb";

export default function Place({ onWeatherFetch }) {
  const [placeName, setPlaceName] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleSearch = async (searchQuery = placeName) => {
    if (!searchQuery.trim()) {
      setError("Please enter a city or place name");
      return;
    }

    setLoading(true);
    setError("");
    setSuggestions([]);

    try {
      // Construct date from dropdowns if all are selected
      let forecastDate = null;
      if (selectedYear && selectedMonth && selectedDay && selectedTime) {
        forecastDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`;
      }
      
      // If date and time are provided, use forecast API
      if (forecastDate && selectedTime) {
        const targetDateTime = new Date(`${forecastDate}T${selectedTime}`);
        const currentTime = new Date();
        
        if (targetDateTime < currentTime) {
          throw new Error("Cannot fetch forecast for past dates");
        }

        const forecastResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${searchQuery}&appid=${apiKey}&units=metric`
        );

        if (!forecastResponse.ok) {
          throw new Error("Location not found");
        }

        const forecastData = await forecastResponse.json();
        
        const targetTimestamp = targetDateTime.getTime();
        let closestForecast = forecastData.list[0];
        let smallestDiff = Math.abs(new Date(closestForecast.dt * 1000).getTime() - targetTimestamp);

        forecastData.list.forEach(item => {
          const itemTimestamp = new Date(item.dt * 1000).getTime();
          const diff = Math.abs(itemTimestamp - targetTimestamp);
          if (diff < smallestDiff) {
            smallestDiff = diff;
            closestForecast = item;
          }
        });

        const weatherData = {
          temp: closestForecast.main.temp,
          feels_like: closestForecast.main.feels_like,
          humidity: closestForecast.main.humidity,
          wind: closestForecast.wind.speed,
          description: closestForecast.weather[0].description,
          icon: closestForecast.weather[0].icon,
          location: forecastData.city.name || 'Unknown Location',
          lat: forecastData.city.coord.lat,
          lng: forecastData.city.coord.lon,
          rain: closestForecast.rain ? (closestForecast.rain['3h'] || 0) : 0,
          clouds: closestForecast.clouds?.all || 0,
          visibility: closestForecast.visibility || 0,
          forecastTime: new Date(closestForecast.dt * 1000).toLocaleString()
        };

        onWeatherFetch(weatherData);
      } else {
        // Use current weather API
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${searchQuery}&appid=${apiKey}&units=metric`
        );

        if (!response.ok) {
          throw new Error("Location not found");
        }

        const data = await response.json();
      
        const weatherData = {
          temp: data.main.temp,
          feels_like: data.main.feels_like,
          humidity: data.main.humidity,
          wind: data.wind.speed,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          location: data.name || 'Unknown Location',
          lat: data.coord.lat,
          lng: data.coord.lon,
          rain: data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) : 0,
          clouds: data.clouds?.all || 0,
          visibility: data.visibility || 0
        };

        onWeatherFetch(weatherData);
      }
      
      setPlaceName("");
      setSelectedDay("");
      setSelectedMonth("");
      setSelectedYear("");
      setSelectedTime("");
    } catch (err) {
      setError(err.message || "Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const popularCities = [
    "New York", "London", "Tokyo", "Paris", "Dubai",
    "Singapore", "Sydney", "Mumbai", "Los Angeles", "Toronto"
  ];

  return (
    <div className="weather-search-panel">
      <div className="search-panel-content">
        <div className="search-header">
          <div className="search-icon-large">🏙️</div>
          <h2>Search by Place</h2>
          <p className="search-subtitle">Enter a city or location name</p>
        </div>

        <div className="search-input-container">
          <input
            type="text"
            className="ios-search-input"
            placeholder="e.g., New York, London, Tokyo"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
          />
          <button 
            className="ios-search-button" 
            onClick={() => handleSearch()}
            disabled={loading || !placeName.trim()}
          >
            {loading ? (
              <div className="loading-spinner"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            )}
          </button>
        </div>

        <div className="datetime-section">
          <label className="input-label">Forecast Date & Time (Optional)</label>
          <div className="datetime-selectors">
            <select 
              className="datetime-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              disabled={loading}
            >
              <option value="">Month</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>

            <select 
              className="datetime-select"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              disabled={loading}
            >
              <option value="">Day</option>
              {[...Array(31)].map((_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </select>

            <select 
              className="datetime-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={loading}
            >
              <option value="">Year</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>

            <input
              type="time"
              className="datetime-time-input"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={loading}
              placeholder="Time"
            />
          </div>
          
          {/* See Forecast Button */}
          <button 
            className="forecast-btn"
            disabled={!selectedMonth || !selectedDay || !selectedYear || !selectedTime || loading}
            style={{ marginTop: '12px' }}
          >
            {selectedMonth && selectedDay && selectedYear && selectedTime ? '✓ Click Search to Get Forecast' : '📅 Select Date & Time First'}
          </button>
        </div>

        {selectedYear && selectedMonth && selectedDay && selectedTime ? (
          <p className="datetime-hint active-forecast">
            ✓ Will show forecast for {new Date(`${selectedYear}-${selectedMonth}-${selectedDay}`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {selectedTime}
          </p>
        ) : (
          <p className="datetime-hint">
            💡 Select month, day, year, and time for weather forecast (up to 5 days ahead)
          </p>
        )}

        {error && (
          <div className="error-message">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        <div className="search-examples">
          <p className="examples-title">Popular Cities:</p>
          <div className="city-grid">
            {popularCities.map((city) => (
              <button
                key={city}
                className="city-chip"
                onClick={() => handleSearch(city)}
                disabled={loading}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
