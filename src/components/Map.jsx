import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveCategory, getCategoryLabel } from '../utils/tagUtils';

// Fix for default marker icons in Leaflet with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Default center (roughly center of the Americas)
const DEFAULT_CENTER = [0, -60];
const DEFAULT_ZOOM = 4;

// Component to fit map bounds to all features
function FitBounds({ features }) {
  const map = useMap();

  useEffect(() => {
    if (features && features.length > 0) {
      const allCoords = [];

      for (const f of features) {
        if (f.geometry.type === 'Point') {
          allCoords.push([f.geometry.coordinates[1], f.geometry.coordinates[0]]);
        } else if (f.geometry.type === 'LineString') {
          for (const coord of f.geometry.coordinates) {
            allCoords.push([coord[1], coord[0]]);
          }
        }
      }

      if (allCoords.length > 0) {
        const bounds = L.latLngBounds(allCoords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [features, map]);

  return null;
}

// Track line style
const TRACK_STYLE = {
  color: '#e74c3c',
  weight: 3,
  opacity: 0.8
};

function Map({ geojson, onSelectFeature }) {
  const features = geojson?.features || [];

  // Separate observations (Points) from tracks (LineStrings)
  const { observations, tracks } = useMemo(() => {
    const observations = [];
    const tracks = [];

    for (const feature of features) {
      if (feature.geometry.type === 'Point') {
        observations.push(feature);
      } else if (feature.geometry.type === 'LineString') {
        tracks.push(feature);
      }
    }

    return { observations, tracks };
  }, [features]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds features={features} />

      {/* Render tracks as polylines */}
      {tracks.map((track) => {
        const { coordinates } = track.geometry;
        const { tags, createdAt } = track.properties;
        // Convert [lng, lat] to [lat, lng] for Leaflet
        const positions = coordinates.map(coord => [coord[1], coord[0]]);

        return (
          <Polyline
            key={track.properties.docId}
            positions={positions}
            pathOptions={TRACK_STYLE}
            eventHandlers={{
              click: () => onSelectFeature?.(track)
            }}
          >
            <Tooltip>
              <div>
                <strong>{tags?.notes || 'Track'}</strong>
                {createdAt && <div>{new Date(createdAt).toLocaleDateString()}</div>}
                <div>{coordinates.length} points</div>
              </div>
            </Tooltip>
          </Polyline>
        );
      })}

      {/* Render observations as markers */}
      {observations.map((feature) => {
        const { coordinates } = feature.geometry;
        const { tags, createdAt } = feature.properties;
        const position = [coordinates[1], coordinates[0]];
        const { category } = resolveCategory(tags);
        const categoryLabel = getCategoryLabel(category);

        return (
          <Marker
            key={feature.properties.docId}
            position={position}
            eventHandlers={{
              click: () => onSelectFeature?.(feature)
            }}
          >
            <Tooltip>
              <div>
                <strong>{tags?.notes || categoryLabel || 'Observation'}</strong>
                {category.length > 0 && <div>Category: {categoryLabel}</div>}
                {createdAt && <div>{new Date(createdAt).toLocaleDateString()}</div>}
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default Map;
