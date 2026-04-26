import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  CloudRain, 
  Sun, 
  Wind, 
  Droplets, 
  Cloud, 
  ThermometerSun,
  MapPin,
  ChevronRight
} from 'lucide-react';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://localhost:5000/api/predictions');
      if (response.data && response.data.data) {
        setData(response.data.data);
        setLastUpdated(new Date(response.data.last_updated * 1000));
      }
    } catch (err) {
      console.error(err);
      setError(`Failed to connect: ${err.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Memoized calculations to prevent flickering
  const cityMetrics = useMemo(() => {
    if (data.length === 0) return null;
    const avgTemp = (data.reduce((acc, loc) => acc + loc.details.temperature_2m, 0) / data.length).toFixed(1);
    const avgHumidity = Math.round(data.reduce((acc, loc) => acc + loc.details.relative_humidity_2m, 0) / data.length);
    const avgWind = (data.reduce((acc, loc) => acc + loc.details.windspeed_10m, 0) / data.length).toFixed(1);
    const avgCloud = Math.round(data.reduce((acc, loc) => acc + loc.details.cloudcover, 0) / data.length);
    const rainingLocations = data.filter(loc => loc.prediction.includes('Rain')).length;
    return { avgTemp, avgHumidity, avgWind, avgCloud, rainingLocations, isRaining: rainingLocations > 0 };
  }, [data]);

  // Generate rain drops only if raining
  const rainDrops = useMemo(() => {
    if (!cityMetrics?.isRaining) return [];
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${0.5 + Math.random() * 0.5}s`
    }));
  }, [cityMetrics?.isRaining]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <div className="loader-text">Loading Atmospheric Models...</div>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="loader-text" style={{ color: '#ef4444' }}>{error || 'No data available'}</div>
          <button 
            onClick={fetchPredictions}
            className="glass-card" 
            style={{ padding: '0.8rem 2rem', cursor: 'pointer', border: 'none', fontWeight: '700', marginTop: '1.5rem' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { avgTemp, avgHumidity, avgWind, avgCloud, rainingLocations, isRaining } = cityMetrics;

  return (
    <>
      {/* Background Atmospheric Layer */}
      <div className="weather-background">
        <div className="cloud cloud-1"></div>
        <div className="cloud cloud-2"></div>
        <div className="cloud cloud-3"></div>
        
        <div className={`rain-container ${isRaining ? 'active' : ''}`}>
           {rainDrops.map(drop => (
             <div 
               key={drop.id} 
               className="drop" 
               style={{ left: drop.left, animationDelay: drop.delay, animationDuration: drop.duration }}
             ></div>
           ))}
        </div>
      </div>

      <div className="app-container">
        {/* Header */}
        <header className="header">
          <div className="header-title">
            <h1>Bangalore Weather</h1>
            <p>Hyperlocal Rainfall Intelligence</p>
          </div>
          <div className="status-badge">
            <div className="status-dot"></div>
            <span>{lastUpdated ? `Live • ${lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Connecting...'}</span>
          </div>
        </header>

        {/* Holistic City Review */}
        <section className="city-review-section">
          <div className="glass-card main-city-card">
            <div className="city-header-row">
              <div className="city-name">
                <MapPin size={28} color="#2563eb" />
                Bengaluru Overview
              </div>
              <div className={`city-prediction ${isRaining ? 'rain' : 'no-rain'}`}>
                {isRaining ? `Rain in ${rainingLocations} Zones 🌧️` : 'Clear City-Wide ☀️'}
              </div>
            </div>
            
            <div className="city-body-row">
              <div className="city-temp-block">
                <div className="city-temp">{avgTemp}°C</div>
                <div className="city-weather-desc">
                  {isRaining ? "Atmospheric Precipitation Expected" : "Pleasant Sunny Weather"}
                </div>
              </div>
              <div className="city-main-icon">
                {isRaining ? (
                  <CloudRain className="weather-icon-huge rain-drop" />
                ) : (
                  <Sun className="weather-icon-huge sun-glow" />
                )}
              </div>
            </div>

            <div className="city-stats-row">
              <div className="city-stat">
                <span className="stat-icon-label">Temp</span>
                <span>{avgTemp}°C</span>
              </div>
              <div className="city-stat">
                <span className="stat-icon-label">Humidity</span>
                <span>{avgHumidity}%</span>
              </div>
              <div className="city-stat">
                <span className="stat-icon-label">Wind</span>
                <span>{avgWind} km/h</span>
              </div>
              <div className="city-stat">
                <span className="stat-icon-label">Cloud</span>
                <span>{avgCloud}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Hyperlocal Sliding Zones */}
        <section className="locations-section">
          <div className="section-header">
            <h2>Micro-Location Insights</h2>
            <span className="swipe-hint">Scroll to explore <ChevronRight size={18} /></span>
          </div>
          
          <div className="sliding-tiles-container">
            {data.map((loc, idx) => {
              const locRain = loc.prediction.includes('Rain');
              return (
                <div key={idx} className="glass-card long-tile">
                  <div className="tile-icon-wrapper">
                    {locRain ? (
                      <CloudRain className="tile-icon rain" size={36} />
                    ) : (
                      <Sun className="tile-icon no-rain" size={36} />
                    )}
                  </div>
                  <div className="tile-content">
                    <div className="tile-title-row">
                      <h3>{loc.location}</h3>
                      <span className="tile-temp">{loc.details.temperature_2m}°</span>
                    </div>
                    <div className="tile-prediction">
                      <span className={locRain ? "text-rain" : "text-norain"}>
                        {loc.prediction.replace(' 🌧️', '').replace(' ☀️', '')}
                      </span>
                    </div>
                    <div className="tile-stats">
                      <span><Droplets size={14}/> {loc.details.relative_humidity_2m}%</span>
                      <span><Wind size={14}/> {loc.details.windspeed_10m} km/h</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </>
  );
}

export default App;
