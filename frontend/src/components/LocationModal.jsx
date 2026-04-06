/**
 * LocationModal.jsx
 * =================
 * Full-detail view for a single location.
 * Shows weather charts (last 10 hrs + next 10 hrs) and AQI charts.
 * Uses Recharts for all visualisations.
 */

import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const API = 'http://localhost:5000/api';

/* ── Helpers ── */

/** Format ISO timestamp to readable label (HH:00) */
function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Classify EU AQI value */
function aqiLabel(val) {
  if (val == null) return { text: '—', cls: '' };
  if (val <= 20) return { text: 'Good', cls: 'aqi-good' };
  if (val <= 40) return { text: 'Fair', cls: 'aqi-good' };
  if (val <= 60) return { text: 'Moderate', cls: 'aqi-moderate' };
  if (val <= 80) return { text: 'Poor', cls: 'aqi-bad' };
  return { text: 'Very Poor', cls: 'aqi-bad' };
}

/** Custom tooltip for Recharts */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e293b', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 8, padding: '8px 12px', fontSize: '.8rem',
    }}>
      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {p.value != null ? p.value.toFixed(1) : '—'}
        </div>
      ))}
    </div>
  );
}

/** Find the value closest to "now" in an array of ISO timestamps */
function findCurrentValue(times, values) {
  if (!times || !values) return null;
  const now = Date.now();
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - now);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  return values[bestIdx] ?? null;
}

export default function LocationModal({ location, onClose }) {
  const [weather, setWeather] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${API}/location/${encodeURIComponent(location.location)}/weather`).then(r => r.json()),
      fetch(`${API}/location/${encodeURIComponent(location.location)}/aqi`).then(r => r.json()),
    ])
      .then(([wRes, aRes]) => {
        if (cancelled) return;
        if (wRes.status !== 'ok') throw new Error(wRes.message);
        if (aRes.status !== 'ok') throw new Error(aRes.message);
        setWeather(wRes.weather);
        setAqi(aRes.aqi);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [location.location]);

  /* ── Build chart data (no downsampling — only ~20 hourly points) ── */
  let weatherData = [];
  let aqiData = [];
  let nowLabel = null;

  if (weather) {
    weatherData = weather.time.map((t, i) => ({
      time: fmtTime(t),
      rawTime: t,
      temperature: weather.temperature_2m[i],
      humidity: weather.relative_humidity_2m[i],
      precip: weather.precipitation[i],
      cloud: weather.cloudcover[i],
      wind: weather.windspeed_10m[i],
    }));

    // "Now" marker
    const now = new Date();
    for (let i = 0; i < weatherData.length; i++) {
      if (new Date(weatherData[i].rawTime) >= now) { nowLabel = weatherData[i].time; break; }
    }
  }

  if (aqi) {
    aqiData = aqi.time.map((t, i) => ({
      time: fmtTime(t),
      rawTime: t,
      pm2_5: aqi.pm2_5[i],
      pm10: aqi.pm10[i],
      uv: aqi.uv_index[i],
      eu_aqi: aqi.european_aqi[i],
    }));
  }

  /* ── Current values (closest to "now") ── */
  const cur = {};
  if (weather) {
    cur.temp = findCurrentValue(weather.time, weather.temperature_2m);
    cur.hum = findCurrentValue(weather.time, weather.relative_humidity_2m);
    cur.cloud = findCurrentValue(weather.time, weather.cloudcover);
    cur.wind = findCurrentValue(weather.time, weather.windspeed_10m);
    cur.precip = findCurrentValue(weather.time, weather.precipitation);
  }
  if (aqi) {
    cur.euAqi = findCurrentValue(aqi.time, aqi.european_aqi);
    cur.pm25 = findCurrentValue(aqi.time, aqi.pm2_5);
    cur.pm10 = findCurrentValue(aqi.time, aqi.pm10);
    cur.uv = findCurrentValue(aqi.time, aqi.uv_index);
  }
  const aqiInfo = aqiLabel(cur.euAqi);
  const isRain = location.prediction.includes('Rain Expected');

  /* ── Close on Escape ── */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* ── Axis styling ── */
  const axisStyle = { fontSize: 11, fill: '#64748b' };
  const gridStroke = 'rgba(255,255,255,0.04)';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>📍 {location.location}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="spinner-wrap">
              <div className="spinner" />
              <p>Loading weather &amp; AQI data…</p>
            </div>
          )}

          {error && <div className="error-box">⚠ {error}</div>}

          {!loading && !error && (
            <>
              {/* ── Current Weather Detail Cards ── */}
              <div className="summary-row">
                <div className="summary-card">
                  <div className="label">Prediction</div>
                  <div className={`value ${isRain ? 'rain-val' : 'norain-val'}`}>
                    {isRain ? '🌧️ Rain' : '☀️ No Rain'}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="label">🌡️ Temperature</div>
                  <div className="value temp-val">
                    {cur.temp != null ? `${cur.temp.toFixed(1)}°C` : '—'}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="label">💧 Humidity</div>
                  <div className="value hum-val">
                    {cur.hum != null ? `${cur.hum.toFixed(0)}%` : '—'}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="label">☁️ Cloud Cover</div>
                  <div className="value" style={{ color: '#94a3b8' }}>
                    {cur.cloud != null ? `${cur.cloud.toFixed(0)}%` : '—'}
                  </div>
                </div>
              </div>

              <div className="summary-row">
                <div className="summary-card">
                  <div className="label">💨 Wind Speed</div>
                  <div className="value" style={{ color: '#a78bfa' }}>
                    {cur.wind != null ? `${cur.wind.toFixed(1)} km/h` : '—'}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="label">🌧️ Precipitation</div>
                  <div className="value" style={{ color: '#818cf8' }}>
                    {cur.precip != null ? `${cur.precip.toFixed(1)} mm` : '—'}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="label">🏭 AQI (EU)</div>
                  <div className={`value ${aqiInfo.cls}`}>
                    {cur.euAqi != null ? `${cur.euAqi} – ${aqiInfo.text}` : '—'}
                  </div>
                </div>
                <div className="summary-card">
                  <div className="label">🫁 PM2.5 / PM10</div>
                  <div className="value" style={{ color: '#fbbf24', fontSize: '1.1rem' }}>
                    {cur.pm25 != null ? cur.pm25.toFixed(1) : '—'} / {cur.pm10 != null ? cur.pm10.toFixed(1) : '—'}
                  </div>
                </div>
              </div>

              <div className="summary-row" style={{ justifyContent: 'flex-start' }}>
                <div className="summary-card" style={{ flex: 'none', width: 'fit-content', minWidth: 160 }}>
                  <div className="label">☀️ UV Index</div>
                  <div className="value" style={{ color: '#fb923c' }}>
                    {cur.uv != null ? cur.uv.toFixed(1) : '—'}
                  </div>
                </div>
              </div>

              {/* ── Charts ── */}
              <div className="charts-grid">
                {/* Temperature */}
                <div className="chart-panel">
                  <h4>🌡️ Temperature (°C) — Last 10 hrs → Next 10 hrs</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={weatherData}>
                      <CartesianGrid stroke={gridStroke} />
                      <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                      <YAxis tick={axisStyle} />
                      <Tooltip content={<ChartTooltip />} />
                      {nowLabel && <ReferenceLine x={nowLabel} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Now', position: 'top', fill: '#6366f1', fontSize: 11 }} />}
                      <Line type="monotone" dataKey="temperature" stroke="#fb923c" strokeWidth={2} dot={false} name="Temp" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Humidity */}
                <div className="chart-panel">
                  <h4>💧 Humidity (%) — Last 10 hrs → Next 10 hrs</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={weatherData}>
                      <defs>
                        <linearGradient id="humGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={gridStroke} />
                      <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                      <YAxis tick={axisStyle} />
                      <Tooltip content={<ChartTooltip />} />
                      {nowLabel && <ReferenceLine x={nowLabel} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Now', position: 'top', fill: '#6366f1', fontSize: 11 }} />}
                      <Area type="monotone" dataKey="humidity" stroke="#38bdf8" fill="url(#humGrad)" strokeWidth={2} name="Humidity" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Precipitation */}
                <div className="chart-panel">
                  <h4>🌧️ Precipitation (mm) — Last 10 hrs → Next 10 hrs</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={weatherData}>
                      <CartesianGrid stroke={gridStroke} />
                      <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                      <YAxis tick={axisStyle} />
                      <Tooltip content={<ChartTooltip />} />
                      {nowLabel && <ReferenceLine x={nowLabel} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Now', position: 'top', fill: '#6366f1', fontSize: 11 }} />}
                      <Bar dataKey="precip" fill="#818cf8" radius={[4, 4, 0, 0]} name="Precipitation" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* AQI */}
                <div className="chart-panel">
                  <h4>🏭 Air Quality Index (EU) — Last 10 hrs → Next 10 hrs</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={aqiData}>
                      <defs>
                        <linearGradient id="aqiGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={gridStroke} />
                      <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                      <YAxis tick={axisStyle} />
                      <Tooltip content={<ChartTooltip />} />
                      {nowLabel && <ReferenceLine x={nowLabel} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Now', position: 'top', fill: '#6366f1', fontSize: 11 }} />}
                      <Area type="monotone" dataKey="eu_aqi" stroke="#34d399" fill="url(#aqiGrad)" strokeWidth={2} name="EU AQI" />
                      <Area type="monotone" dataKey="pm2_5" stroke="#fbbf24" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="PM2.5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Wind Speed */}
                <div className="chart-panel">
                  <h4>💨 Wind Speed (km/h) — Last 10 hrs → Next 10 hrs</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={weatherData}>
                      <CartesianGrid stroke={gridStroke} />
                      <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                      <YAxis tick={axisStyle} />
                      <Tooltip content={<ChartTooltip />} />
                      {nowLabel && <ReferenceLine x={nowLabel} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Now', position: 'top', fill: '#6366f1', fontSize: 11 }} />}
                      <Line type="monotone" dataKey="wind" stroke="#a78bfa" strokeWidth={2} dot={false} name="Wind" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Cloud Cover */}
                <div className="chart-panel">
                  <h4>☁️ Cloud Cover (%) — Last 10 hrs → Next 10 hrs</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={weatherData}>
                      <defs>
                        <linearGradient id="cloudGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={gridStroke} />
                      <XAxis dataKey="time" tick={axisStyle} interval="preserveStartEnd" />
                      <YAxis tick={axisStyle} />
                      <Tooltip content={<ChartTooltip />} />
                      {nowLabel && <ReferenceLine x={nowLabel} stroke="#6366f1" strokeDasharray="4 4" label={{ value: 'Now', position: 'top', fill: '#6366f1', fontSize: 11 }} />}
                      <Area type="monotone" dataKey="cloud" stroke="#94a3b8" fill="url(#cloudGrad)" strokeWidth={2} name="Cloud Cover" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
