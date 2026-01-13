import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { worksAPI, projectsAPI, workBreakdownAPI, API_BASE_URL } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import ProjectDetails from './ProjectDetails';
import VoiceRecorder from '../common/VoiceRecorder';
import WorkTypeMenu from '../common/WorkTypeMenu';
import WorkTypeDetailsModal from '../common/WorkTypeDetailsModal';
import FeedbackChat from '../common/FeedbackChat';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDownload, FaEdit, FaCheck, FaComments, FaFileAlt, FaVideo, FaCheckCircle, FaRegCircle } from 'react-icons/fa';
import './WorkView.css';

const WorkView = ({ project, onBack, onUpdate }) => {
  const { user } = useAuth();
  const { confirm, showAlert } = useDialog();
  const [breakdowns, setBreakdowns] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWork, setSelectedWork] = useState(null);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
  const [approvingKey, setApprovingKey] = useState(null);
  const [showWorkTypeDetails, setShowWorkTypeDetails] = useState(false);
  const [selectedWorkTypeForDetails, setSelectedWorkTypeForDetails] = useState(null);
  const [feedbackText, setFeedbackText] = useState({});
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(null);


  // New state for corrections
  const [correctionText, setCorrectionText] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  useEffect(() => {
    loadData();
  }, [project]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bdResponse, worksResponse] = await Promise.all([
        workBreakdownAPI.getByProject(project._id),
        worksAPI.getByProject(project._id)
      ]);
      setBreakdowns(bdResponse.data);
      setSubmissions(worksResponse.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (work) => {
    if (!work || !work.fileUrl) return;
    let fileUrl = work.fileUrl;

    if (work.submissionType === 'link') {
      if (!fileUrl.match(/^https?:\/\//) && !fileUrl.match(/^\/\//)) {
        fileUrl = 'https://' + fileUrl;
      }
    } else {
      if (!fileUrl.startsWith('http') && !fileUrl.startsWith('//')) {
        fileUrl = `${API_BASE_URL}${work.fileUrl}`;
      }
    }
    window.open(fileUrl, '_blank');
  };

  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [markingFixId, setMarkingFixId] = useState(null);

  const handleSubmitCorrections = async (e) => {
    e.preventDefault();
    if (!selectedWork) return;

    if (!correctionText.trim() && !voiceFile && mediaFiles.length === 0) {
      await showAlert("Please provide some correction details (text, voice, or media).", "Validation Error");
      return;
    }

    try {
      setSubmittingCorrection(true);
      setError('');
      await worksAPI.addCorrections(selectedWork._id, correctionText, voiceFile, mediaFiles);
      setShowCorrectionsModal(false);
      setSelectedWork(null);
      setCorrectionText('');
      setVoiceFile(null);
      setMediaFiles([]);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit corrections');
      showAlert(err.response?.data?.message || 'Failed to submit corrections', 'Error');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleVoiceRecordingComplete = (audioBlob) => {
    setVoiceFile(audioBlob);
    setShowVoiceRecorder(false);
  };

  const handleMediaChange = (e) => {
    setMediaFiles(Array.from(e.target.files));
  };

  const handleMarkCorrectionDone = async (workId, correctionId) => {
    try {
      setMarkingFixId(correctionId);
      setError('');
      await worksAPI.markCorrectionDone(workId, correctionId);
      await loadData();
      if (onUpdate) onUpdate();
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
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add feedback');
      showAlert(err.response?.data?.message || 'Failed to add feedback', 'Error');
    } finally {
      setIsSubmittingFeedback(null);
    }
  };

  const focusFeedback = (bdId) => {
    const input = document.getElementById(`feedback-input-${bdId}`);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  const getLatestSubmission = (breakdownId) => {
    return submissions.filter(s => s.workBreakdown === breakdownId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
  };

  const getAllSubmissions = (breakdownId) => {
    return submissions.filter(s => s.workBreakdown === breakdownId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  };

  const getAllCorrections = (breakdownId) => {
    const allSubs = getAllSubmissions(breakdownId);
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

  return (
    <div className="work-view">
      <div className="work-view-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', flexWrap: 'nowrap' }}>
        <button
          title="Back to Projects"
          style={{
            padding: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: 'var(--primary-blue)',
            border: '1px solid #e2e8f0',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            width: '40px',
            height: '40px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            flexShrink: 0
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--primary-blue)';
            e.currentTarget.style.color = 'white';
            e.currentTarget.style.transform = 'translateX(-3px)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(46, 134, 171, 0.2)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            e.currentTarget.style.color = 'var(--primary-blue)';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
          }}
          onClick={onBack}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2 style={{
          margin: 0,
          fontSize: '1.5rem',
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>{project.title}</h2>
      </div>

      {/* Action Banner */}
      {(() => {
        const needsReview = breakdowns.some(bd => {
          const work = getLatestSubmission(bd._id);
          return work && !bd.approvals?.client; // Has submission but not yet client approved
        });

        if (needsReview) {
          return (
            <div style={{ margin: '0 20px 20px', padding: '15px', background: '#e3f2fd', borderLeft: '5px solid #2196f3', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '24px' }}>🔔</span>
              <div>
                <h4 style={{ margin: '0 0 5px', color: '#0d47a1' }}>Action Required</h4>
                <p style={{ margin: 0, color: '#333' }}>You have items ready for review. Please check the "Pending Approval" items below.</p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Progress Bar */}
      <div style={{ padding: '0 20px 20px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px', fontWeight: '600' }}>
          <span>Work Completion</span>
          <span>{(() => {
            const totalPct = breakdowns.reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
            const donePct = breakdowns
              .filter(w => w.approvals?.admin && w.approvals?.client)
              .reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
            const progress = totalPct > 0 ? (donePct / totalPct) * 100 : 0;
            return Math.round(progress);
          })()}%</span>
        </div>
        <div style={{ width: '100%', height: '12px', backgroundColor: '#e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${(() => {
                const totalPct = breakdowns.reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
                const donePct = breakdowns
                  .filter(w => w.approvals?.admin && w.approvals?.client)
                  .reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
                return totalPct > 0 ? (donePct / totalPct) * 100 : 0;
              })()}%`,
              height: '100%',
              backgroundColor: '#06A77D',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="work-content">
        <div className="works-section">
          <div className="section-header">
            <h3>Project Work Items</h3>
          </div>

          {loading ? (
            <div className="spinner"></div>
          ) : breakdowns.length === 0 ? (
            <div className="card"><p>No work breakdown defined.</p></div>
          ) : (
            <div className="works-list">
              <AnimatePresence>
                {breakdowns.map((bd, index) => {
                  const work = getLatestSubmission(bd._id);
                  const hasUpload = !!work;

                  const hasPendingCorrections = getAllCorrections(bd._id).some(c => !c.done);
                  const adminApproved = bd.approvals?.admin || false;
                  const clientApproved = bd.approvals?.client || false;
                  const isApproved = adminApproved && clientApproved;

                  let statusBadge;
                  if (!hasUpload) {
                    statusBadge = <span className="badge badge-secondary">Pending Upload</span>;
                  } else if (isApproved) {
                    statusBadge = <span className="badge badge-success">Approved</span>;
                  } else if (hasPendingCorrections) {
                    statusBadge = <span className="badge badge-warning">Needs Revision</span>;
                  } else {
                    statusBadge = <span className="badge badge-primary">Pending Approval</span>;
                  }

                  return (
                    <motion.div
                      key={bd._id}
                      className="work-item"
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        backgroundColor: '#fff',
                        marginBottom: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      layout
                    >
                      {/* Status Strip */}
                      <div style={{ height: '4px', background: isApproved ? '#10b981' : hasPendingCorrections ? '#f59e0b' : '#3b82f6', width: '100%' }} />

                      <div style={{ padding: '20px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                          <div>
                            <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2rem', color: '#1e293b' }}>{bd.workType}</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                              {hasUpload ? (
                                <>
                                  Latest Submission: <span style={{ fontWeight: 500 }}>{formatDate(work.submittedAt)}</span>
                                </>
                              ) : 'Waiting for submission...'}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {statusBadge}
                            <WorkTypeMenu workBreakdown={bd} onViewDetails={handleViewWorkTypeDetails} />
                          </div>
                        </div>

                        {/* Approval Status Steps (Only if uploaded) */}
                        {hasUpload && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            background: '#f8fafc',
                            padding: '10px 15px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '0.9rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: adminApproved ? '#059669' : '#64748b' }}>
                              {adminApproved ? <FaCheckCircle /> : <FaRegCircle />}
                              <span style={{ fontWeight: adminApproved ? 600 : 400 }}>Admin Review</span>
                            </div>
                            <div style={{ width: '1px', height: '15px', background: '#e2e8f0' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: clientApproved ? '#059669' : '#64748b' }}>
                              {clientApproved ? <FaCheckCircle /> : <FaRegCircle />}
                              <span style={{ fontWeight: clientApproved ? 600 : 400 }}>Client Review</span>
                            </div>
                          </div>
                        )}

                        <div className="work-actions">
                          {hasUpload ? (
                            <>
                              <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '15px' }}>
                                <button
                                  className="btn btn-primary"
                                  onClick={() => handleDownload(work)}
                                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }}
                                >
                                  <FaDownload />
                                  {work.submissionType === 'link' ? 'View Link' : 'Download File'}
                                </button>

                                <button
                                  className="btn btn-success"
                                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600, backgroundColor: isApproved ? '#94a3b8' : '#059669', borderColor: isApproved ? '#94a3b8' : '#059669', cursor: isApproved ? 'default' : 'pointer' }}
                                  disabled={isApproved}
                                  onClick={() => {
                                    if (isApproved) return;
                                    setSelectedWork(work);
                                    setCorrectionText('');
                                    setVoiceFile(null);
                                    setMediaFiles([]);
                                    setShowCorrectionsModal(true);
                                  }}
                                >
                                  <FaEdit />
                                  Request Changes
                                </button>
                              </div>

                              {!isApproved && !clientApproved && (
                                <button
                                  className="btn btn-success"
                                  style={{ width: '100%', marginBottom: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#10b981', borderColor: '#10b981' }}
                                  onClick={async () => {
                                    const isConfirmed = await confirm({
                                      title: `Approve ${bd.workType}?`,
                                      message: `This will mark ${bd.workType} as complete. Are you ready to finalize?`,
                                      confirmText: 'Approve & Finalize'
                                    });

                                    if (isConfirmed) {
                                      try {
                                        setApprovingKey(bd._id);
                                        await workBreakdownAPI.approve(bd._id);
                                        await loadData();
                                        if (onUpdate) onUpdate();
                                      } catch (e) {
                                        setError(e.response?.data?.message || 'Failed to approve');
                                      } finally {
                                        setApprovingKey(null);
                                      }
                                    }
                                  }}
                                  disabled={approvingKey === bd._id || hasPendingCorrections}
                                  title={hasPendingCorrections ? "Complete all corrections first" : "Approve this work"}
                                >
                                  {approvingKey === bd._id ? <span className="spinner-small" /> : <FaCheck />}
                                  {approvingKey === bd._id ? 'Finalizing...' : 'Approve Work'}
                                </button>
                              )}
                            </>
                          ) : (
                            <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                              <p style={{ margin: 0 }}>Editor is working on this task.</p>
                            </div>
                          )}

                          {hasUpload && work.workFileUrl && work.isWorkFileVisibleToClient && (
                            <div style={{ margin: '10px 0' }}>
                              <a
                                href={work.workFileUrl.match(/^https?:\/\//) ? work.workFileUrl : (work.workFileUrl.startsWith('/') ? `${API_BASE_URL}${work.workFileUrl}` : `https://${work.workFileUrl}`)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#64748b', textDecoration: 'none', padding: '6px 10px', borderRadius: '4px', background: '#f1f5f9' }}
                              >
                                {work.workSubmissionType === 'link' || !work.workFileUrl.includes('cloudinary') ? '🔗 Open Source Link' : '📦 Download Source File'}
                              </a>
                            </div>
                          )}

                          {/* Feedback Section */}
                          <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                            <div
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: focusFeedback ? '10px' : '0' }}
                              onClick={() => focusFeedback(bd._id)}
                            >
                              <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FaComments className="text-gray-400" /> Discussion
                              </h4>
                              {(!bd.feedback || bd.feedback.length === 0) && (
                                <span style={{ fontSize: '0.8rem', color: '#3b82f6' }}>Add comment</span>
                              )}
                            </div>

                            {(bd.feedback && bd.feedback.length > 0) || true ? (
                              <>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                                  {bd.feedback && bd.feedback.length > 0 ? (
                                    bd.feedback.map((f, i) => (
                                      <div key={i} style={{
                                        marginBottom: '8px',
                                        padding: '8px 12px',
                                        background: f.from?._id === user._id ? '#eff6ff' : '#f8fafc',
                                        borderRadius: '8px',
                                        border: f.from?._id === user._id ? '1px solid #dbeafe' : '1px solid #e2e8f0',
                                        alignSelf: f.from?._id === user._id ? 'flex-end' : 'flex-start',
                                        maxWidth: '100%'
                                      }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '2px' }}>
                                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: f.from?._id === user._id ? '#1d4ed8' : '#334155' }}>
                                            {f.from?.name || 'User'}
                                            {f.from?._id === user._id && ' (You)'}
                                          </span>
                                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatDateTime(f.timestamp)}</span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', whiteSpace: 'pre-wrap' }}>{f.content}</p>
                                      </div>
                                    ))
                                  ) : (
                                    null
                                  )}
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <input
                                    id={`feedback-input-${bd._id}`}
                                    type="text"
                                    style={{
                                      flex: 1,
                                      padding: '10px 14px',
                                      borderRadius: '20px',
                                      border: '1px solid #cbd5e1',
                                      fontSize: '0.9rem',
                                      outline: 'none',
                                      transition: 'border-color 0.2s',
                                      backgroundColor: '#f8fafc'
                                    }}
                                    placeholder="Write a comment..."
                                    value={feedbackText[bd._id] || ''}
                                    onChange={(e) => setFeedbackText(prev => ({ ...prev, [bd._id]: e.target.value }))}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddFeedback(bd._id)}
                                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                  />
                                  <button
                                    className="btn btn-primary btn-sm"
                                    style={{ borderRadius: '20px', padding: '0 20px', height: 'auto' }}
                                    onClick={() => handleAddFeedback(bd._id)}
                                    disabled={isSubmittingFeedback === bd._id || !feedbackText[bd._id]?.trim()}
                                  >
                                    {isSubmittingFeedback === bd._id ? '...' : 'Send'}
                                  </button>
                                </div>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {/* Editor Message */}
                        {hasUpload && work.editorMessage && (
                          <div style={{ marginTop: '15px', padding: '12px 15px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #dbeafe', display: 'flex', gap: '10px' }}>
                            <div style={{ fontSize: '1.2rem' }}>📝</div>
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.85rem', color: '#1e40af', marginBottom: '4px' }}>Note from Editor:</strong>
                              <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', lineHeight: '1.5' }}>{work.editorMessage}</p>
                            </div>
                          </div>
                        )}

                        {(() => {
                          const allCorrections = getAllCorrections(bd._id);
                          return allCorrections.length > 0 && (
                            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e2e8f0' }}>
                              <strong style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', color: '#475569' }}>Technical Corrections & Requests:</strong>
                              <FeedbackChat
                                corrections={allCorrections}
                                currentUser={user}
                                canMarkFixed={true}
                                markingId={markingFixId}
                                onMarkFixed={(correctionId) => {
                                  const corr = allCorrections.find(c => c._id === correctionId);
                                  if (corr) handleMarkCorrectionDone(corr.workId, correctionId);
                                }}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="details-section">
          <ProjectDetails project={project} onUpdate={onUpdate} />
        </div>
      </div>

      {showCorrectionsModal && selectedWork && (
        <div className="modal-overlay" onClick={() => setShowCorrectionsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Changes / Feedback</h2>
              <button className="modal-close" onClick={() => setShowCorrectionsModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitCorrections} className="modal-body">
              <div className="form-group">
                <label className="form-label">What would you like to change?</label>
                <textarea
                  className="form-textarea"
                  value={correctionText}
                  onChange={(e) => setCorrectionText(e.target.value)}
                  rows="4"
                  placeholder="E.g., Please make the music start 2 seconds earlier..."
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
                  disabled={submittingCorrection}
                  onClick={() => setShowCorrectionsModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={submittingCorrection}>
                  {submittingCorrection ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default WorkView;
