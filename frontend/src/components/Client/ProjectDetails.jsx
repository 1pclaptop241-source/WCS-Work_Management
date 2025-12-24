import { useState } from 'react';
import { projectsAPI } from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import './ProjectDetails.css';

const ProjectDetails = ({ project, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(project.description);
  const [projectDetails, setProjectDetails] = useState(project.projectDetails || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      await projectsAPI.update(project._id, {
        description,
        projectDetails,
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update project details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDescription(project.description);
    setProjectDetails(project.projectDetails || '');
    setEditing(false);
    setError('');
  };

  return (
    <div className="project-details">
      <div className="section-header">
        <h3>Project Details</h3>
        {!editing && (
          <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {editing ? (
        <div className="edit-form">
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Project Details</label>
            <textarea
              className="form-textarea"
              value={projectDetails}
              onChange={(e) => setProjectDetails(e.target.value)}
              rows="6"
              placeholder="Add any additional project details here..."
            />
          </div>

          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="details-view">
          <div className="detail-item">
            <strong>
              Description:
              {project.editedFields?.description && project.accepted && (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem', marginLeft: '8px' }}>Edited</span>
              )}
            </strong>
            <p>{project.description}</p>
          </div>

          {project.projectDetails && (
            <div className="detail-item">
              <strong>
                Additional Details:
                {project.editedFields?.projectDetails && project.accepted && (
                  <span className="badge badge-warning" style={{ fontSize: '0.7rem', marginLeft: '8px' }}>Edited</span>
                )}
              </strong>
              <p>{project.projectDetails}</p>
            </div>
          )}

          <div className="detail-item">
            <strong>
              Deadline:
              {project.editedFields?.deadline && project.accepted && (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem', marginLeft: '8px' }}>Edited</span>
              )}
            </strong>
            <p>{formatDate(project.deadline)}</p>
          </div>

          {project.assignedEditor && (
            <div className="detail-item">
              <strong>Assigned Editor:</strong>
              <p>{project.assignedEditor.name}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectDetails;

