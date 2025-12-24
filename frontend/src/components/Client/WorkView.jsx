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
                      style={{ borderLeft: isApproved ? '4px solid green' : '4px solid #ddd' }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      layout
                    >
                      <div className="work-header">
                        <div>
                          <strong>{bd.workType}</strong>
                          {hasUpload ? (
                            <p className="work-date">
                              Latest Submission: {work.fileName} ({formatDate(work.submittedAt)})
                            </p>
                          ) : (
                            <p className="work-date italic">Waiting for editor...</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {statusBadge}
                          <WorkTypeMenu workBreakdown={bd} onViewDetails={handleViewWorkTypeDetails} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '12px' }}>
                        <span>Admin Approval: {adminApproved ? <span className="badge badge-success">✓</span> : <span className="badge badge-secondary">Pending</span>}</span>
                        <span>Client Approval: {clientApproved ? <span className="badge badge-success">✓</span> : <span className="badge badge-secondary">Pending</span>}</span>
                      </div>

                      <div className="work-actions">
                        {hasUpload ? (
                          <>
                            <button className="btn btn-primary" onClick={() => handleDownload(work)}>
                              {work.submissionType === 'link' ? 'View Link' : 'Download File'}
                            </button>

                            <button
                              className="btn btn-success"
                              onClick={() => {
                                setSelectedWork(work);
                                setCorrectionText('');
                                setVoiceFile(null);
                                setMediaFiles([]);
                                setShowCorrectionsModal(true);
                              }}
                            >
                              Request Changes
                            </button>

                            {!isApproved && (
                              <button
                                className="btn btn-success"
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
                                {approvingKey === bd._id ? 'Finalizing...' : 'Approve & Finalize'}
                              </button>
                            )}
                            {isApproved && <span style={{ display: 'inline-block', fontWeight: 'bold', padding: '10px 20px', color: '#155724', fontSize: '15px' }}>Approved</span>}
                          </>
                        ) : (
                          <button className="btn btn-primary" disabled>
                            Awaiting Upload
                          </button>
                        )}

                        <button
                          className="btn btn-secondary"
                          onClick={() => focusFeedback(bd._id)}
                        >
                          💬 Give Feedback
                        </button>
                      </div>

                      {/* Editor Message */}
                      {hasUpload && work.editorMessage && (
                        <div style={{ marginTop: '10px', padding: '12px', background: '#e3f2fd', borderRadius: '4px', borderLeft: '4px solid #2196f3' }}>
                          <strong style={{ color: '#1976d2', fontSize: '14px' }}>📝 Editor's Note:</strong>
                          <p style={{ margin: '8px 0 0 0', whiteSpace: 'pre-wrap', color: '#333', fontSize: '14px', lineHeight: '1.5' }}>{work.editorMessage}</p>
                        </div>
                      )}

                      {/* Work Feedback Section */}
                      <div style={{ marginTop: '15px', padding: '15px', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          💬 Feedback & Discussion
                        </h4>

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
                                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>{f.from?.name || 'User'}</span>
                                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{formatDateTime(f.timestamp)}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>{f.content}</p>
                              </div>
                            ))
                          ) : (
                            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No general feedback yet.</p>
                          )}
                        </div>

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
                            placeholder="Add a comment..."
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
                      </div>

                      {(() => {
                        const allCorrections = getAllCorrections(bd._id);
                        return allCorrections.length > 0 && (
                          <div style={{ marginTop: '10px' }}>
                            <strong>Technical Corrections:</strong>
                            <FeedbackChat
                              corrections={allCorrections}
                              currentUser={user}
                              canMarkFixed={true}
                              markingId={markingFixId}
                              onMarkFixed={(correctionId) => {
                                // Find the correction to get its workId
                                const corr = allCorrections.find(c => c._id === correctionId);
                                if (corr) handleMarkCorrectionDone(corr.workId, correctionId);
                              }}
                            />
                          </div>
                        );
                      })()}
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
