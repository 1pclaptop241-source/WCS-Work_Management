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

                    // Derive explicit status for badge
                    let statusForBadge = 'pending';
                    if (isApproved) statusForBadge = 'approved';
                    else if (hasPendingCorrections) statusForBadge = 'needs_revision';
                    else if (hasUpload) statusForBadge = 'under_review';
                    else statusForBadge = 'assigned'; // or 'pending'

                    return (
                      <div key={bd._id} className="work-item" style={{ borderLeft: isApproved ? '4px solid green' : '4px solid #ddd', marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
                        <div className="work-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '16px', color: '#2E86AB' }}>{bd.workType}</strong>
                              {work?.version && (
                                <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#475569', fontSize: '0.7em', border: '1px solid #cbd5e1' }}>
                                  v{work.version}
                                </span>
                              )}
                            </div>
                            {user.role === 'admin' && <div className="price-tag" style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>{project.currency} {bd.amount}</div>}
                            {hasUpload ? (
                              <p className="work-date" style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                Latest Submission: {work.fileName} ({formatDate(work.submittedAt)})
                              </p>
                            ) : (
                              <p className="work-date italic" style={{ fontSize: '12px', color: '#999', marginTop: '5px', fontStyle: 'italic' }}>Waiting for editor...</p>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <StatusBadge status={statusForBadge} />
                            <WorkTypeMenu workBreakdown={bd} onViewDetails={handleViewWorkTypeDetails} />
                          </div>
                        </div>

                        <div className="work-actions" style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                          {hasUpload ? (
                            <>
                              {work.fileUrl && (
                                <a
                                  href={work.submissionType === 'link'
                                    ? (work.fileUrl.match(/^https?:\/\//) || work.fileUrl.match(/^\/\//) ? work.fileUrl : `https://${work.fileUrl}`)
                                    : `${API_BASE_URL}${work.fileUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-primary btn-sm"
                                >
                                  {work.submissionType === 'link' ? 'View Link' : 'Download File'}
                                </a>
                              )}

                              {(user.role === 'client' || user.role === 'admin') && (
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => {
                                    setSelectedSubmission(work);
                                    setCorrectionText('');
                                    setVoiceFile(null);
                                    setMediaFiles([]);
                                    setShowCorrectionsModal(true);
                                  }}
                                >
                                  Request Corrections
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
                                  {isApprovingWork === bd._id ? 'Approving...' : 'Approve Work'}
                                </button>
                              )}
                              {isApproved && <span style={{ color: 'green', fontWeight: 'bold', padding: '5px' }}>Approved</span>}
                            </>
                          ) : (
                            <button className="btn btn-primary btn-sm" disabled>
                              Awaiting Upload
                            </button>
                          )}

                          {(user.role === 'admin' || user.role === 'client') && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => focusFeedback(bd._id)}
                            >
                              💬 Give Feedback
                            </button>
                          )}
                        </div>

                        {/* Work File Section */}
                        {console.log('Work Item Debug:', { workId: work?._id, hasUpload, workFileUrl: work?.workFileUrl, work })}
                        {hasUpload && (
                          work.workFileUrl ? (
                            <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#fafafa' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <strong>📦 Source / Work File:</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '11px', color: '#666' }}>Client Visibility:</span>
                                  <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '34px', height: '20px' }}>
                                    <input
                                      type="checkbox"
                                      checked={work.isWorkFileVisibleToClient}
                                      onChange={() => handleToggleVisibility(work._id)}
                                      style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                      position: 'absolute',
                                      cursor: 'pointer',
                                      top: 0, left: 0, right: 0, bottom: 0,
                                      backgroundColor: work.isWorkFileVisibleToClient ? '#2196F3' : '#ccc',
                                      transition: '.4s',
                                      borderRadius: '34px'
                                    }}>
                                      <span style={{
                                        position: 'absolute',
                                        content: '""',
                                        height: '12px',
                                        width: '12px',
                                        left: work.isWorkFileVisibleToClient ? '26px' : '4px',
                                        bottom: '4px',
                                        backgroundColor: 'white',
                                        transition: '.4s',
                                        borderRadius: '50%',
                                        transform: work.isWorkFileVisibleToClient ? 'translateX(-100%)' : 'translateX(0)'
                                      }}></span>
                                    </span>
                                  </label>
                                </div>
                              </div>
                              <a
                                href={work.workFileUrl.match(/^https?:\/\//) ? work.workFileUrl : (work.workFileUrl.startsWith('/') ? `${API_BASE_URL}${work.workFileUrl}` : `https://${work.workFileUrl}`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '13px', color: '#0366d6', textDecoration: 'none' }}
                              >
                                {work.workSubmissionType === 'link' || !work.workFileUrl.includes('cloudinary') ? '🔗 Open Source Link' : '⬇️ Download Source File'} ({work.workFileName || 'File'})
                              </a>
                            </div>
                          ) : (
                            <div style={{ marginTop: '10px', padding: '10px', border: '1px dashed #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9', color: '#666', fontSize: '13px', fontStyle: 'italic' }}>
                              No source file or link uploaded for this work.
                            </div>
                          )
                        )}

                        {/* Editor Message */}
                        {hasUpload && work.editorMessage && (
                          <div style={{ marginTop: '10px', padding: '12px', background: '#e3f2fd', borderRadius: '4px', borderLeft: '4px solid #2196f3' }}>
                            <strong style={{ color: '#1976d2', fontSize: '14px' }}>📝 Editor's Note:</strong>
                            <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', color: '#333', fontSize: '14px', lineHeight: '1.5' }}>{work.editorMessage}</p>
                          </div>
                        )}

                        {/* Work Feedback Section (Admin/Client General Chat for this work type) */}
                        <div style={{ marginTop: '15px', padding: '15px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💬 Work Feedback & Discussion
                          </h4>

                          {/* Feedback List */}
                          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: bd.feedback?.length > 0 ? '15px' : '0', paddingRight: '5px' }}>
                            {bd.feedback && bd.feedback.length > 0 ? (
                              bd.feedback.map((f, i) => (
                                <div key={i} style={{
                                  marginBottom: '8px',
                                  padding: '8px 12px',
                                  background: f.from?._id === user._id ? '#e0f2fe' : 'white',
                                  borderRadius: '12px',
                                  border: '1px solid #e2e8f0',
                                  alignSelf: f.from?._id === user._id ? 'flex-end' : 'flex-start',
                                  maxWidth: '90%'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '2px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>{f.from?.name || 'User'} ({f.from?.role})</span>
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{formatDateTime(f.timestamp)}</span>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>{f.content}</p>
                                </div>
                              ))
                            ) : (
                              <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>No feedback yet. Add your first comment below.</p>
                            )}
                          </div>

                          {/* Add Feedback Input */}
                          {(user.role === 'admin' || user.role === 'client') && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                id={`feedback-input-${bd._id}`}
                                type="text"
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  borderRadius: '20px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '13px',
                                  outline: 'none'
                                }}
                                placeholder="Write your feedback..."
                                value={feedbackText[bd._id] || ''}
                                onChange={(e) => setFeedbackText(prev => ({ ...prev, [bd._id]: e.target.value }))}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddFeedback(bd._id)}
                              />
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ borderRadius: '20px', padding: '0 15px' }}
                                onClick={() => handleAddFeedback(bd._id)}
                                disabled={isSubmittingFeedback === bd._id || !feedbackText[bd._id]?.trim()}
                              >
                                {isSubmittingFeedback === bd._id ? '...' : 'Send'}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Corrections & Feedback based on Submissions */}
                        {(() => {
                          const allCorrections = getAllCorrectionsForBreakdown(bd._id);
                          return allCorrections.length > 0 && (
                            <div style={{ marginTop: '10px', padding: '10px', background: '#fff3e0', borderRadius: '4px' }}>
                              <div style={{ marginTop: '10px' }}>
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

