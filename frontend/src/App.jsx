/**
 * App.jsx
 * =======
 * Root component for the Hyperlocal Rainfall Prediction dashboard.
 * Fetches predictions from the Flask API and renders location cards
 * in a responsive grid. Clicking a card opens a detailed modal with
 * weather + AQI charts.
 */

import React, { useEffect, useState } from 'react';
import LocationCard from './components/LocationCard';
import LocationModal from './components/LocationModal';
import './App.css';

const API = 'http://localhost:5000/api';

export default function App() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API}/predictions`)
      .then(r => r.json())
      .then(data => {
        if (data.status !== 'ok') throw new Error(data.message || 'API error');
        setPredictions(data.predictions);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* ── Header ── */}
      <header className="header">
        <h1>🌧️ Hyperlocal Rainfall Prediction System</h1>
        <p>Real-time ML-based predictions for Bangalore micro-locations</p>
      </header>

      {/* ── Main content ── */}
      <main className="grid-container">
        {loading && (
          <div className="spinner-wrap">
            <div className="spinner" />
            <p>Fetching live predictions…</p>
          </div>
        )}

        {error && (
          <div className="error-box">
            <h3>⚠ Could not load predictions</h3>
            <p>{error}</p>
            <p style={{ marginTop: '0.5rem', fontSize: '.85rem', color: '#94a3b8' }}>
              Make sure the Flask API is running on port 5000.
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid">
            {predictions.map((p) => (
              <LocationCard
                key={p.location}
                data={p}
                onClick={() => setSelected(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Detail modal ── */}
      {selected && (
        <LocationModal
          location={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* ── Footer ── */}
      <footer className="footer">
        Data source: Open-Meteo API (free) · Model: Random Forest · Built with React &amp; Recharts
      </footer>
    </>
  );
}
