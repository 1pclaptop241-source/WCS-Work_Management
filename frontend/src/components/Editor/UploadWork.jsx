import { useState, useEffect } from 'react';
import { worksAPI, projectsAPI, API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import './UploadWork.css';

const UploadWork = ({ project, workBreakdown, onClose }) => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  /* Removed finalRenderLink state */

  /* Removed special Final Render handling */

  useEffect(() => {
    loadSubmissions();
  }, [workBreakdown]); // Removed finalRenderLink dependency

  const loadSubmissions = async () => {
    try {
      const response = await worksAPI.getByWorkBreakdown(workBreakdown._id);
      setSubmissions(response.data);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    }
  };

  const [uploadType, setUploadType] = useState('file');
  const [linkUrl, setLinkUrl] = useState('');
  const [editorMessage, setEditorMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Standard Work Upload Logic applied to all types including Final Render
    if (uploadType === 'file' && !file) {
      setError('Please select a file to upload');
      return;
    }
    if (uploadType === 'link' && !linkUrl.trim()) {
      setError('Please provide a link URL');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setLoading(true);
      setError('');
      await worksAPI.upload(project._id, workBreakdown._id, uploadType === 'file' ? file : null, uploadType === 'link' ? linkUrl : null, editorMessage);
      setSuccess(true);
      loadSubmissions(); // Reload to show new submission
      setFile(null);
      setLinkUrl('');
      setEditorMessage('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload work');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            Upload Work: {workBreakdown.workType}
          </h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">Work uploaded successfully!</div>}

          <div className="work-details">
            <p><strong>Project:</strong> {project.title}</p>
            <p><strong>Deadline:</strong> {formatDate(workBreakdown.deadline)}</p>
            <p><strong>Amount:</strong> {workBreakdown.amount} {project.currency}</p>
          </div>

          {/* Client Script Section */}
          {project.scriptFile && (
            <div className="client-script-section" style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              border: '2px solid #2E86AB'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                color: '#2E86AB',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📄</span> Client Script
              </h3>
              <div style={{
                padding: '12px',
                backgroundColor: 'white',
                borderRadius: '6px',
                border: '1px solid #90caf9'
              }}>
                <a
                  href={project.scriptFile.match(/^https?:\/\//) ? project.scriptFile : (project.scriptFile.startsWith('/') || project.scriptFile.startsWith('uploads') ? `${API_BASE_URL}${project.scriptFile}` : `https://${project.scriptFile}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#f0f8ff',
                    border: '1px solid #2E86AB',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    color: '#2E86AB',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2E86AB';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f8ff';
                    e.currentTarget.style.color = '#2E86AB';
                  }}
                >
                  <span style={{ fontSize: '18px' }}>📥</span>
                  <span style={{ flex: 1 }}>Download Script File</span>
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>↗</span>
                </a>
              </div>
            </div>
          )}

          {/* Admin Shared Details & Links */}
          {(workBreakdown.shareDetails || (workBreakdown.links && workBreakdown.links.length > 0)) && (
            <div className="admin-shared-section" style={{
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#e8f5f1',
              borderRadius: '8px',
              border: '2px solid #06A77D'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '16px',
                color: '#06A77D',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📋</span> Admin Instructions & Resources
              </h3>

              {workBreakdown.shareDetails && (
                <div style={{
                  marginBottom: workBreakdown.links && workBreakdown.links.length > 0 ? '16px' : '0',
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #d0e8df'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#666',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Details:
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#333',
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {workBreakdown.shareDetails}
                  </div>
                </div>
              )}

              {workBreakdown.links && workBreakdown.links.length > 0 && (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #d0e8df'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#666',
                    marginBottom: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Shared Links:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {workBreakdown.links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 14px',
                          backgroundColor: '#f8fffe',
                          border: '1px solid #06A77D',
                          borderRadius: '6px',
                          textDecoration: 'none',
                          color: '#06A77D',
                          fontSize: '14px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#06A77D';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fffe';
                          e.currentTarget.style.color = '#06A77D';
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>🔗</span>
                        <span style={{ flex: 1 }}>{link.title || `Link ${idx + 1}`}</span>
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Previous Submissions & Corrections */}
          {submissions.length > 0 && (
            <div className="previous-submissions">
              <h3>History & Corrections</h3>
              {submissions.map((sub) => (
                <div key={sub._id} className="submission-item">
                  <div className="submission-header">
                    {sub.submissionType === 'link' ? (
                      <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="submission-link">
                        🔗 {sub.fileName}
                      </a>
                    ) : (
                      <a href={sub.fileUrl.match(/^https?:\/\//) ? sub.fileUrl : (sub.fileUrl.startsWith('/') || sub.fileUrl.startsWith('uploads') ? `${API_BASE_URL}${sub.fileUrl}` : `https://${sub.fileUrl}`)} target="_blank" rel="noopener noreferrer" className="submission-link">
                        📁 {sub.fileName}
                      </a>
                    )}
                    <span className={`badge ${sub.status === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                      {sub.status}
                    </span>
                    <span className="date">{formatDateTime(sub.submittedAt)}</span>
                  </div>

                  {/* Corrections Display */}
                  {sub.corrections && sub.corrections.length > 0 && (
                    <div className="corrections-container">
                      <h4>Corrections Requested ({sub.corrections.filter(c => !c.done).length} pending, {sub.corrections.filter(c => c.done).length} completed):</h4>
                      <ul>
                        {sub.corrections.map((corr, idx) => (
                          <li key={idx} className={corr.done ? 'correction-done' : 'correction-pending'}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                {formatDateTime(corr.addedAt)}
                              </span>
                              <span className="status-label" style={{ fontWeight: 'bold', color: corr.done ? '#28a745' : '#ffc107' }}>
                                {corr.done ? '✓ Fixed' : '⚠ Needs Fix'}
                              </span>
                            </div>
                            {corr.text && <div className="correction-text" style={{ display: 'block', marginTop: '5px', marginBottom: '10px', fontWeight: '500', fontSize: '14px', color: '#333', padding: '10px', background: '#f8f9fa', borderRadius: '6px', borderLeft: '3px solid #ffc107' }}>{corr.text}</div>}
                            {corr.voiceFile && (
                              <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: '500' }}>🎤 Voice Note:</div>
                                <audio controls src={corr.voiceFile.match(/^https?:\/\//) ? corr.voiceFile : (corr.voiceFile.startsWith('/') || corr.voiceFile.startsWith('uploads') ? `${API_BASE_URL}${corr.voiceFile}` : `https://${corr.voiceFile}`)} style={{ display: 'block', width: '100%', maxWidth: '400px' }} />
                              </div>
                            )}
                            {corr.mediaFiles && corr.mediaFiles.length > 0 && (
                              <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px', fontWeight: '500' }}>📎 Attachments:</div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {corr.mediaFiles.map((m, idx) => (
                                    <a key={idx} href={m.match(/^https?:\/\//) ? m : (m.startsWith('/') || m.startsWith('uploads') ? `${API_BASE_URL}${m}` : `https://${m}`)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#06A77D', textDecoration: 'none', padding: '6px 12px', background: '#e8f5f1', borderRadius: '6px', border: '1px solid #06A77D', fontWeight: '500' }}>
                                      📄 File {idx + 1}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {sub.clientFeedback && (
                    <div className="client-feedback">
                      <strong>Additional Feedback:</strong> {sub.clientFeedback}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <hr className="divider" />

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <div className="tabs-container">
                <button type="button" className={`tab-button ${uploadType === 'file' ? 'active' : ''}`} onClick={() => setUploadType('file')}>File Upload</button>
                <button type="button" className={`tab-button ${uploadType === 'link' ? 'active' : ''}`} onClick={() => setUploadType('link')}>Link URL</button>
              </div>

              {uploadType === 'file' ? (
                <>
                  <label className="form-label">Upload File</label>
                  <input
                    type="file"
                    className="form-input"
                    onChange={handleFileChange}
                    required
                  />
                  {file && (
                    <p className="file-name">
                      Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </>
              ) : (
                <>
                  <label className="form-label">Link URL</label>
                  <input
                    type="url"
                    className="form-input"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com/work-submission"
                    required
                  />
                </>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label className="form-label">Changelog / Notes (Optional)</label>
              <textarea
                className="form-input"
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={editorMessage}
                onChange={(e) => setEditorMessage(e.target.value)}
                placeholder="Describe what you changed or add any notes for the reviewer..."
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || (uploadType === 'file' ? !file : !linkUrl)}>
                {loading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadWork;

