import React, { useState } from "react";

const apiKey = "84254d5ce02335eb1d0ed7c9393e2ebb";

export default function Pin({ onWeatherFetch }) {
  const [pinCode, setPinCode] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!pinCode.trim()) {
      setError("Please enter a PIN/ZIP code");
      return;
    }

    if (!countryCode.trim()) {
      setError("Please select a country code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?zip=${pinCode},${countryCode}&appid=${apiKey}&units=metric`
      );

      if (!response.ok) {
        throw new Error("PIN code not found for this country");
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
      setPinCode("");
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

  const popularCountries = [
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "IN", name: "India" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "JP", name: "Japan" },
  ];

  return (
    <div className="weather-search-panel">
      <div className="search-panel-content">
        <div className="search-header">
          <div className="search-icon-large">📍</div>
          <h2>Search by PIN Code</h2>
          <p className="search-subtitle">Enter a ZIP or postal code with country</p>
        </div>

        <div className="country-selector">
          <label className="input-label">Country</label>
          <select 
            className="country-select"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            disabled={loading}
          >
            {popularCountries.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
        </div>

        <div className="input-group-vertical">
          <label className="input-label">PIN/ZIP Code</label>
          <div className="search-input-container">
            <input
              type="text"
              className="ios-search-input"
              placeholder="e.g., 10001, SW1A 1AA, 400001"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
            />
            <button 
              className="ios-search-button" 
              onClick={handleSearch}
              disabled={loading || !pinCode.trim()}
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
          <p className="examples-title">Examples:</p>
          <div className="example-chips">
            <span className="example-chip" onClick={() => { setPinCode("10001"); setCountryCode("US"); }}>
              10001, US
            </span>
            <span className="example-chip" onClick={() => { setPinCode("90210"); setCountryCode("US"); }}>
              90210, US
            </span>
            <span className="example-chip" onClick={() => { setPinCode("400001"); setCountryCode("IN"); }}>
              400001, IN
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
