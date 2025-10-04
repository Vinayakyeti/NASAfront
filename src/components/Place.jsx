import React, { useState } from "react";

const apiKey = "84254d5ce02335eb1d0ed7c9393e2ebb";

export default function Place({ onWeatherFetch }) {
  const [placeName, setPlaceName] = useState("");
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
      setPlaceName("");
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
