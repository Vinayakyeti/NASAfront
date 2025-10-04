import React, { useState, useEffect, useRef } from "react";

const apiKey = "84254d5ce02335eb1d0ed7c9393e2ebb";
const mapTilerApiKey = "tqwKGpwhSpdYZsUKY4nn";

export default function Area({ onWeatherFetch }) {
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const polygonLayersRef = useRef(false);

  useEffect(() => {
    if (mapContainer.current && !mapRef.current) {
      maptilersdk.config.apiKey = mapTilerApiKey;
      const map = new maptilersdk.Map({
        container: mapContainer.current,
        style: maptilersdk.MapStyle.STREETS,
        center: [0, 20],
        zoom: 2,
      });

      map.on("load", () => {
        map.on("click", (e) => {
          const { lng, lat } = e.lngLat;
          addPoint(lng, lat, map);
        });
      });

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const addPoint = (lng, lat, map) => {
    setSelectedPoints(prevPoints => {
      // Check if we already have 4 points
      if (prevPoints.length >= 4) {
        return prevPoints;
      }

      const pointNumber = prevPoints.length + 1;
      console.log(`📍 Area Point ${pointNumber} - Latitude: ${lat}, Longitude: ${lng}`);

      // Create numbered marker
      const markerEl = document.createElement("div");
      markerEl.className = "area-marker";
      markerEl.innerHTML = `
        <div class="area-marker-number">${pointNumber}</div>
      `;

      const marker = new maptilersdk.Marker({ element: markerEl, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.push(marker);
      const newPoints = [...prevPoints, { lng, lat }];

      // Draw polygon if we have at least 3 points
      if (newPoints.length >= 3) {
        drawPolygon(newPoints, map);
      }

      // Auto-fetch weather when 4 points are selected
      if (newPoints.length === 4) {
        console.log('📍 All 4 Area Points Selected:');
        newPoints.forEach((point, index) => {
          console.log(`   Point ${index + 1}: Latitude: ${point.lat}, Longitude: ${point.lng}`);
        });
        fetchAreaWeather(newPoints);
      }

      return newPoints;
    });
  };

  const drawPolygon = (points, map) => {
    // Make sure map is loaded
    if (!map.loaded()) {
      console.log('Map not loaded yet, waiting...');
      map.once('load', () => drawPolygon(points, map));
      return;
    }

    // Remove existing polygon layers if they exist
    if (polygonLayersRef.current) {
      try {
        if (map.getLayer('area-polygon-fill')) {
          map.removeLayer('area-polygon-fill');
        }
        if (map.getLayer('area-polygon-outline')) {
          map.removeLayer('area-polygon-outline');
        }
        if (map.getSource('area-polygon')) {
          map.removeSource('area-polygon');
        }
      } catch (e) {
        console.log('Error removing layers:', e);
      }
    }

    // Create polygon coordinates (close the shape)
    const coordinates = [...points.map(p => [p.lng, p.lat]), [points[0].lng, points[0].lat]];

    console.log('Drawing polygon with coordinates:', coordinates);

    // Add polygon source
    map.addSource('area-polygon', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        }
      }
    });

    // Add fill layer with higher opacity
    map.addLayer({
      id: 'area-polygon-fill',
      type: 'fill',
      source: 'area-polygon',
      paint: {
        'fill-color': '#007AFF',
        'fill-opacity': 0.4
      }
    });

    // Add outline layer with thicker line
    map.addLayer({
      id: 'area-polygon-outline',
      type: 'line',
      source: 'area-polygon',
      paint: {
        'line-color': '#007AFF',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    polygonLayersRef.current = true;
    console.log('Polygon drawn successfully');
  };

  const fetchAreaWeather = async (points) => {
    setLoading(true);
    setError("");

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

        // Fetch forecast for all 4 points
        const forecastPromises = points.map(point =>
          fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${point.lat}&lon=${point.lng}&appid=${apiKey}&units=metric`
          ).then(res => res.json())
        );

        const forecastResults = await Promise.all(forecastPromises);

        // Find closest forecast for each point
        const targetTimestamp = targetDateTime.getTime();
        const closestForecasts = forecastResults.map(forecastData => {
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

          return closestForecast;
        });

        // Calculate averages from forecasts
        const avgTemp = closestForecasts.reduce((sum, data) => sum + data.main.temp, 0) / 4;
        const avgFeelsLike = closestForecasts.reduce((sum, data) => sum + data.main.feels_like, 0) / 4;
        const avgHumidity = closestForecasts.reduce((sum, data) => sum + data.main.humidity, 0) / 4;
        const avgWind = closestForecasts.reduce((sum, data) => sum + data.wind.speed, 0) / 4;
        const avgRain = closestForecasts.reduce((sum, data) => {
          const rain = data.rain ? (data.rain['3h'] || 0) : 0;
          return sum + rain;
        }, 0) / 4;
        const avgClouds = closestForecasts.reduce((sum, data) => sum + (data.clouds?.all || 0), 0) / 4;
        const avgVisibility = closestForecasts.reduce((sum, data) => sum + (data.visibility || 0), 0) / 4;

        const descriptions = closestForecasts.map(data => data.weather[0].description);
        const mostCommon = descriptions.sort((a, b) =>
          descriptions.filter(v => v === a).length - descriptions.filter(v => v === b).length
        ).pop();

        const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / 4;
        const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / 4;

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [centerLng, centerLat],
            zoom: 8,
            duration: 1500
          });
        }

        const weatherData = {
          temp: avgTemp,
          feels_like: avgFeelsLike,
          humidity: avgHumidity,
          wind: avgWind,
          description: mostCommon,
          icon: closestForecasts[0].weather[0].icon,
          location: `Selected Area`,
          lat: centerLat,
          lng: centerLng,
          isArea: true,
          points: points,
          rain: avgRain,
          clouds: avgClouds,
          visibility: avgVisibility,
          forecastTime: new Date(closestForecasts[0].dt * 1000).toLocaleString()
        };

        onWeatherFetch(weatherData);
      } else {
        // Use current weather API
        const weatherPromises = points.map(point =>
          fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${point.lat}&lon=${point.lng}&appid=${apiKey}&units=metric`
          ).then(res => res.json())
        );

        const weatherResults = await Promise.all(weatherPromises);

        const avgTemp = weatherResults.reduce((sum, data) => sum + data.main.temp, 0) / 4;
        const avgFeelsLike = weatherResults.reduce((sum, data) => sum + data.main.feels_like, 0) / 4;
        const avgHumidity = weatherResults.reduce((sum, data) => sum + data.main.humidity, 0) / 4;
        const avgWind = weatherResults.reduce((sum, data) => sum + data.wind.speed, 0) / 4;
        const avgRain = weatherResults.reduce((sum, data) => {
          const rain = data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) : 0;
          return sum + rain;
        }, 0) / 4;
        const avgClouds = weatherResults.reduce((sum, data) => sum + (data.clouds?.all || 0), 0) / 4;
        const avgVisibility = weatherResults.reduce((sum, data) => sum + (data.visibility || 0), 0) / 4;

        const descriptions = weatherResults.map(data => data.weather[0].description);
        const mostCommon = descriptions.sort((a, b) =>
          descriptions.filter(v => v === a).length - descriptions.filter(v => v === b).length
        ).pop();

        const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / 4;
        const centerLng = points.reduce((sum, p) => sum + p.lng, 0) / 4;

        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [centerLng, centerLat],
            zoom: 8,
            duration: 1500
          });
        }

        const weatherData = {
          temp: avgTemp,
          feels_like: avgFeelsLike,
          humidity: avgHumidity,
          wind: avgWind,
          description: mostCommon,
          icon: weatherResults[0].weather[0].icon,
          location: `Selected Area`,
          lat: centerLat,
          lng: centerLng,
          isArea: true,
          points: points,
          rain: avgRain,
          clouds: avgClouds,
          visibility: avgVisibility
        };

        onWeatherFetch(weatherData);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch area weather");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    // Remove all markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Remove polygon layers
    if (mapRef.current && polygonLayersRef.current) {
      try {
        if (mapRef.current.getLayer('area-polygon-fill')) {
          mapRef.current.removeLayer('area-polygon-fill');
        }
        if (mapRef.current.getLayer('area-polygon-outline')) {
          mapRef.current.removeLayer('area-polygon-outline');
        }
        if (mapRef.current.getSource('area-polygon')) {
          mapRef.current.removeSource('area-polygon');
        }
      } catch (e) {
        console.log('Error clearing polygon:', e);
      }
      polygonLayersRef.current = false;
    }

    setSelectedPoints([]);
    setError("");
  };

  return (
    <div className="area-selection-container">
      <div className="area-map-wrapper">
        <div ref={mapContainer} className="area-map"></div>

        {/* Instructions Overlay */}
        <div className="area-instructions">
          <div className="instruction-card">
            <div className="instruction-header">
              <span className="instruction-icon">🗺️</span>
              <span className="instruction-title">Select Area</span>
            </div>
            <p className="instruction-text">
              Click 4 points on the map to define an area
            </p>
            <div className="points-counter">
              {[1, 2, 3, 4].map((num) => (
                <div
                  key={num}
                  className={`point-indicator ${selectedPoints.length >= num ? 'selected' : ''}`}
                >
                  {num}
                </div>
              ))}
            </div>
            
            {/* Date/Time Inputs */}
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
                />
              </div>
              
              {/* See Forecast Button */}
              <button 
                className="forecast-btn"
                disabled={!selectedMonth || !selectedDay || !selectedYear || !selectedTime || loading || selectedPoints.length !== 4}
                style={{ marginTop: '12px' }}
              >
                {selectedMonth && selectedDay && selectedYear && selectedTime 
                  ? (selectedPoints.length === 4 ? '✓ Will Fetch Forecast' : '📍 Select 4 Points First')
                  : '📅 Select Date & Time First'}
              </button>
              
              {selectedMonth && selectedDay && selectedYear && selectedTime && (
                <p className="datetime-hint active-forecast">
                  ✓ Will show forecast for {new Date(2025, parseInt(selectedMonth) - 1).toLocaleString('default', { month: 'short' })} {selectedDay}, {selectedYear} at {selectedTime}
                </p>
              )}
              {!selectedMonth && !selectedDay && !selectedYear && !selectedTime && (
                <p className="datetime-hint">⏱️ Leave empty for current weather</p>
              )}
            </div>
            
            {/* Clear Button in Card */}
            {selectedPoints.length > 0 && (
              <button className="clear-btn-card" onClick={clearSelection}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                Clear ({selectedPoints.length})
              </button>
            )}
            
            {selectedPoints.length === 4 && !loading && (
              <div className="success-message">
                ✓ Area selected! Check weather below.
              </div>
            )}
            {selectedPoints.length >= 3 && selectedPoints.length < 4 && (
              <div className="info-message">
                Click one more point to complete the area
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="area-loading">
            <div className="loading-spinner-large"></div>
            <p>Calculating area weather...</p>
          </div>
        )}

        {error && (
          <div className="area-error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
