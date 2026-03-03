import React, { useState, useEffect, useRef } from 'react';
import './ProjectListModal.css';

/**
 * @typedef {Object} Project
 * @property {string} id - Project directory name
 * @property {string} name - Project display name
 * @property {string} createdAt - ISO date string
 * @property {number} geojsonCount - Number of geojson files
 * @property {boolean} hasMedia - Whether project has media files
 */

/**
 * @typedef {Object} ProjectListModalProps
 * @property {() => void} onClose - Called when modal is closed
 * @property {(projectName: string) => void} onProjectSelected - Called after a project is selected
 * @property {(wasCurrentProject: boolean) => void} onProjectDeleted - Called after a project is deleted
 * @property {(projectName: string) => void} onProjectUpdated - Called after files are added to a project
 * @property {string | null} currentProjectName - Name of the currently loaded project
 */

/**
 * Modal for viewing and selecting from stored projects
 * @param {ProjectListModalProps} props
 */
function ProjectListModal({ onClose, onProjectSelected, onProjectDeleted, onProjectUpdated, currentProjectName }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectingId, setSelectingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = useRef(null);
  const [targetProjectId, setTargetProjectId] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/projects');
      const data = await res.json();

      if (res.ok) {
        setProjects(data.projects || []);
      } else {
        setError(data.error || 'Failed to load projects');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = async (project) => {
    if (project.name === currentProjectName) {
      onClose();
      return;
    }

    setSelectingId(project.id);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/select`, {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onProjectSelected(data.project.name);
        onClose();
      } else {
        setError(data.error || 'Failed to select project');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setSelectingId(null);
    }
  };

  const handleDeleteClick = (project) => {
    // Show confirmation for this project
    setConfirmDeleteId(project.id);
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteId(null);
  };

  const handleDeleteConfirm = async (project) => {
    setDeletingId(project.id);
    setConfirmDeleteId(null);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Remove from local list
        setProjects(projects.filter(p => p.id !== project.id));
        // Notify parent if the current project was deleted
        if (data.wasCurrentProject) {
          onProjectDeleted(true);
        }
      } else {
        setError(data.error || 'Failed to delete project');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddFilesClick = (project) => {
    setTargetProjectId(project.id);
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0 || !targetProjectId) {
      setTargetProjectId(null);
      return;
    }

    // Filter valid files
    const validFiles = files.filter(file =>
      file.name.endsWith('.zip') || file.name.endsWith('.geojson')
    );

    if (validFiles.length === 0) {
      setError('Only .zip and .geojson files are allowed');
      setTargetProjectId(null);
      e.target.value = '';
      return;
    }

    setUploadingId(targetProjectId);
    setError(null);

    try {
      const formData = new FormData();
      for (const file of validFiles) {
        formData.append('files', file);
      }

      const res = await fetch(`/api/projects/${targetProjectId}/files`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Update local project data
        setProjects(projects.map(p => {
          if (p.id === targetProjectId) {
            return {
              ...p,
              geojsonCount: data.project.geojsonFiles?.length || p.geojsonCount,
              hasMedia: !!data.project.mediaDir
            };
          }
          return p;
        }));

        // Notify parent if this was the current project so it can reload
        if (data.isCurrentProject) {
          onProjectUpdated(data.project.name);
        }
      } else {
        setError(data.error || 'Failed to add files');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setUploadingId(null);
      setTargetProjectId(null);
      e.target.value = '';
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Unknown date';
    return new Date(isoString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content project-list-modal">
        <div className="modal-header">
          <h2>Projects</h2>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        {/* Hidden file input for adding files */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".zip,.geojson"
          onChange={handleFileInputChange}
          style={{ display: 'none' }}
        />

        <div className="project-list-content">
          {loading && (
            <div className="project-list-loading">Loading projects...</div>
          )}

          {error && (
            <div className="project-list-error">{error}</div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div className="project-list-empty">
              <p>No projects found.</p>
              <p className="project-list-hint">Create a new project to get started.</p>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <ul className="project-list">
              {projects.map((project) => {
                const isCurrent = project.name === currentProjectName;
                const isSelecting = selectingId === project.id;
                const isDeleting = deletingId === project.id;
                const isUploading = uploadingId === project.id;
                const isConfirmingDelete = confirmDeleteId === project.id;
                const isBusy = isSelecting || isDeleting || isUploading;

                return (
                  <li
                    key={project.id}
                    className={`project-item ${isCurrent ? 'current' : ''} ${isBusy ? 'busy' : ''}`}
                  >
                    <div className="project-item-info">
                      <div className="project-item-header">
                        <span className="project-item-name">{project.name}</span>
                        {isCurrent && (
                          <span className="project-item-badge">Current</span>
                        )}
                      </div>
                      <div className="project-item-meta">
                        <span className="project-item-date">
                          Created: {formatDate(project.createdAt)}
                        </span>
                        <span className="project-item-stats">
                          {project.geojsonCount} file(s)
                          {project.hasMedia && ' • Media included'}
                        </span>
                      </div>
                    </div>
                    <div className="project-item-actions">
                      {isConfirmingDelete ? (
                        <div className="delete-confirm">
                          <span className="delete-confirm-text">Delete?</span>
                          <button
                            className="delete-confirm-btn yes"
                            onClick={() => handleDeleteConfirm(project)}
                          >
                            Yes
                          </button>
                          <button
                            className="delete-confirm-btn no"
                            onClick={handleDeleteCancel}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="project-item-select-btn"
                            onClick={() => handleSelectProject(project)}
                            disabled={isBusy}
                          >
                            {isSelecting ? 'Loading...' : isCurrent ? 'Selected' : 'View'}
                          </button>
                          <button
                            className="project-item-add-btn"
                            onClick={() => handleAddFilesClick(project)}
                            disabled={isBusy}
                            title="Add files to project"
                          >
                            {isUploading ? '...' : '+'}
                          </button>
                          <button
                            className="project-item-delete-btn"
                            onClick={() => handleDeleteClick(project)}
                            disabled={isBusy}
                            title="Delete project"
                          >
                            {isDeleting ? '...' : '🗑'}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectListModal;
