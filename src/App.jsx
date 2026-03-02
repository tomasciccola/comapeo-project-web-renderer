import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import DetailsPanel from './components/DetailsPanel';
import './App.css';

function App() {
  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);

  // Check if project is already loaded
  useEffect(() => {
    fetch('/api/project')
      .then(res => res.json())
      .then(data => {
        if (data.loaded) {
          setProjectLoaded(true);
          loadGeojson();
        }
      })
      .catch(err => console.error('Failed to check project status:', err));
  }, []);

  const loadGeojson = async () => {
    try {
      const res = await fetch('/api/geojson');
      if (res.ok) {
        const data = await res.json();
        setGeojson(data);
      }
    } catch (err) {
      console.error('Failed to load geojson:', err);
    }
  };

  const handleLoadExample = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/extract-example', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setProjectLoaded(true);
        await loadGeojson();
      } else {
        setError(data.error || 'Failed to load example');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>CoMapeo Project Renderer</h1>
        {!projectLoaded && (
          <button 
            onClick={handleLoadExample} 
            disabled={loading}
            className="load-btn"
          >
            {loading ? 'Loading...' : 'Load Example Data'}
          </button>
        )}
        {geojson && (
          <span className="point-count">
            {geojson.features.length} observation(s)
          </span>
        )}
      </header>
      {error && <div className="error">{error}</div>}
      <main className="map-container">
        <Map geojson={geojson} onSelectFeature={setSelectedFeature} />
        <DetailsPanel 
          feature={selectedFeature} 
          onClose={() => setSelectedFeature(null)} 
        />
      </main>
    </div>
  );
}

export default App;
