import React, { useState, useRef } from 'react';
import './CreateProjectModal.css';

/**
 * @typedef {Object} CreateProjectModalProps
 * @property {() => void} onClose - Called when modal is closed
 * @property {(projectName: string) => void} onProjectCreated - Called after project is successfully created
 */

/**
 * Modal for creating a new project with name and file uploads
 * @param {CreateProjectModalProps} props
 */
function CreateProjectModal({ onClose, onProjectCreated }) {
  const [projectName, setProjectName] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    // Filter to only allow .zip and .geojson files
    const validFiles = selectedFiles.filter(file => 
      file.name.endsWith('.zip') || file.name.endsWith('.geojson')
    );
    
    if (validFiles.length !== selectedFiles.length) {
      setError('Some files were ignored. Only .zip and .geojson files are allowed.');
    } else {
      setError(null);
    }
    
    setFiles(validFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      setError('Project name is required');
      return;
    }
    
    if (files.length === 0) {
      setError('At least one file is required');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('projectName', projectName.trim());
      
      for (const file of files) {
        formData.append('files', file);
      }

      const res = await fetch('/api/projects', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onProjectCreated(data.project.name);
        onClose();
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setUploading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="projectName">Project Name</label>
            <input
              type="text"
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name"
              disabled={uploading}
            />
          </div>

          <div className="form-group">
            <label>Files (.zip, .geojson)</label>
            <div 
              className="file-drop-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".zip,.geojson"
                onChange={handleFileChange}
                disabled={uploading}
              />
              <span className="file-drop-text">
                Click to select files or drag & drop
              </span>
            </div>
            
            {files.length > 0 && (
              <ul className="file-list">
                {files.map((file, index) => (
                  <li key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      className="file-remove-btn"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || files.length === 0 || !projectName.trim()}
            >
              {uploading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProjectModal;
