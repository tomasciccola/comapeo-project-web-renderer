import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import DetailsPanel from './components/DetailsPanel';
import ListView from './components/ListView';
import CreateProjectModal from './components/CreateProjectModal';
import ProjectListModal from './components/ProjectListModal';
import './App.css';

function App() {
  const [geojson, setGeojson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectLoaded, setProjectLoaded] = useState(false);
  const [currentProjectName, setCurrentProjectName] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showListView, setShowListView] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showProjectListModal, setShowProjectListModal] = useState(false);

  // Check if project is already loaded
  useEffect(() => {
    fetch('/api/project')
      .then(res => res.json())
      .then(data => {
        if (data.loaded) {
          setProjectLoaded(true);
          setCurrentProjectName(data.name || 'Unnamed Project');
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
        setCurrentProjectName('Example Project');
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

  const handleProjectCreated = async (projectName) => {
    setProjectLoaded(true);
    setCurrentProjectName(projectName);
    await loadGeojson();
  };

  const handleProjectSelected = async (projectName) => {
    setProjectLoaded(true);
    setCurrentProjectName(projectName);
    setSelectedFeature(null);
    await loadGeojson();
  };

  const handleProjectDeleted = (wasCurrentProject) => {
    if (wasCurrentProject) {
      // Clear the current project state
      setProjectLoaded(false);
      setCurrentProjectName(null);
      setGeojson(null);
      setSelectedFeature(null);
    }
  };

  const handleProjectUpdated = async (projectName) => {
    // Reload the geojson data if files were added to the current project
    if (projectName === currentProjectName) {
      await loadGeojson();
    }
  };

  return (
    <div className="app">
      <header>
        <h1>CoMapeo Project Renderer</h1>
        <button
          className="current-project-btn"
          onClick={() => setShowProjectListModal(true)}
          title="View all projects"
        >
          {currentProjectName ? (
            <>Project: <strong>{currentProjectName}</strong></>
          ) : (
            'Select Project'
          )}
          <span className="project-dropdown-icon">▼</span>
        </button>
        <div className="header-actions">
          <button
            onClick={() => setShowCreateProjectModal(true)}
            className="create-project-btn"
          >
            + New Project
          </button>
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
            <>
              <button
                onClick={() => setShowListView(!showListView)}
                className="list-btn"
              >
                {showListView ? 'Hide List' : 'Show List'}
              </button>
              <span className="point-count">
                {geojson.features.length} item(s)
              </span>
            </>
          )}
        </div>
      </header>
      {error && <div className="error">{error}</div>}
      <main className="map-container">
        <Map geojson={geojson} onSelectFeature={setSelectedFeature} />
        {showListView && (
          <ListView
            geojson={geojson}
            onClose={() => setShowListView(false)}
          />
        )}
        <DetailsPanel
          feature={selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      </main>
      {showCreateProjectModal && (
        <CreateProjectModal
          onClose={() => setShowCreateProjectModal(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}
      {showProjectListModal && (
        <ProjectListModal
          onClose={() => setShowProjectListModal(false)}
          onProjectSelected={handleProjectSelected}
          onProjectDeleted={handleProjectDeleted}
          onProjectUpdated={handleProjectUpdated}
          currentProjectName={currentProjectName}
        />
      )}
    </div>
  );
}

export default App;
