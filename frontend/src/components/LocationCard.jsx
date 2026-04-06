/**
 * LocationCard.jsx
 * ================
 * Renders a single location card showing prediction status,
 * temperature, humidity, and wind speed.
 */

import React from 'react';

export default function LocationCard({ data, onClick }) {
  const isRain = data.prediction.includes('Rain Expected');

  const temp = data.details?.temperature_2m ?? '—';
  const hum = data.details?.relative_humidity_2m ?? '—';
  const wind = data.details?.windspeed_10m ?? '—';

  return (
    <div className="location-card" onClick={onClick}>
      <div className="card-header">
        <span className="pin">📍</span>
        <h3>{data.location}</h3>
      </div>

      <span className={`prediction-badge ${isRain ? 'rain' : 'norain'}`}>
        {data.prediction}
      </span>

      <div className="card-stats">
        <span>🌡️ {temp}°C</span>
        <span>💧 {hum}%</span>
        <span>💨 {wind} km/h</span>
      </div>

      <div className="click-hint">Click for details →</div>
    </div>
  );
}
