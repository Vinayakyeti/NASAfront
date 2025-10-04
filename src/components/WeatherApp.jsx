import React, { useState, useEffect, useRef } from "react";

const apiKey = "84254d5ce02335eb1d0ed7c9393e2ebb";
const mapTilerApiKey = "tqwKGpwhSpdYZsUKY4nn";

export default function WeatherApp() {
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("");
  const [weatherData, setWeatherData] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
  const [areaMarkers, setAreaMarkers] = useState([]);
  const [areaPolygon, setAreaPolygon] = useState(null);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const markersArrayRef = useRef([]);
  const polygonLayerRef = useRef(null);

  const showLoading = () => setLoading(true);
  const hideLoading = () => setLoading(false);

  useEffect(() => {
    if (mapVisible && mapContainer.current && !mapRef.current) {
      setMapLoading(true);
      maptilersdk.config.apiKey = mapTilerApiKey;
      const map = new maptilersdk.Map({
        container: mapContainer.current,
        style: maptilersdk.MapStyle.STREETS,
        center: [0, 0],
        zoom: 2,
      });

      map.on("load", () => {
        setMapLoading(false);
        // Add a source and layer for the polygon
        map.addSource('area-polygon', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[]]
            }
          }
        });

        map.addLayer({
          id: 'area-fill',
          type: 'fill',
          source: 'area-polygon',
          paint: {
            'fill-color': '#4CAF50',
            'fill-opacity': 0.3
          }
        });

        map.addLayer({
          id: 'area-outline',
          type: 'line',
          source: 'area-polygon',
          paint: {
            'line-color': '#4CAF50',
            'line-width': 3,
            'line-dasharray': [2, 2]
          }
        });

        polygonLayerRef.current = map;
      });

      map.on("click", async (e) => {
        const { lng, lat } = e.lngLat;
        
        // Fetch temperature for this location
        let temperature = null;
        let pinColor = { start: '#ff6b6b', end: '#ee5a6f', pulse: 'rgba(255, 107, 107, 0.4)' }; // Default red
        
        try {
          const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
          );
          const data = await res.json();
          temperature = data.main.temp;
          
          // Determine color based on temperature
          if (temperature <= 0) {
            // Freezing - Ice Blue
            pinColor = { start: '#00d4ff', end: '#0099cc', pulse: 'rgba(0, 212, 255, 0.4)', name: 'Freezing' };
          } else if (temperature <= 10) {
            // Cold - Blue
            pinColor = { start: '#4a90e2', end: '#2e5c8a', pulse: 'rgba(74, 144, 226, 0.4)', name: 'Cold' };
          } else if (temperature <= 20) {
            // Cool - Light Blue/Cyan
            pinColor = { start: '#00bcd4', end: '#0097a7', pulse: 'rgba(0, 188, 212, 0.4)', name: 'Cool' };
          } else if (temperature <= 25) {
            // Mild - Green
            pinColor = { start: '#4caf50', end: '#2e7d32', pulse: 'rgba(76, 175, 80, 0.4)', name: 'Mild' };
          } else if (temperature <= 30) {
            // Warm - Orange
            pinColor = { start: '#ff9800', end: '#f57c00', pulse: 'rgba(255, 152, 0, 0.4)', name: 'Warm' };
          } else if (temperature <= 35) {
            // Hot - Red-Orange
            pinColor = { start: '#ff5722', end: '#d84315', pulse: 'rgba(255, 87, 34, 0.4)', name: 'Hot' };
          } else {
            // Very Hot - Deep Red
            pinColor = { start: '#d32f2f', end: '#b71c1c', pulse: 'rgba(211, 47, 47, 0.4)', name: 'Very Hot' };
          }
        } catch (err) {
          console.error('Failed to fetch temperature:', err);
        }
        
        const pinIndex = markersArrayRef.current.length;
        const tempDisplay = temperature !== null ? `${Math.round(temperature)}°C` : '...';
        
        // Create custom pin element with hand
        const customPin = document.createElement("div");
        customPin.className = "custom-map-pin";
        customPin.innerHTML = `
          <div class="hand-container">
            <svg class="hand-icon" width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
              <g class="hand-group">
                <!-- Palm -->
                <path d="M25 35 Q20 40 20 45 L20 50 Q20 52 22 52 L38 52 Q40 52 40 50 L40 45 Q40 40 35 35 Z" 
                      fill="#FFD4A3" stroke="#E0A878" stroke-width="1"/>
                <!-- Thumb -->
                <ellipse cx="22" cy="38" rx="4" ry="6" fill="#FFD4A3" stroke="#E0A878" stroke-width="1" transform="rotate(-30 22 38)"/>
                <!-- Fingers -->
                <rect x="24" y="28" width="4" height="12" rx="2" fill="#FFD4A3" stroke="#E0A878" stroke-width="1"/>
                <rect x="29" y="26" width="4" height="14" rx="2" fill="#FFD4A3" stroke="#E0A878" stroke-width="1"/>
                <rect x="34" y="28" width="4" height="12" rx="2" fill="#FFD4A3" stroke="#E0A878" stroke-width="1"/>
              </g>
            </svg>
          </div>
          <div class="pin-wrapper">
            <div class="pin-pulse" style="background: ${pinColor.pulse};"></div>
            <div class="temp-badge" style="background: linear-gradient(135deg, ${pinColor.start}, ${pinColor.end});">
              ${tempDisplay}
            </div>
            <svg class="pin-icon" width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="pinGradient${pinIndex}" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:${pinColor.start};stop-opacity:1" />
                  <stop offset="100%" style="stop-color:${pinColor.end};stop-opacity:1" />
                </linearGradient>
                <filter id="shadow${pinIndex}" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.5"/>
                  </feComponentTransfer>
                  <feMerge> 
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/> 
                  </feMerge>
                </filter>
              </defs>
              <path d="M20 0C11.716 0 5 6.716 5 15c0 8.284 15 35 15 35s15-26.716 15-35c0-8.284-6.716-15-15-15z" 
                    fill="url(#pinGradient${pinIndex})" 
                    filter="url(#shadow${pinIndex})"/>
              <circle cx="20" cy="15" r="6" fill="white" opacity="0.9"/>
              <circle cx="20" cy="15" r="3" fill="${pinColor.start}"/>
            </svg>
          </div>
        `;
        
        const marker = new maptilersdk.Marker({ 
          element: customPin,
          anchor: 'bottom'
        })
          .setLngLat([lng, lat])
          .addTo(map);

        markersArrayRef.current.push(marker);
        
        setAreaMarkers(prevMarkers => {
          const newMarkers = [...prevMarkers, { lng, lat }];
          
          // Update polygon
          if (newMarkers.length >= 3) {
            const coordinates = [...newMarkers.map(m => [m.lng, m.lat]), [newMarkers[0].lng, newMarkers[0].lat]];
            map.getSource('area-polygon').setData({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coordinates]
              }
            });
          }

          // Auto-fetch weather when 4th pin is placed
          if (newMarkers.length === 4) {
            setAutoFetching(true);
            setTimeout(() => {
              getAreaWeatherAuto(newMarkers);
            }, 800);
          }
          
          return newMarkers;
        });
      });

      mapRef.current = map;
    }
    
    // Cleanup when map is closed
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapVisible]);

  const getWeatherData = async (cityName) => {
    try {
      showLoading();
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}&units=metric`
      );
      if (!res.ok) throw new Error("City not found");
      const data = await res.json();
      setWeatherData(data);
      getForecast(data.coord.lat, data.coord.lon);
    } catch (err) {
      alert(err.message);
    } finally {
      hideLoading();
    }
  };

  const getWeatherByPincode = async (pin, countryCode = "") => {
    try {
      showLoading();
      const query = countryCode ? `${pin},${countryCode}` : pin;
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?zip=${query}&appid=${apiKey}&units=metric`
      );
      if (!res.ok) throw new Error("PIN/ZIP not found");
      const data = await res.json();
      setWeatherData(data);
      getForecast(data.coord.lat, data.coord.lon);
    } catch (err) {
      alert(err.message);
    } finally {
      hideLoading();
    }
  };

  const getWeatherDataByCoords = async (lat, lon) => {
    try {
      showLoading();
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
      );
      const data = await res.json();
      setWeatherData(data);
      getForecast(lat, lon);
    } catch {
      alert("Unable to retrieve weather data.");
    } finally {
      hideLoading();
    }
  };

  const getForecast = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=hourly,minutely&appid=${apiKey}&units=metric`
      );
      const data = await res.json();
      setForecast(data.daily.slice(1, 8));
    } catch (err) {
      console.error(err);
    }
  };

  const getAreaWeather = async () => {
    if (areaMarkers.length < 4) {
      alert("Please select at least 4 points to define an area!");
      return;
    }

    try {
      showLoading();
      const weatherPromises = areaMarkers.map(marker =>
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${marker.lat}&lon=${marker.lng}&appid=${apiKey}&units=metric`)
          .then(res => res.json())
      );

      const weatherResults = await Promise.all(weatherPromises);
      
      // Calculate average weather
      const avgTemp = weatherResults.reduce((sum, w) => sum + w.main.temp, 0) / weatherResults.length;
      const avgHumidity = weatherResults.reduce((sum, w) => sum + w.main.humidity, 0) / weatherResults.length;
      const avgPressure = weatherResults.reduce((sum, w) => sum + w.main.pressure, 0) / weatherResults.length;
      const avgWindSpeed = weatherResults.reduce((sum, w) => sum + w.wind.speed, 0) / weatherResults.length;
      const avgClouds = weatherResults.reduce((sum, w) => sum + w.clouds.all, 0) / weatherResults.length;

      // Get most common weather description
      const descriptions = weatherResults.map(w => w.weather[0].description);
      const mostCommon = descriptions.sort((a, b) =>
        descriptions.filter(v => v === a).length - descriptions.filter(v => v === b).length
      ).pop();

      const mostCommonIcon = weatherResults.find(w => w.weather[0].description === mostCommon).weather[0].icon;

      // Create averaged weather data
      const areaWeatherData = {
        name: `Selected Area (${areaMarkers.length} points)`,
        main: {
          temp: avgTemp,
          humidity: avgHumidity,
          pressure: avgPressure
        },
        weather: [{
          description: mostCommon,
          icon: mostCommonIcon
        }],
        wind: { speed: avgWindSpeed },
        clouds: { all: avgClouds }
      };

      setWeatherData(areaWeatherData);
      
      // Get forecast for center point
      const centerLat = areaMarkers.reduce((sum, m) => sum + m.lat, 0) / areaMarkers.length;
      const centerLng = areaMarkers.reduce((sum, m) => sum + m.lng, 0) / areaMarkers.length;
      getForecast(centerLat, centerLng);
      
      closeMap();
    } catch (err) {
      alert("Unable to retrieve area weather data.");
    } finally {
      hideLoading();
    }
  };

  const getAreaWeatherAuto = async (markers) => {
    if (markers.length < 4) {
      return;
    }

    try {
      showLoading();
      const weatherPromises = markers.map(marker =>
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${marker.lat}&lon=${marker.lng}&appid=${apiKey}&units=metric`)
          .then(res => res.json())
      );

      const weatherResults = await Promise.all(weatherPromises);
      
      // Calculate average weather
      const avgTemp = weatherResults.reduce((sum, w) => sum + w.main.temp, 0) / weatherResults.length;
      const avgHumidity = weatherResults.reduce((sum, w) => sum + w.main.humidity, 0) / weatherResults.length;
      const avgPressure = weatherResults.reduce((sum, w) => sum + w.main.pressure, 0) / weatherResults.length;
      const avgWindSpeed = weatherResults.reduce((sum, w) => sum + w.wind.speed, 0) / weatherResults.length;
      const avgClouds = weatherResults.reduce((sum, w) => sum + w.clouds.all, 0) / weatherResults.length;

      // Get most common weather description
      const descriptions = weatherResults.map(w => w.weather[0].description);
      const mostCommon = descriptions.sort((a, b) =>
        descriptions.filter(v => v === a).length - descriptions.filter(v => v === b).length
      ).pop();

      const mostCommonIcon = weatherResults.find(w => w.weather[0].description === mostCommon).weather[0].icon;

      // Create averaged weather data
      const areaWeatherData = {
        name: `Selected Area (${markers.length} points)`,
        main: {
          temp: avgTemp,
          humidity: avgHumidity,
          pressure: avgPressure
        },
        weather: [{
          description: mostCommon,
          icon: mostCommonIcon
        }],
        wind: { speed: avgWindSpeed },
        clouds: { all: avgClouds }
      };

      setWeatherData(areaWeatherData);
      
      // Get forecast for center point
      const centerLat = markers.reduce((sum, m) => sum + m.lat, 0) / markers.length;
      const centerLng = markers.reduce((sum, m) => sum + m.lng, 0) / markers.length;
      getForecast(centerLat, centerLng);
      
      setTimeout(() => {
        closeMap();
      }, 1000);
    } catch (err) {
      alert("Unable to retrieve area weather data.");
      setAutoFetching(false);
    } finally {
      hideLoading();
    }
  };

  const clearAreaSelection = () => {
    // Remove all markers
    markersArrayRef.current.forEach(marker => marker.remove());
    markersArrayRef.current = [];
    setAreaMarkers([]);

    // Clear polygon
    if (mapRef.current && mapRef.current.getSource('area-polygon')) {
      mapRef.current.getSource('area-polygon').setData({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[]]
        }
      });
    }
  };

  const closeMap = () => {
    setMapVisible(false);
    setAutoFetching(false);
    // Map cleanup will happen in useEffect cleanup
  };

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => getWeatherDataByCoords(pos.coords.latitude, pos.coords.longitude),
        () => alert("Unable to retrieve your location.")
      );
    } else alert("Geolocation not supported");
  };

  return (
    <div>
      <div className="animated-background">
        <div className="gradient-overlay"></div>
        <div className="moving-clouds">
          <div className="cloud cloud-1"></div>
          <div className="cloud cloud-2"></div>
          <div className="cloud cloud-3"></div>
          <div className="cloud cloud-4"></div>
        </div>
        <div className="stars-container">
          <div className="star"></div>
          <div className="star"></div>
          <div className="star"></div>
          <div className="star"></div>
          <div className="star"></div>
          <div className="star"></div>
          <div className="star"></div>
          <div className="star"></div>
        </div>
      </div>

      <div className="container">
        <h1>Weather App</h1>

        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city name"
        />
        <button onClick={() => (city ? getWeatherData(city) : alert("Enter a city"))}>
          Get Weather
        </button>
        <button onClick={handleLocation}>Use My Location</button>
        <button onClick={() => {
          clearAreaSelection();
          setMapVisible(true);
        }}>Select Area on Map</button>

        <div className="input-group">
          <input
            type="text"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            placeholder="Enter PIN/ZIP code"
          />
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            placeholder="Country code (e.g., IN, US)"
            maxLength="2"
          />
          <button onClick={() => getWeatherByPincode(pincode, country)}>Get Weather by PIN</button>
        </div>

        {mapVisible && (
          <div className="map-container">
            {mapLoading && (
              <div className="map-loading-overlay">
                <div className="map-spinner"></div>
                <p>Loading Map...</p>
              </div>
            )}
            {autoFetching && (
              <div className="map-loading-overlay">
                <div className="map-spinner"></div>
                <p>🎯 Fetching Area Weather...</p>
              </div>
            )}
            <div className="map-info-bar">
              <span className="pin-counter">
                📍 Pins: {areaMarkers.length}/4 {areaMarkers.length >= 4 ? '✓ Ready!' : `(need ${4 - areaMarkers.length} more)`}
              </span>
              <div className="map-action-buttons">
                <button className="clear-btn" onClick={clearAreaSelection} disabled={areaMarkers.length === 0}>
                  Clear All
                </button>
                <button className="get-weather-btn" onClick={getAreaWeather} disabled={areaMarkers.length < 4}>
                  Get Area Weather
                </button>
                <button id="close-map-btn" onClick={closeMap}>
                  Close
                </button>
              </div>
            </div>
            <div className="temp-legend">
              <div className="legend-title">🌡️ Temperature Guide</div>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-color" style={{background: 'linear-gradient(135deg, #00d4ff, #0099cc)'}}></span>
                  <span>≤0°C Freezing</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{background: 'linear-gradient(135deg, #4a90e2, #2e5c8a)'}}></span>
                  <span>1-10°C Cold</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{background: 'linear-gradient(135deg, #00bcd4, #0097a7)'}}></span>
                  <span>11-20°C Cool</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{background: 'linear-gradient(135deg, #4caf50, #2e7d32)'}}></span>
                  <span>21-25°C Mild</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{background: 'linear-gradient(135deg, #ff9800, #f57c00)'}}></span>
                  <span>26-30°C Warm</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{background: 'linear-gradient(135deg, #ff5722, #d84315)'}}></span>
                  <span>31-35°C Hot</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{background: 'linear-gradient(135deg, #d32f2f, #b71c1c)'}}></span>
                  <span>&gt;35°C Very Hot</span>
                </div>
              </div>
            </div>
            <div id="map" ref={mapContainer}></div>
          </div>
        )}

        {loading && <div className="loading">Loading...</div>}

        {weatherData && (
          <div className="weather-info">
            <h2>{weatherData.name}</h2>
            <p>
              <i className="fas fa-temperature-high"></i>{" "}
              {Math.round(weatherData.main.temp)}°C
            </p>
            <p>
              <i className="fas fa-cloud-sun"></i>{" "}
              {weatherData.weather[0].description}
            </p>
            <p>
              <i className="fas fa-wind"></i> {weatherData.wind.speed} m/s
            </p>
            <p>
              <i className="fas fa-cloud"></i> {weatherData.clouds.all}% Cloud
            </p>
            <p>
              <i className="fas fa-tint"></i> {weatherData.main.humidity}% Humidity
            </p>
            <p>
              <i className="fas fa-tachometer-alt"></i> {weatherData.main.pressure} hPa
            </p>
            <img
              src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}.png`}
              alt="Weather Icon"
            />
            <p>{new Date().toLocaleDateString()}</p>
          </div>
        )}

        {forecast.length > 0 && (
          <div className="forecast">
            <h3>7-Day Forecast</h3>
            {forecast.map((day, idx) => (
              <div className="forecast-day" key={idx}>
                <p>{new Date(day.dt * 1000).toLocaleDateString()}</p>
                <p>
                  <img
                    src={`https://openweathermap.org/img/wn/${day.weather[0].icon}.png`}
                    alt={day.weather[0].description}
                  />
                </p>
                <p>{Math.round(day.temp.day)}°C</p>
                <p>{day.weather[0].description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
