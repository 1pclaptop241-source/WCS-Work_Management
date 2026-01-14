import { useState, useEffect } from 'react';
import { workBreakdownAPI, worksAPI, API_BASE_URL } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import VoiceRecorder from '../common/VoiceRecorder';
import WorkTypeMenu from '../common/WorkTypeMenu';
import WorkTypeDetailsModal from '../common/WorkTypeDetailsModal';
import FeedbackChat from '../common/FeedbackChat';
import StatusBadge from '../common/StatusBadge';
import './ProjectDetailView.css';

const ProjectDetailView = ({ project, onClose, onUpdate }) => {
  const { user } = useAuth();
  const { confirm, showAlert } = useDialog();
  const [workBreakdown, setWorkBreakdown] = useState([]);
  const [workSubmissions, setWorkSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWorkType, setSelectedWorkType] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showWorkTypeDetails, setShowWorkTypeDetails] = useState(false);
  const [selectedWorkTypeForDetails, setSelectedWorkTypeForDetails] = useState(null);
  const [feedbackText, setFeedbackText] = useState({}); // { [workBreakdownId]: text }

  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(null); // stores breakdown ID
  const [adminInstructionsInput, setAdminInstructionsInput] = useState({});
  const [isSavingAdminInstructions, setIsSavingAdminInstructions] = useState(null);


  useEffect(() => {
    loadWorkBreakdown();
  }, [project._id]);

  useEffect(() => {
    if (workBreakdown.length > 0) {
      loadWorkSubmissions();
    }
  }, [workBreakdown]);

  const loadWorkBreakdown = async () => {
    try {
      setLoading(true);
      const response = await workBreakdownAPI.getByProject(project._id);
      setWorkBreakdown(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load work breakdown');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkSubmissions = async () => {
    try {
      const submissions = {};
      for (const work of workBreakdown) {
        try {
          const response = await worksAPI.getByWorkBreakdown(work._id);
          submissions[work._id] = response.data;
        } catch (err) {
          submissions[work._id] = [];
        }
      }
      setWorkSubmissions(submissions);
    } catch (err) {
      console.error('Failed to load work submissions:', err);
    }
  };

  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [markingFixId, setMarkingFixId] = useState(null);
  const [isApprovingWork, setIsApprovingWork] = useState(null); // stores breakdown ID
  const [isClosingProject, setIsClosingProject] = useState(false);
  const [isApprovingProject, setIsApprovingProject] = useState(false);

  const handleAddCorrection = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      if (!correctionText.trim() && !voiceFile && mediaFiles.length === 0) {
        await showAlert('Please provide correction details (text, voice, or files)', 'Validation Error');
        return;
      }

      setIsSubmittingCorrection(true);
      setError('');
      await worksAPI.addCorrections(selectedSubmission._id, correctionText, voiceFile, mediaFiles);
      setShowCorrectionsModal(false);
      setSelectedSubmission(null);
      setCorrectionText('');
      setVoiceFile(null);
      setMediaFiles([]);
      await loadWorkSubmissions();
      await loadWorkBreakdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add correction');
      showAlert(err.response?.data?.message || 'Failed to add correction', 'Error');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleMarkCorrectionDone = async (submissionId, correctionId) => {
    try {
      setMarkingFixId(correctionId);
      setError('');
      await worksAPI.markCorrectionDone(submissionId, correctionId);
      await loadWorkSubmissions();
      await loadWorkBreakdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark correction as done');
      showAlert(err.response?.data?.message || 'Failed to mark correction as done', 'Error');
    } finally {
      setMarkingFixId(null);
    }
  };

  const handleAddFeedback = async (workBreakdownId) => {
    const text = feedbackText[workBreakdownId];
    if (!text || !text.trim()) return;

    try {
      setIsSubmittingFeedback(workBreakdownId);
      await workBreakdownAPI.addFeedback(workBreakdownId, text);
      setFeedbackText(prev => ({ ...prev, [workBreakdownId]: '' }));
      await loadWorkBreakdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add feedback');
      showAlert(err.response?.data?.message || 'Failed to add feedback', 'Error');
    } finally {
      setIsSubmittingFeedback(null);
    }
  };

  const handleSaveAdminInstructions = async (workBreakdownId) => {
    const text = adminInstructionsInput[workBreakdownId];
    if (text === undefined) return;

    try {
      setIsSavingAdminInstructions(workBreakdownId);
      await workBreakdownAPI.update(workBreakdownId, { adminInstructions: text });
      await loadWorkBreakdown();
      showAlert('Admin instructions saved', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save instructions');
    } finally {
      setIsSavingAdminInstructions(null);
    }
  };

  const handleToggleVisibility = async (workId) => {
    try {
      await worksAPI.toggleWorkFileVisibility(workId);
      await loadWorkSubmissions(); // Reload to update state
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      showAlert('Failed to toggle visibility', 'Error');
    }
  };

  const focusFeedback = (bdId) => {
    const input = document.getElementById(`feedback-input-${bdId}`);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  const handleVoiceRecordingComplete = (audioBlob) => {
    setVoiceFile(audioBlob);
    setShowVoiceRecorder(false);
  };

  const handleMediaChange = (e) => {
    setMediaFiles(Array.from(e.target.files));
  };

  const calculateProgress = () => {
    if (workBreakdown.length === 0) return 0;
    const totalPct = workBreakdown.reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
    const donePct = workBreakdown
      .filter(w => w.approved === true)
      .reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
    return totalPct > 0 ? (donePct / totalPct) * 100 : 0;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'badge-secondary',
      in_progress: 'badge-primary',
      completed: 'badge-success',
    };
    return statusMap[status] || 'badge-secondary';
  };

  const getAllSubmissionsForBreakdown = (breakdownId) => {
    const submissions = workSubmissions[breakdownId] || [];
    return submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  };

  const getAllCorrectionsForBreakdown = (breakdownId) => {
    const allSubs = getAllSubmissionsForBreakdown(breakdownId);
    const allCorrections = [];
    allSubs.forEach(sub => {
      if (sub.corrections && sub.corrections.length > 0) {
        sub.corrections.forEach(corr => {
          allCorrections.push({ ...corr, workId: sub._id });
        });
      }
    });
    return allCorrections;
  };

  const handleViewWorkTypeDetails = (workBreakdown) => {
    setSelectedWorkTypeForDetails(workBreakdown);
    setShowWorkTypeDetails(true);
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  const progress = calculateProgress();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Project Details - {project.title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Project Information */}
          <div className="card">
            <div className="card-header">
              <h3>Project Information</h3>
            </div>
            <div className="card-body">
              <p><strong>Client:</strong> {project.client?.name} ({project.client?.email})</p>
              <p>
                <strong>
                  Description:
                  {project.editedFields?.description && project.accepted && (
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem', marginLeft: '8px' }}>Edited</span>
                  )}
                </strong> {project.description}
              </p>
              <p><strong>Amount:</strong> {project.currency} {project.amount?.toLocaleString()}</p>
              <p>
                <strong>
                  Deadline:
                  {project.editedFields?.deadline && project.accepted && (
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem', marginLeft: '8px' }}>Edited</span>
                  )}
                </strong> {formatDateTime(project.deadline)}
              </p>
              {project.rawFootageLinks && project.rawFootageLinks.length > 0 && (
                <div>
                  <strong>
                    Raw Footage Links:
                    {project.editedFields?.rawFootageLinks && project.accepted && (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem', marginLeft: '8px' }}>Edited</span>
                    )}
                  </strong>
                  <ul>
                    {project.rawFootageLinks.map((link, idx) => (
                      <li key={idx}>
                        <a
                          href={link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {project.scriptFile && (
                <p><strong>Script:</strong> <a
                  href={project.scriptFile.match(/^https?:\/\//) ? project.scriptFile : `https://${project.scriptFile}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download Script
                </a></p>
              )}
              {project.projectDetails && (
                <div>
                  <strong>
                    Project Details:
                    {project.editedFields?.projectDetails && project.accepted && (
                      <span className="badge badge-warning" style={{ fontSize: '0.7rem', marginLeft: '8px' }}>Edited</span>
                    )}
                  </strong>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{project.projectDetails}</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="card">
            <div className="card-header">
              <h3>Overall Progress</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>Completion</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div style={{ width: '100%', height: '30px', backgroundColor: '#e0e0e0', borderRadius: '15px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: '#06A77D',
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {Math.round(progress)}%
                </div>
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div className="card">
            <div className="card-header">
              <h3>Work Status</h3>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Work Type</th>
                      <th>Assigned Editor</th>
                      <th>Status</th>
                      <th>Deadline</th>
                      {user.role === 'admin' && <th>Amount</th>}
                      <th>Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={user.role === 'admin' ? "6" : "5"} className="text-center">No work breakdown found</td>
                      </tr>
                    ) : (
                      workBreakdown.map((work) => (
                        <tr key={work._id}>
                          <td>{work.workType}</td>
                          <td>{work.assignedEditor?.name || 'N/A'}</td>
                          <td>
                            {(() => {
                              const submissions = workSubmissions[work._id] || [];
                              const hasSubmission = submissions.length > 0;
                              const adminApproved = work.approvals?.admin || false;
                              const clientApproved = work.approvals?.client || false;
                              const bothApproved = adminApproved && clientApproved;

                              // Determine status based on conditions
                              let statusText, statusClass;
                              if (bothApproved) {
                                statusText = 'Completed';
                                statusClass = 'badge-success';
                              } else if (hasSubmission) {
                                statusText = 'Under Review';
                                statusClass = 'badge-warning';
                              } else {
                                statusText = 'Pending';
                                statusClass = 'badge-secondary';
                              }

                              return (
                                <span className={`badge ${statusClass}`}>
                                  {statusText}
                                </span>
                              );
                            })()}
                          </td>
                          <td>{user.role === 'admin' ? formatDateTime(work.deadline) : formatDate(work.deadline)}</td>
                          {user.role === 'admin' && (
                            <td>
                              {project.currency} {work.amount?.toFixed(2)}
                              {(() => {
                                const submissions = workSubmissions[work._id] || [];
                                const latestSubmission = submissions.length > 0
                                  ? submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]
                                  : null;
                                const deadline = new Date(work.deadline);
                                const now = new Date();

                                if (now > deadline && !work.approved) {
                                  return (
                                    <div style={{ fontSize: '10px', color: '#dc3545', fontWeight: 'bold', marginTop: '4px' }}>
                                      ⚠ Overdue (Penalty accruing)
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </td>
                          )}
                          <td>
                            {(() => {
                              const submissions = workSubmissions[work._id] || [];
                              const latestSubmission = submissions.length > 0
                                ? submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]
                                : null;
                              /* Fixed work type check */
                              const adminApproved = work.approvals?.admin || false;
                              const clientApproved = work.approvals?.client || false;

                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Admin:</span>
                                    {adminApproved ? (
                                      <span className="badge badge-success" style={{ fontSize: '10px' }}>✓</span>
                                    ) : (
                                      <span className="badge badge-secondary" style={{ fontSize: '10px' }}>✗</span>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Client:</span>
                                    {clientApproved ? (
                                      <span className="badge badge-success" style={{ fontSize: '10px' }}>✓</span>
                                    ) : (
                                      <span className="badge badge-secondary" style={{ fontSize: '10px' }}>✗</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Work Items and Corrections */}
          <div className="card">
            <div className="card-header">
              <h3>Work Items and Corrections</h3>
            </div>
            <div className="card-body">
              {workBreakdown.length === 0 ? (
                <p>No work breakdown defined.</p>
              ) : (
                <div className="works-list">
                  {workBreakdown.map((bd) => {
                    const submissions = workSubmissions[bd._id] || [];
                    const work = submissions.length > 0
                      ? submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]
                      : null;

                    const hasUpload = !!work;
                    const hasPendingCorrections = getAllCorrectionsForBreakdown(bd._id).some(c => !c.done);
                    const isApproved = bd.approved;

                    // Determine styling classes
                    let itemStatusClass = 'status-pending';
                    if (isApproved) itemStatusClass = 'status-approved';
                    else if (hasPendingCorrections) itemStatusClass = 'status-needs-revision';
                    else if (hasUpload) itemStatusClass = 'status-under-review';

                    return (
                      <div key={bd._id} className={`work-item ${itemStatusClass}`}>
                        <div className="work-item-header">
                          <div className="header-left">
                            <span className="work-type-title">{bd.workType}</span>
                            {work?.version && (
                              <span className="version-badge">v{work.version}</span>
                            )}
                          </div>
                          <div className="header-right">
                            {user.role === 'admin' && (
                              <span className="price-tag">{project.currency} {bd.amount}</span>
                            )}
                            <div className="work-actions-top">
                              <WorkTypeMenu workBreakdown={bd} onViewDetails={handleViewWorkTypeDetails} />
                            </div>
                          </div>
                        </div>

                        <div className="work-item-info">
                          <div className="info-row">
                            <span className="info-label">Assigned to:</span>
                            <span className="info-value">{bd.assignedEditor?.name || 'Unassigned'}</span>
                          </div>
                          <div className="info-row">
                            <span className="info-label">Status:</span>
                            <StatusBadge status={isApproved ? 'approved' : (hasPendingCorrections ? 'needs_revision' : (hasUpload ? 'under_review' : 'pending'))} />
                          </div>
                          {hasUpload ? (
                            <div className="info-row">
                              <span className="info-label">Latest:</span>
                              <span className="info-value">
                                {work.fileName} <span className="text-muted">({formatDate(work.submittedAt)})</span>
                              </span>
                            </div>
                          ) : (
                            <div className="info-row">
                              <span className="info-value text-muted italic">Waiting for upload...</span>
                            </div>
                          )}
                        </div>

                        {/* Instructions Section */}
                        <div className="instructions-section" style={{ marginTop: '15px', padding: '15px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
                              Client Instructions:
                            </label>
                            <div style={{ padding: '8px', background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', minHeight: '40px' }}>
                              {bd.clientInstructions ? (
                                <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{bd.clientInstructions}</p>
                              ) : (
                                <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>No instructions provided.</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
                              Admin Instructions (to Editor):
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <textarea
                                className="form-control"
                                style={{ flex: 1, minHeight: '60px', fontSize: '0.9rem' }}
                                rows="2"
                                placeholder="Add instructions for the editor..."
                                value={adminInstructionsInput[bd._id] !== undefined ? adminInstructionsInput[bd._id] : (bd.adminInstructions || '')}
                                onChange={(e) => setAdminInstructionsInput(prev => ({ ...prev, [bd._id]: e.target.value }))}
                              />
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSaveAdminInstructions(bd._id)}
                                disabled={isSavingAdminInstructions === bd._id}
                                style={{ height: 'auto', alignSelf: 'flex-start' }}
                              >
                                {isSavingAdminInstructions === bd._id ? '...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="work-item-actions">
                          {hasUpload ? (
                            <>
                              {work.fileUrl && (
                                <a
                                  href={work.submissionType === 'link'
                                    ? (work.fileUrl.match(/^https?:\/\//) || work.fileUrl.match(/^\/\//) ? work.fileUrl : `https://${work.fileUrl}`)
                                    : `${API_BASE_URL}${work.fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline-primary btn-sm"
                                >
                                  {work.submissionType === 'link' ? '🔗 View Link' : '⬇️ Download File'}
                                </a>
                              )}

                              {(user.role === 'client' || user.role === 'admin') && (
                                <button
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => {
                                    setSelectedSubmission(work);
                                    setCorrectionText('');
                                    setVoiceFile(null);
                                    setMediaFiles([]);
                                    setShowCorrectionsModal(true);
                                  }}
                                >
                                  📝 Request Changes
                                </button>
                              )}

                              {!isApproved && (user.role === 'admin' || user.role === 'client') && (
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={async () => {
                                    const isConfirmed = await confirm({
                                      title: `Approve ${bd.workType}?`,
                                      message: `Are you sure you want to approve ${bd.workType}? Both admin and client must approve to mark it done.`,
                                      confirmText: 'Approve'
                                    });

                                    if (isConfirmed) {
                                      try {
                                        setIsApprovingWork(bd._id);
                                        setError('');
                                        await workBreakdownAPI.approve(bd._id);
                                        await loadWorkBreakdown();
                                        await loadWorkSubmissions();
                                        await onUpdate();
                                      } catch (e) {
                                        setError(e.response?.data?.message || 'Failed to approve');
                                        showAlert(e.response?.data?.message || 'Failed to approve', 'Error');
                                      } finally {
                                        setIsApprovingWork(null);
                                      }
                                    }
                                  }}
                                  disabled={isApprovingWork === bd._id || hasPendingCorrections}
                                  title={hasPendingCorrections ? "Complete all corrections first" : "Approve this work"}
                                >
                                  {isApprovingWork === bd._id ? 'Approving...' : '✓ Approve Work'}
                                </button>
                              )}

                              {isApproved && (
                                <div className="approved-indicator">
                                  <span>✓ Approved</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <button className="btn btn-secondary btn-sm" disabled>
                              Awaiting Upload
                            </button>
                          )}

                          {(user.role === 'admin' || user.role === 'client') && (
                            <button
                              className="btn btn-link btn-sm"
                              onClick={() => focusFeedback(bd._id)}
                            >
                              💬 Discussion
                            </button>
                          )}
                        </div>

                        {hasUpload && work.workFileUrl && (
                          <div className="work-source-file">
                            <div className="source-header">
                              <strong>📦 Source / Work File</strong>
                              <div className="visibility-toggle">
                                <span className="toggle-label">Client Access:</span>
                                <label className="switch-sm">
                                  <input
                                    type="checkbox"
                                    checked={work.isWorkFileVisibleToClient}
                                    onChange={() => handleToggleVisibility(work._id)}
                                  />
                                  <span className="slider round"></span>
                                </label>
                              </div>
                            </div>
                            <a
                              href={work.workFileUrl.match(/^https?:\/\//) ? work.workFileUrl : (work.workFileUrl.startsWith('/') ? `${API_BASE_URL}${work.workFileUrl}` : `https://${work.workFileUrl}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="source-link"
                            >
                              {work.workSubmissionType === 'link' || !work.workFileUrl.includes('cloudinary') ? '🔗 Open Source Link' : '⬇️ Download Source File'}
                              <span className="file-name">({work.workFileName || 'File'})</span>
                            </a>
                          </div>
                        )}

                        {/* Editor Message */}
                        {hasUpload && work.editorMessage && (
                          <div className="editor-note">
                            <strong>📝 Editor's Note:</strong>
                            <p>{work.editorMessage}</p>
                          </div>
                        )}

                        {/* Feedback Section */}
                        <div className="feedback-section">
                          <h4 className="feedback-title">
                            💬 Work Feedback & Discussion
                          </h4>
                          <div className="feedback-messages">
                            {bd.feedback && bd.feedback.length > 0 ? (
                              bd.feedback.map((f, i) => (
                                <div key={i} className={`feedback-message ${f.from?._id === user._id ? 'sent' : 'received'}`}>
                                  <div className="message-header">
                                    <span className="sender-name">{f.from?.name || 'User'} ({f.from?.role})</span>
                                    <span className="message-time">{formatDateTime(f.timestamp)}</span>
                                  </div>
                                  <p className="message-content">{f.content}</p>
                                </div>
                              ))
                            ) : (
                              <p className="no-feedback">No feedback yet.</p>
                            )}
                          </div>

                          {/* Add Feedback Input */}
                          {(user.role === 'admin' || user.role === 'client') && (
                            <div className="feedback-input-group">
                              <input
                                id={`feedback-input-${bd._id}`}
                                type="text"
                                className="form-control"
                                placeholder="Write your feedback..."
                                value={feedbackText[bd._id] || ''}
                                onChange={(e) => setFeedbackText(prev => ({ ...prev, [bd._id]: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddFeedback(bd._id)}
                              />
                              <button
                                className="btn btn-primary btn-sm btn-icon"
                                onClick={() => handleAddFeedback(bd._id)}
                                disabled={isSubmittingFeedback === bd._id || !feedbackText[bd._id]?.trim()}
                              >
                                ➤
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Corrections & Feedback based on Submissions */}
                        {(() => {
                          const allCorrections = getAllCorrectionsForBreakdown(bd._id);
                          return allCorrections.length > 0 && (
                            <div className="technical-corrections">
                              <strong>Technical Corrections:</strong>
                              <FeedbackChat
                                corrections={allCorrections}
                                currentUser={user}
                                canMarkFixed={true}
                                markingId={markingFixId}
                                onMarkFixed={(correctionId) => {
                                  // Find correction to get workId
                                  const corr = allCorrections.find(c => c._id === correctionId);
                                  if (corr) handleMarkCorrectionDone(corr.workId, correctionId);
                                }}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {user.role === 'client' && !project.clientApproved && (
              <button
                className="btn btn-success"
                disabled={isApprovingProject}
                onClick={async () => {
                  const isConfirmed = await confirm({
                    title: 'Approve Project',
                    message: 'Are you sure you want to approve this project?',
                    confirmText: 'Approve Project'
                  });

                  if (isConfirmed) {
                    try {
                      setIsApprovingProject(true);
                      await projectsAPI.clientApprove(project._id);
                      await onUpdate();
                      await showAlert('Project approved successfully!', 'Success');
                    } catch (err) {
                      setError(err.response?.data?.message || 'Failed to approve project');
                    } finally {
                      setIsApprovingProject(false);
                    }
                  }
                }}
              >
                {isApprovingProject ? 'Approving...' : 'Approve Project'}
              </button>
            )}
            {user.role === 'admin' && project.clientApproved && project.adminApproved && Math.round(progress) >= 100 && !project.closed && (
              <button
                className="btn btn-danger"
                disabled={isClosingProject}
                onClick={async () => {
                  const isConfirmed = await confirm({
                    title: 'Close Project',
                    message: 'Are you sure you want to close this project? It will be hidden after 2 days and deleted after 7 days.',
                    confirmText: 'Close Project',
                    isDanger: true
                  });

                  if (isConfirmed) {
                    try {
                      setIsClosingProject(true);
                      await projectsAPI.closeProject(project._id);
                      await onUpdate();
                      await showAlert('Project closed successfully! Notifications sent to client and editors.', 'Success');
                    } catch (err) {
                      setError(err.response?.data?.message || 'Failed to close project');
                    } finally {
                      setIsClosingProject(false);
                    }
                  }
                }}
              >
                {isClosingProject ? 'Closing...' : 'Close Project'}
              </button>
            )}
          </div>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>

      {/* Corrections Modal */}
      {showCorrectionsModal && selectedSubmission && (
        <div className="modal-overlay" onClick={() => setShowCorrectionsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Corrections</h2>
              <button className="modal-close" onClick={() => setShowCorrectionsModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleAddCorrection} className="modal-body">
              <div className="form-group">
                <label className="form-label">Correction Details</label>
                <textarea
                  className="form-textarea"
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  rows="4"
                  placeholder="Describe what needs to be fixed..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Voice Note</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowVoiceRecorder(true)}>
                    {voiceFile ? 'Record New Voice Note' : 'Record Voice Note'}
                  </button>
                  {voiceFile && <span style={{ color: 'green' }}>Voice recorded</span>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reference Files (Images, Videos)</label>
                <input type="file" multiple onChange={handleMediaChange} className="form-input" />
                {mediaFiles.length > 0 && <p style={{ fontSize: '12px', marginTop: '5px' }}>{mediaFiles.length} files selected</p>}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isSubmittingCorrection}
                  onClick={() => setShowCorrectionsModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={isSubmittingCorrection}>
                  {isSubmittingCorrection ? 'Submitting...' : 'Submit Correction Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Recorder Modal */}
      {showVoiceRecorder && (
        <div className="modal-overlay" onClick={() => setShowVoiceRecorder(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              onCancel={() => setShowVoiceRecorder(false)}
            />
          </div>
        </div>
      )}

      {showWorkTypeDetails && selectedWorkTypeForDetails && (
        <WorkTypeDetailsModal
          workBreakdown={selectedWorkTypeForDetails}
          onClose={() => {
            setShowWorkTypeDetails(false);
            setSelectedWorkTypeForDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectDetailView;

