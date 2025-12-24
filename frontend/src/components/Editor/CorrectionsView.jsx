import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { worksAPI, API_BASE_URL } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import FeedbackChat from '../common/FeedbackChat';
import './CorrectionsView.css';

const CorrectionsView = ({ project, works, onClose }) => {
  const { user } = useAuth();
  const [projectWorks, setProjectWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorks();
  }, [project]);

  const loadWorks = async () => {
    try {
      setLoading(true);
      const response = await worksAPI.getByProject(project._id);
      setProjectWorks(response.data);
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Corrections & Feedback - {project.title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="spinner"></div>
          ) : projectWorks.length === 0 ? (
            <p className="no-corrections">No submissions or corrections yet.</p>
          ) : (
            <div className="corrections-list">
              {projectWorks.map((work) => (
                <div key={work._id} className="correction-item">
                  <div className="correction-header">
                    <div>
                      <strong>Submission:</strong>{" "}
                      <a
                        href={work.submissionType === 'link' ? work.fileUrl : `${API_BASE_URL}${work.fileUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="submission-link-inline"
                      >
                        {work.fileName} ↗
                      </a>
                    </div>
                    <div>
                      <span className="badge badge-primary">
                        {work.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="submission-date">
                      Submitted: {formatDateTime(work.submittedAt)}
                    </div>
                  </div>

                  {work.clientFeedback && (
                    <div className="correction-feedback">
                      <strong>General Feedback:</strong>
                      <p>{work.clientFeedback}</p>
                    </div>
                  )}

                  {work.corrections && work.corrections.length > 0 && (
                    <div className="correction-list">
                      <strong>Corrections & Feedback:</strong>
                      <FeedbackChat
                        corrections={work.corrections}
                        currentUser={user}
                        canMarkFixed={false}
                      />
                    </div>
                  )}

                  {!work.clientFeedback && (!work.corrections || work.corrections.length === 0) && (
                    <p className="no-corrections-text">No corrections or feedback yet.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CorrectionsView;
