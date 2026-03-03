import React, { useState, useMemo } from 'react';
import { resolveCategory, getCategoryLabel } from '../utils/tagUtils';
import './ListView.css';

function ListItem({ feature, isExpanded, onToggle, DetailsPanelContent }) {
  const { geometry, properties } = feature;
  const { tags, createdAt, schemaName } = properties;
  const isTrack = schemaName === 'track' || geometry.type === 'LineString';

  const { category } = resolveCategory(tags);
  const categoryLabel = getCategoryLabel(category);
  const title = tags?.notes || categoryLabel || (isTrack ? 'Track' : 'Observation');

  return (
    <div className={`list-item ${isExpanded ? 'expanded' : ''}`}>
      <div className="list-item-header" onClick={onToggle}>
        <div className="list-item-info">
          <span className={`list-item-type ${isTrack ? 'track' : 'observation'}`}>
            {isTrack ? 'Track' : categoryLabel || 'Observation'}
          </span>
          <span className="list-item-title">{title}</span>
        </div>
        <div className="list-item-meta">
          {createdAt && (
            <span className="list-item-date">
              {new Date(createdAt).toLocaleDateString()}
            </span>
          )}
          <span className={`list-item-chevron ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
      </div>
      {isExpanded && (
        <div className="list-item-details">
          <DetailsPanelContent feature={feature} />
        </div>
      )}
    </div>
  );
}

function ListView({ geojson, onClose }) {
  const [expandedId, setExpandedId] = useState(null);

  const { observations, tracks } = useMemo(() => {
    const features = geojson?.features || [];
    const observations = [];
    const tracks = [];

    for (const feature of features) {
      if (feature.properties.schemaName === 'track' || feature.geometry.type === 'LineString') {
        tracks.push(feature);
      } else {
        observations.push(feature);
      }
    }

    return { observations, tracks };
  }, [geojson]);

  const handleToggle = (docId) => {
    setExpandedId(expandedId === docId ? null : docId);
  };

  return (
    <div className="list-view">
      <div className="list-view-header">
        <h2>List View</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="list-view-content">
        {/* Observations Section */}
        <section className="list-section">
          <h3 className="list-section-title">
            <span className="section-icon observation">●</span>
            Observations ({observations.length})
          </h3>
          {observations.length === 0 ? (
            <p className="list-empty">No observations</p>
          ) : (
            <div className="list-items">
              {observations.map((feature) => (
                <ListItem
                  key={feature.properties.docId}
                  feature={feature}
                  isExpanded={expandedId === feature.properties.docId}
                  onToggle={() => handleToggle(feature.properties.docId)}
                  DetailsPanelContent={DetailsPanelContent}
                />
              ))}
            </div>
          )}
        </section>

        {/* Tracks Section */}
        <section className="list-section">
          <h3 className="list-section-title">
            <span className="section-icon track">―</span>
            Tracks ({tracks.length})
          </h3>
          {tracks.length === 0 ? (
            <p className="list-empty">No tracks</p>
          ) : (
            <div className="list-items">
              {tracks.map((feature) => (
                <ListItem
                  key={feature.properties.docId}
                  feature={feature}
                  isExpanded={expandedId === feature.properties.docId}
                  onToggle={() => handleToggle(feature.properties.docId)}
                  DetailsPanelContent={DetailsPanelContent}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Inline details content (reuses logic from DetailsPanel but without the outer wrapper)
function DetailsPanelContent({ feature }) {
  const { geometry, properties } = feature;
  const { tags, createdAt, attachments, schemaName, locations } = properties;
  const isTrack = schemaName === 'track' || geometry.type === 'LineString';

  const photos = attachments?.filter(a => a.type === 'photo') || [];
  const audios = attachments?.filter(a => a.type === 'audio') || [];

  const { category, ropeKeys } = resolveCategory(tags);
  const categoryLabel = getCategoryLabel(category);

  // Get form data excluding rope keys and notes
  const formData = {};
  if (tags) {
    for (const [key, value] of Object.entries(tags)) {
      if (!ropeKeys.has(key) && key !== 'notes') {
        formData[key] = value;
      }
    }
  }

  const trackPointCount = isTrack ? (locations?.length || geometry.coordinates?.length || 0) : 0;

  const formatTagKey = (key) => key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const formatTagValue = (value) => {
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value === null || value === undefined || value === '') return '—';
    return String(value);
  };

  return (
    <div className="inline-details">
      <div className="inline-meta">
        {createdAt && (
          <div className="meta-row">
            <span className="meta-label">Date:</span>
            <span>{new Date(createdAt).toLocaleString()}</span>
          </div>
        )}
        {isTrack && trackPointCount > 0 && (
          <div className="meta-row">
            <span className="meta-label">Points:</span>
            <span>{trackPointCount}</span>
          </div>
        )}
      </div>

      {Object.keys(formData).length > 0 && (
        <div className="inline-form-data">
          {Object.entries(formData).map(([key, value]) => (
            <div key={key} className="meta-row">
              <span className="meta-label">{formatTagKey(key)}:</span>
              <span>{formatTagValue(value)}</span>
            </div>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="inline-photos">
          {photos.map((photo) => (
            <img
              key={photo.name}
              src={`/api/media/${photo.name}`}
              alt="Observation photo"
              loading="lazy"
            />
          ))}
        </div>
      )}

      {audios.length > 0 && (
        <div className="inline-audio">
          {audios.map((audio) => (
            <audio key={audio.name} controls>
              <source src={`/api/media/${audio.name}`} />
            </audio>
          ))}
        </div>
      )}
    </div>
  );
}

export default ListView;
