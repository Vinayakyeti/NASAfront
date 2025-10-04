import React, { useState } from "react";

export default function NavBar({ onModeChange, currentMode }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const modes = [
    { id: "pin", label: "PIN Code", icon: "📍" },
    { id: "place", label: "Place Name", icon: "🏙️" },
    { id: "area", label: "Select Area", icon: "🗺️" },
    { id: "map", label: "Free Explore", icon: "🌍" }
  ];

  const currentModeObj = modes.find(m => m.id === currentMode) || modes[3];

  const handleModeSelect = (modeId) => {
    onModeChange(modeId);
    setShowDropdown(false);
  };

  return (
    <nav className="ios-navbar">
      <div className="navbar-brand">
        <span className="weather-icon">🌤️</span>
        <span className="brand-text">Weather</span>
      </div>

      <div className="navbar-dropdown">
        <button 
          className="dropdown-toggle" 
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <span className="current-mode">
            <span className="mode-icon">{currentModeObj.icon}</span>
            <span className="mode-text">{currentModeObj.label}</span>
          </span>
          <svg 
            className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {showDropdown && (
          <div className="dropdown-menu-ios">
            {modes.map((mode) => (
              <div
                key={mode.id}
                className={`dropdown-item-ios ${currentMode === mode.id ? 'active' : ''}`}
                onClick={() => handleModeSelect(mode.id)}
              >
                <span className="item-icon">{mode.icon}</span>
                <span className="item-label">{mode.label}</span>
                {currentMode === mode.id && (
                  <svg className="checkmark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
