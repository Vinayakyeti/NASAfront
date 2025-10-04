import React, { useState, useEffect, useRef } from "react";
import "../assets/ios-weather.css";
import NavBar from "./NavBar";
import Pin from "./Pin";
import Place from "./Place";
import Area from "./Area";

const apiKey = "84254d5ce02335eb1d0ed7c9393e2ebb";
const mapTilerApiKey = "tqwKGpwhSpdYZsUKY4nn";

export default function Home() {
  const [mode, setMode] = useState("map");
  const [currentWeather, setCurrentWeather] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [sheetHeight, setSheetHeight] = useState("30%");
  const [weatherLayer, setWeatherLayer] = useState(null); // 'rainfall', 'wind', 'heat', 'cold'
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersArrayRef = useRef([]);

  useEffect(() => {
    // Only initialize map for "map" mode
    if (mode === "map" && mapContainer.current && !mapRef.current) {
      maptilersdk.config.apiKey = mapTilerApiKey;
      const map = new maptilersdk.Map({
        container: mapContainer.current,
        style: maptilersdk.MapStyle.STREETS,
        center: [0, 20],
        zoom: 2,
      });

      mapRef.current = map;

      map.on("load", () => {
        // Check if there's a pending marker to add (from PIN or Place search)
        if (window.pendingMarker) {
          console.log('Adding pending marker:', window.pendingMarker);
          const { weatherData, addMarkerToMap } = window.pendingMarker;
          addMarkerToMap(map);
          window.pendingMarker = null;
        }
      });

      map.on("click", async (e) => {
        const { lng, lat } = e.lngLat;
        console.log(`📍 Pin placed - Latitude: ${lat}, Longitude: ${lng}`);
        
        try {
          // If date and time are selected, use forecast API
          if (selectedMonth && selectedDay && selectedYear && selectedTime) {
            const forecastDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`;
            const targetDateTime = new Date(`${forecastDate}T${selectedTime}`);
            const currentTime = new Date();
            
            if (targetDateTime < currentTime) {
              alert("Cannot fetch forecast for past dates");
              return;
            }

            const forecastRes = await fetch(
              `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
            );
            const forecastData = await forecastRes.json();
            
            // Find closest forecast entry
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
              lat: lat,
              lng: lng,
              rain: closestForecast.rain ? (closestForecast.rain['3h'] || 0) : 0,
              clouds: closestForecast.clouds?.all || 0,
              visibility: closestForecast.visibility || 0,
              forecastTime: new Date(closestForecast.dt * 1000).toLocaleString()
            };
            
            setCurrentWeather(weatherData);
            
            const temperature = closestForecast.main.temp;
            const pinColor = getTempColor(temperature);
            
            const customPin = document.createElement("div");
            customPin.className = "ios-map-pin";
            customPin.innerHTML = `
              <div class="ios-pin-dot" style="background: ${pinColor.start};"></div>
              <div class="ios-pin-temp">${Math.round(temperature)}°</div>
            `;
            
            const marker = new maptilersdk.Marker({ 
              element: customPin,
              anchor: 'center'
            })
              .setLngLat([lng, lat])
              .addTo(map);

            markersArrayRef.current.push(marker);
            setMarkers(prev => [...prev, { lng, lat, temp: temperature, location: forecastData.city.name }]);
          } else {
            // Use current weather API
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
            );
            const data = await res.json();
            
            const weatherData = {
              temp: data.main.temp,
              feels_like: data.main.feels_like,
              humidity: data.main.humidity,
              wind: data.wind.speed,
              description: data.weather[0].description,
              icon: data.weather[0].icon,
              location: data.name || 'Unknown Location',
              lat: lat,
              lng: lng,
              rain: data.rain ? (data.rain['1h'] || data.rain['3h'] || 0) : 0,
              clouds: data.clouds?.all || 0,
              visibility: data.visibility || 0
            };
            
            setCurrentWeather(weatherData);
            
            const temperature = data.main.temp;
            const pinColor = getTempColor(temperature);
            
            const customPin = document.createElement("div");
            customPin.className = "ios-map-pin";
            customPin.innerHTML = `
              <div class="ios-pin-dot" style="background: ${pinColor.start};"></div>
              <div class="ios-pin-temp">${Math.round(temperature)}°</div>
            `;
            
            const marker = new maptilersdk.Marker({ 
              element: customPin,
              anchor: 'center'
            })
              .setLngLat([lng, lat])
              .addTo(map);

            markersArrayRef.current.push(marker);
            setMarkers(prev => [...prev, { lng, lat, temp: temperature, location: data.name }]);
          }
        } catch (err) {
          console.error('Failed to fetch temperature:', err);
        }
      });
    }

    // Cleanup function when switching away from map mode
    return () => {
      if (mode !== "map" && mapRef.current) {
        // Clear all markers
        markersArrayRef.current.forEach(marker => marker.remove());
        markersArrayRef.current = [];
        
        // Remove map
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mode]);

  // Separate effect to handle map reinitialization
  useEffect(() => {
    // When switching to map mode and map doesn't exist, trigger rerender
    if (mode === "map" && !mapRef.current && mapContainer.current) {
      // Small delay to ensure container is ready
      const timer = setTimeout(() => {
        if (!mapRef.current && mapContainer.current) {
          maptilersdk.config.apiKey = mapTilerApiKey;
          const map = new maptilersdk.Map({
            container: mapContainer.current,
            style: maptilersdk.MapStyle.STREETS,
            center: [0, 20],
            zoom: 2,
          });

          mapRef.current = map;

          map.on("load", () => {
            // Check if there's a pending marker to add (from PIN or Place search)
            if (window.pendingMarker) {
              console.log('Adding pending marker in second effect:', window.pendingMarker);
              const { weatherData, addMarkerToMap } = window.pendingMarker;
              addMarkerToMap(map);
              window.pendingMarker = null;
            }
          });

          map.on("click", async (e) => {
            const { lng, lat } = e.lngLat;
            console.log(`📍 Pin placed - Latitude: ${lat}, Longitude: ${lng}`);
            
            try {
              if (selectedMonth && selectedDay && selectedYear && selectedTime) {
                const forecastDate = `${selectedYear}-${selectedMonth.padStart(2, '0')}-${selectedDay.padStart(2, '0')}`;
                const targetDateTime = new Date(`${forecastDate}T${selectedTime}`);
                const currentTime = new Date();
                
                if (targetDateTime < currentTime) {
                  alert("Cannot fetch forecast for past dates");
                  return;
                }

                const forecastRes = await fetch(
                  `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
                );
                const forecastData = await forecastRes.json();
                
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
                  lat: lat,
                  lng: lng,
                  rain: closestForecast.rain ? (closestForecast.rain['3h'] || 0) : 0,
                  clouds: closestForecast.clouds?.all || 0,
                  visibility: closestForecast.visibility || 0,
                  forecastTime: new Date(closestForecast.dt * 1000).toLocaleString()
                };
                
                setCurrentWeather(weatherData);
                
                const temperature = closestForecast.main.temp;
                const pinColor = getTempColor(temperature);
                
                const customPin = document.createElement("div");
                customPin.className = "ios-map-pin";
                customPin.innerHTML = `
                  <div class="ios-pin-dot" style="background: ${pinColor.start};"></div>
                  <div class="ios-pin-temp">${Math.round(temperature)}°</div>
                `;
                
                const marker = new maptilersdk.Marker({ 
                  element: customPin,
                  anchor: 'center'
                })
                  .setLngLat([lng, lat])
                  .addTo(map);

                markersArrayRef.current.push(marker);
                setMarkers(prev => [...prev, { lng, lat, temp: temperature, location: forecastData.city.name }]);
              } else {
                const res = await fetch(
                  `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`
                );
                const data = await res.json();
                
                const weatherData = {
                  temp: data.main.temp,
                  feels_like: data.main.feels_like,
                  humidity: data.main.humidity,
                  wind: data.wind.speed,
                  description: data.weather[0].description,
                  icon: data.weather[0].icon,
                  location: data.name,
                  lat: lat,
                  lng: lng
                };
                
                setCurrentWeather(weatherData);
                
                const temperature = data.main.temp;
                const pinColor = getTempColor(temperature);
                
                const customPin = document.createElement("div");
                customPin.className = "ios-map-pin";
                customPin.innerHTML = `
                  <div class="ios-pin-dot" style="background: ${pinColor.start};"></div>
                  <div class="ios-pin-temp">${Math.round(temperature)}°</div>
                `;
                
                const marker = new maptilersdk.Marker({ 
                  element: customPin,
                  anchor: 'center'
                })
                  .setLngLat([lng, lat])
                  .addTo(map);

                markersArrayRef.current.push(marker);
                setMarkers(prev => [...prev, { lng, lat, temp: temperature, location: data.name }]);
              }
            } catch (err) {
              console.error('Failed to fetch temperature:', err);
            }
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [mode, mapContainer.current]);

  // Weather Layer Overlay Effect
  useEffect(() => {
    if (!mapRef.current || mode !== "map") return;

    const map = mapRef.current;
    
    const removeWeatherLayer = () => {
      try {
        if (map.getLayer('weather-circles')) {
          map.removeLayer('weather-circles');
        }
        if (map.getSource('weather-source')) {
          map.removeSource('weather-source');
        }
      } catch (e) {
        console.log('Error removing layer:', e);
      }
    };

    removeWeatherLayer();

    if (!weatherLayer) return;

    const addWeatherLayerWhenReady = () => {
      if (map.loaded()) {
        addWeatherLayer(map, weatherLayer);
      } else {
        map.once('load', () => addWeatherLayer(map, weatherLayer));
      }
    };

    addWeatherLayerWhenReady();

    return () => {
      removeWeatherLayer();
    };
  }, [weatherLayer, mode]);

  const addWeatherLayer = (map, layerType) => {
    const getLayerConfig = () => {
      switch(layerType) {
        case 'rainfall':
          return {
            color: '#1E90FF',
            lightColor: '#87CEEB',
            darkColor: '#00008B',
            name: '💧'
          };
        case 'wind':
          return {
            color: '#32CD32',
            lightColor: '#90EE90',
            darkColor: '#006400',
            name: '💨'
          };
        case 'heat':
          return {
            color: '#FF4500',
            lightColor: '#FFD700',
            darkColor: '#8B0000',
            name: '🔥'
          };
        case 'cold':
          return {
            color: '#00BFFF',
            lightColor: '#ADD8E6',
            darkColor: '#191970',
            name: '❄️'
          };
        default:
          return { color: '#000000', lightColor: '#FFFFFF', darkColor: '#000000', name: '' };
      }
    };

    // Create weather pattern features with varied intensities
    const features = [];
    const bounds = map.getBounds();
    const numClusters = 8; // Number of weather systems
    
    // Create cluster centers
    const clusters = [];
    for (let i = 0; i < numClusters; i++) {
      clusters.push({
        lng: bounds.getWest() + Math.random() * (bounds.getEast() - bounds.getWest()),
        lat: bounds.getSouth() + Math.random() * (bounds.getNorth() - bounds.getSouth()),
        intensity: 0.3 + Math.random() * 0.7,
        radius: 0.5 + Math.random() * 1.5
      });
    }

    // Create points around clusters
    clusters.forEach(cluster => {
      const pointsPerCluster = 25;
      for (let i = 0; i < pointsPerCluster; i++) {
        const angle = (Math.PI * 2 * i) / pointsPerCluster;
        const distance = Math.random() * cluster.radius;
        const lng = cluster.lng + Math.cos(angle) * distance;
        const lat = cluster.lat + Math.sin(angle) * distance;
        
        // Intensity decreases from cluster center
        const intensity = cluster.intensity * (1 - distance / cluster.radius) * (0.5 + Math.random() * 0.5);
        
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          properties: {
            intensity: intensity
          }
        });
      }
    });

    try {
      map.addSource('weather-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: features
        }
      });

      const config = getLayerConfig();
      
      map.addLayer({
        id: 'weather-circles',
        type: 'circle',
        source: 'weather-source',
        paint: {
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            0, ['*', ['get', 'intensity'], 30],
            10, ['*', ['get', 'intensity'], 60],
            15, ['*', ['get', 'intensity'], 100]
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'intensity'],
            0, config.lightColor,
            0.5, config.color,
            1, config.darkColor
          ],
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'intensity'],
            0, 0.2,
            0.5, 0.4,
            1, 0.6
          ],
          'circle-blur': 1
        }
      });

      console.log(`${layerType} layer added with ${features.length} points`);
    } catch (e) {
      console.log('Error adding weather layer:', e);
    }
  };

  const getTempColor = (temp) => {
    if (temp <= 0) return { start: '#00d4ff', end: '#0099cc', pulse: 'rgba(0, 212, 255, 0.4)', name: 'Extreme Cold' };
    else if (temp <= 10) return { start: '#4a90e2', end: '#2e5c8a', pulse: 'rgba(74, 144, 226, 0.4)', name: 'Cold' };
    else if (temp <= 20) return { start: '#00bcd4', end: '#0097a7', pulse: 'rgba(0, 188, 212, 0.4)', name: 'Cool' };
    else if (temp <= 25) return { start: '#4caf50', end: '#2e7d32', pulse: 'rgba(76, 175, 80, 0.4)', name: 'Mild' };
    else if (temp <= 30) return { start: '#ff9800', end: '#f57c00', pulse: 'rgba(255, 152, 0, 0.4)', name: 'Warm' };
    else if (temp <= 35) return { start: '#ff5722', end: '#d84315', pulse: 'rgba(255, 87, 34, 0.4)', name: 'Hot' };
    else return { start: '#d32f2f', end: '#b71c1c', pulse: 'rgba(211, 47, 47, 0.4)', name: 'Very Hot' };
  };

  const handleWeatherFetch = (weatherData) => {
    console.log('handleWeatherFetch called with:', weatherData);
    setCurrentWeather(weatherData);
    
    // Store the weather data to add marker after map initialization
    const addMarkerToMap = (map) => {
      console.log('addMarkerToMap called, isArea:', weatherData.isArea);
      if (!weatherData.isArea && weatherData.lat && weatherData.lng) {
        const temperature = weatherData.temp;
        const pinColor = getTempColor(temperature);
        
        const customPin = document.createElement("div");
        customPin.className = "ios-map-pin";
        customPin.innerHTML = `
          <div class="ios-pin-dot" style="background: ${pinColor.start};"></div>
          <div class="ios-pin-temp">${Math.round(temperature)}°</div>
        `;
        
        const marker = new maptilersdk.Marker({ 
          element: customPin,
          anchor: 'center'
        })
          .setLngLat([weatherData.lng, weatherData.lat])
          .addTo(map);

        markersArrayRef.current.push(marker);
        console.log('Marker added to map');
        
        // Fly to location
        map.flyTo({
          center: [weatherData.lng, weatherData.lat],
          zoom: 10,
          duration: 2000
        });
      }
    };
    
    // If map already exists, add marker immediately
    if (mapRef.current && weatherData.lat && weatherData.lng) {
      console.log('Map exists, adding marker immediately');
      addMarkerToMap(mapRef.current);
    } else if (mode !== "map" && mode !== "area") {
      // Store data to add marker after map loads
      console.log('Storing pending marker for later');
      window.pendingMarker = { weatherData, addMarkerToMap };
    }
    
    // Add to markers list
    if (!weatherData.isArea) {
      setMarkers(prev => [...prev, {
        lng: weatherData.lng,
        lat: weatherData.lat,
        temp: weatherData.temp,
        location: weatherData.location
      }]);
    }
    
    // Only switch to map mode for pin/place searches, NOT for area
    if (mode !== "map" && mode !== "area") {
      setMode("map");
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    // Clear current weather when switching modes
    if (newMode !== "map") {
      setCurrentWeather(null);
    }
  };

  const clearMapHistory = () => {
    // Remove all markers from map
    if (markersArrayRef.current.length > 0) {
      markersArrayRef.current.forEach(marker => marker.remove());
      markersArrayRef.current = [];
    }
    // Clear markers state
    setMarkers([]);
    // Clear current weather
    setCurrentWeather(null);
  };

  const toggleSheet = () => {
    setSheetHeight(sheetHeight === "30%" ? "70%" : "30%");
  };

  const handleLayerChange = (layer) => {
    setWeatherLayer(weatherLayer === layer ? null : layer);
    setShowLayerMenu(false);
  };

  const renderContent = () => {
    switch (mode) {
      case "pin":
        return <Pin onWeatherFetch={handleWeatherFetch} />;
      case "place":
        return <Place onWeatherFetch={handleWeatherFetch} />;
      case "area":
        return <Area onWeatherFetch={handleWeatherFetch} />;
      case "map":
      default:
        return (
          <div className="ios-map-wrapper">
            <div id="home-map" ref={mapContainer}></div>
            
            {/* Weather Layer Controls */}
            <div className="weather-layer-controls">
              <button 
                className={`layer-btn ${showLayerMenu ? 'active' : ''}`}
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                title="Weather Layers"
              >
                <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor">
                  <path d="M464 32H48C21.49 32 0 53.49 0 80v80c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zm-6 128H54c-3.31 0-6-2.69-6-6V86c0-3.31 2.69-6 6-6h404c3.31 0 6 2.69 6 6v68c0 3.31-2.69 6-6 6z"/>
                  <path d="M464 240H48c-26.51 0-48 21.49-48 48v80c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48v-80c0-26.51-21.49-48-48-48zm-6 128H54c-3.31 0-6-2.69-6-6v-68c0-3.31 2.69-6 6-6h404c3.31 0 6 2.69 6 6v68c0 3.31-2.69 6-6 6z"/>
                  <path d="M392 448H120c-26.51 0-48 21.49-48 48v-32c0-26.51 21.49-48 48-48h272c26.51 0 48 21.49 48 48v32c0-26.51-21.49-48-48-48z" opacity="0.4"/>
                </svg>
              </button>

              {showLayerMenu && (
                <div className="layer-menu">
                  <button 
                    className={`layer-option ${weatherLayer === 'rainfall' ? 'selected' : ''}`}
                    onClick={() => handleLayerChange('rainfall')}
                  >
                    <span className="layer-icon">🌧️</span>
                    <span className="layer-name">Rainfall</span>
                    {weatherLayer === 'rainfall' && <span className="layer-check">✓</span>}
                  </button>
                  
                  <button 
                    className={`layer-option ${weatherLayer === 'wind' ? 'selected' : ''}`}
                    onClick={() => handleLayerChange('wind')}
                  >
                    <span className="layer-icon">💨</span>
                    <span className="layer-name">Windy</span>
                    {weatherLayer === 'wind' && <span className="layer-check">✓</span>}
                  </button>
                  
                  <button 
                    className={`layer-option ${weatherLayer === 'heat' ? 'selected' : ''}`}
                    onClick={() => handleLayerChange('heat')}
                  >
                    <span className="layer-icon">🔥</span>
                    <span className="layer-name">Heat</span>
                    {weatherLayer === 'heat' && <span className="layer-check">✓</span>}
                  </button>
                  
                  <button 
                    className={`layer-option ${weatherLayer === 'cold' ? 'selected' : ''}`}
                    onClick={() => handleLayerChange('cold')}
                  >
                    <span className="layer-icon">❄️</span>
                    <span className="layer-name">Cold</span>
                    {weatherLayer === 'cold' && <span className="layer-check">✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Weather Legend Bar */}
            {weatherLayer && (
              <div className="weather-legend">
                <div className="legend-header">
                  {weatherLayer === 'rainfall' && '🌧️ Precipitation'}
                  {weatherLayer === 'wind' && '💨 Wind Speed'}
                  {weatherLayer === 'heat' && '🔥 Temperature'}
                  {weatherLayer === 'cold' && '❄️ Temperature'}
                </div>
                <div className="legend-gradient">
                  {weatherLayer === 'rainfall' && (
                    <div className="gradient-bar rainfall-gradient"></div>
                  )}
                  {weatherLayer === 'wind' && (
                    <div className="gradient-bar wind-gradient"></div>
                  )}
                  {weatherLayer === 'heat' && (
                    <div className="gradient-bar heat-gradient"></div>
                  )}
                  {weatherLayer === 'cold' && (
                    <div className="gradient-bar cold-gradient"></div>
                  )}
                </div>
                <div className="legend-labels">
                  <span className="legend-label">Light</span>
                  <span className="legend-label">Moderate</span>
                  <span className="legend-label">Heavy</span>
                  <span className="legend-label">
                    {weatherLayer === 'rainfall' && 'Extreme'}
                    {weatherLayer === 'wind' && 'Strong'}
                    {weatherLayer === 'heat' && 'Very Hot'}
                    {weatherLayer === 'cold' && 'Freezing'}
                  </span>
                </div>
              </div>
            )}

            {/* Date/Time Forecast Selector */}
            <div className="map-datetime-selector">
              <div className="datetime-selector-header">
                📅 Forecast Mode
              </div>
              <div className="datetime-selectors">
                <select 
                  className="datetime-select" 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  title="Select month for forecast"
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
                  title="Select day for forecast"
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
                  title="Select year for forecast"
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
                  title="Select time for forecast"
                />
              </div>
              
              {/* See Forecast Button */}
              <button 
                className="forecast-btn"
                disabled={!selectedMonth || !selectedDay || !selectedYear || !selectedTime}
                onClick={() => {
                  if (selectedMonth && selectedDay && selectedYear && selectedTime) {
                    alert('Click on the map to see forecast for the selected date and time');
                  }
                }}
                title="Click map after selecting date/time to see forecast"
              >
                {selectedMonth && selectedDay && selectedYear && selectedTime ? '✓ Ready - Click Map for Forecast' : '📅 Select Date & Time'}
              </button>
              
              {/* Status Message */}
              {selectedMonth && selectedDay && selectedYear && selectedTime ? (
                <div className="datetime-status active">
                  ✓ Forecast: {new Date(2025, parseInt(selectedMonth) - 1).toLocaleString('default', { month: 'short' })} {selectedDay}, {selectedYear} at {selectedTime}
                </div>
              ) : (
                <div className="datetime-status">
                  ⏱️ Click map for current weather
                </div>
              )}
              
              {(selectedMonth || selectedDay || selectedYear || selectedTime) && (
                <button 
                  className="clear-datetime-btn"
                  onClick={() => {
                    setSelectedMonth("");
                    setSelectedDay("");
                    setSelectedYear("");
                    setSelectedTime("");
                  }}
                  title="Clear forecast selection"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Clear History Button */}
            {markers.length > 0 && (
              <button className="clear-history-btn" onClick={clearMapHistory} title="Clear all pins">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Clear ({markers.length})</span>
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="ios-weather-container">
      {/* NavBar */}
      <NavBar currentMode={mode} onModeChange={handleModeChange} />

      {/* Content based on mode */}
      {renderContent()}

      {/* Translucent Weather Card */}
      {currentWeather && (
        <div className="weather-card-container">
          <div className="weather-card">
            {/* Close Button */}
            <button className="weather-card-close" onClick={() => setCurrentWeather(null)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Location Header */}
            <div className="weather-card-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span className="weather-card-location">{currentWeather.location}</span>
              {currentWeather.isArea && <span className="area-badge-card">Area Avg</span>}
            </div>

            {/* Main Temperature Display */}
            <div className="weather-card-main">
              <div className="weather-temp-large">{Math.round(currentWeather.temp)}°</div>
              <div className="weather-desc">{currentWeather.description}</div>
              <div className="weather-range">
                H:{Math.round(currentWeather.temp + 2)}° L:{Math.round(currentWeather.temp - 2)}°
              </div>
            </div>

            {/* Weather Details Grid */}
            <div className="weather-details-grid">
              <div className="weather-detail-item">
                <div className="detail-icon-card">💨</div>
                <div className="detail-label-card">Wind Speed</div>
                <div className="detail-value-card">{Math.round(currentWeather.wind * 3.6)} km/h</div>
              </div>
              
              <div className="weather-detail-item">
                <div className="detail-icon-card">💧</div>
                <div className="detail-label-card">Humidity</div>
                <div className="detail-value-card">{Math.round(currentWeather.humidity)}%</div>
              </div>
              
              <div className="weather-detail-item">
                <div className="detail-icon-card">🌡️</div>
                <div className="detail-label-card">Feels Like</div>
                <div className="detail-value-card">{Math.round(currentWeather.feels_like)}°</div>
              </div>
              
              <div className="weather-detail-item">
                <div className="detail-icon-card">🌧️</div>
                <div className="detail-label-card">Rainfall</div>
                <div className="detail-value-card">
                  {currentWeather.rain ? `${currentWeather.rain} mm` : '0 mm'}
                </div>
              </div>
              
              <div className="weather-detail-item">
                <div className="detail-icon-card">☁️</div>
                <div className="detail-label-card">Clouds</div>
                <div className="detail-value-card">{currentWeather.clouds || 0}%</div>
              </div>
              
              <div className="weather-detail-item">
                <div className="detail-icon-card">👁️</div>
                <div className="detail-label-card">Visibility</div>
                <div className="detail-value-card">
                  {currentWeather.visibility ? `${(currentWeather.visibility / 1000).toFixed(1)} km` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Air Quality Section (if available) */}
            {currentWeather.aqi !== undefined && (
              <div className="air-quality-section">
                <div className="air-quality-header">
                  <span className="air-quality-icon">🌫️</span>
                  <span className="air-quality-title">Air Quality</span>
                </div>
                <div className="air-quality-value">
                  AQI: {currentWeather.aqi} - {currentWeather.aqiLabel}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
