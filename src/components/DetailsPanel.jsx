import React, { useMemo } from 'react';
import { 
  resolveCategory, 
  getFormData, 
  getCategoryLabel,
  getCategoryPath,
  formatTagKey, 
  formatTagValue 
} from '../utils/tagUtils';
import './DetailsPanel.css';

function DetailsPanel({ feature, onClose }) {
  if (!feature) return null;

  const { geometry, properties } = feature;
  const { tags, createdAt, attachments, schemaName, locations } = properties;
  const isTrack = schemaName === 'track' || geometry.type === 'LineString';

  const photos = attachments?.filter(a => a.type === 'photo') || [];
  const audios = attachments?.filter(a => a.type === 'audio') || [];

  // Resolve category from the rope and get form data
  const { category, ropeKeys } = useMemo(() => resolveCategory(tags), [tags]);
  const formData = useMemo(() => getFormData(tags, ropeKeys), [tags, ropeKeys]);
  const categoryLabel = useMemo(() => getCategoryLabel(category), [category]);
  const categoryPath = useMemo(() => getCategoryPath(category), [category]);

  // Title is notes field, fallback to category label or generic text
  const title = tags?.notes || categoryLabel || (isTrack ? 'Track' : 'Observation');

  // Track stats
  const trackPointCount = isTrack ? (locations?.length || geometry.coordinates?.length || 0) : 0;

  return (
    <div className="details-panel">
      <div className="details-header">
        <h2>{title}</h2>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="details-content">
        <div className="details-meta">
          {isTrack ? (
            <div className="meta-item category">
              <span className="category-badge track-badge">Track</span>
            </div>
          ) : category.length > 0 && (
            <div className="meta-item category">
              <span className="category-badge" title={categoryPath}>{categoryLabel}</span>
            </div>
          )}
          {createdAt && (
            <div className="meta-item">
              <span className="meta-label">Date:</span>
              <span className="meta-value">{new Date(createdAt).toLocaleString()}</span>
            </div>
          )}
          {isTrack && trackPointCount > 0 && (
            <div className="meta-item">
              <span className="meta-label">Points:</span>
              <span className="meta-value">{trackPointCount}</span>
            </div>
          )}
        </div>

        {/* Details (form data excluding rope keys) */}
        {Object.keys(formData).length > 0 && (
          <div className="details-tags">
            <h3>Details</h3>
            <dl>
              {Object.entries(formData).map(([key, value]) => (
                <div key={key} className="tag-item">
                  <dt>{formatTagKey(key)}</dt>
                  <dd>{formatTagValue(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="details-photos">
            <h3>Photos ({photos.length})</h3>
            <div className="photos-grid">
              {photos.map((photo) => (
                <img
                  key={photo.name}
                  src={`/api/media/${photo.name}`}
                  alt={tags?.name || 'Observation photo'}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        {/* Audio */}
        {audios.length > 0 && (
          <div className="details-audio">
            <h3>Audio ({audios.length})</h3>
            {audios.map((audio) => (
              <div key={audio.name} className="audio-item">
                <audio controls>
                  <source src={`/api/media/${audio.name}`} />
                  Your browser does not support audio playback.
                </audio>
                {audio.createdAt && (
                  <span className="audio-date">
                    {new Date(audio.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailsPanel;
