import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils/formatDate';
import { projectsAPI, worksAPI, workBreakdownAPI } from '../../services/api';
import WorkTypeMenu from '../common/WorkTypeMenu';
import WorkTypeDetailsModal from '../common/WorkTypeDetailsModal';
import StatusBadge from '../common/StatusBadge';
import EditorNotesModal from './EditorNotesModal';
import VersionHistoryModal from '../common/VersionHistoryModal';
import { useDialog } from '../../context/DialogContext';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  FaClock, FaCheckCircle, FaExclamationCircle, FaUpload,
  FaPlay, FaClipboardList, FaStickyNote, FaRegStickyNote,
  FaMoneyBillWave, FaCalendarAlt, FaBan, FaHourglassHalf
} from 'react-icons/fa';
import './AssignedWorks.css';

// Deadline Countdown Component
const DeadlineCountdown = ({ deadline, createdAt, deadlineInfo }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const difference = deadlineDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const getDisplayText = () => {
    if (deadlineInfo.status === 'overdue' || (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0)) {
      return "Deadline crossed, work faster";
    }

    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;
    } else if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;
    } else if (timeLeft.minutes > 0) {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    } else {
      return `${timeLeft.seconds}s`;
    }
  };

  const getTimeLeftPercentage = () => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const createdDate = new Date(createdAt);

    if (now >= deadlineDate) return 0;
    if (now <= createdDate) return 100;

    const totalDuration = deadlineDate - createdDate;
    const remaining = deadlineDate - now;

    return Math.min(100, Math.max(0, (remaining / totalDuration) * 100));
  };

  const isOverdue = deadlineInfo.status === 'overdue' || (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0);
  const timeLeftPercentage = getTimeLeftPercentage();

  return (
    <div className="deadline-section">
      <div className="deadline-countdown">
        <span className={`countdown-text ${deadlineInfo.className}`}>
          {getDisplayText()}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: '#666', textTransform: 'uppercase' }}>Time Left</span>
        <span style={{ fontSize: '11px', fontWeight: '700', color: isOverdue ? '#dc3545' : deadlineInfo.color }}>
          {Math.round(timeLeftPercentage)}%
        </span>
      </div>
      {/* Visual deadline progress */}
      <div className="deadline-progress-bar">
        <div
          className="deadline-progress-fill"
          style={{
            width: `${isOverdue ? 100 : timeLeftPercentage}%`,
            backgroundColor: isOverdue ? '#dc3545' : deadlineInfo.color
          }}
        />
      </div>
    </div>
  );
};

// Editor Work Menu Component
const EditorWorkMenu = ({ work, onDecline, onViewDetails }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useState(null); // Just a placeholder, actually we need standard ref.
  // Using simple click handler for now as ref needs useRef import which is there.

  // Calculate if decline is allowed
  const canDecline = () => {
    // Logic: Can only decline if MORE than 80% time remains (less than 20% used)
    // User requirement: "disable the decline button for editor when the timeleft for deadline is under 80%"

    if (!work.createdAt || !work.deadline) return true; // Fallback

    const created = new Date(work.createdAt).getTime();
    const deadline = new Date(work.deadline).getTime();
    const now = Date.now();
    const totalDuration = deadline - created;
    const timeRemaining = deadline - now;

    if (timeRemaining <= 0) return false; // Overdue
    if (totalDuration <= 0) return true; // Weird case

    // Check if more than 80% time remains
    const percentageRemaining = timeRemaining / totalDuration;
    return percentageRemaining >= 0.8;
  };

  const isDeclineEnabled = canDecline();

  return (
    <div className="work-menu-container" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
      <button
        className="menu-trigger-btn"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          color: '#666',
          padding: '0 5px'
        }}
      >
        ⋮
      </button>
      {isOpen && (
        <div className="menu-dropdown" style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          background: 'white',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          zIndex: 10,
          overflow: 'hidden',
          minWidth: '150px'
        }}>
          <button
            onClick={() => { setIsOpen(false); onViewDetails(work); }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 15px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#333',
              fontSize: '14px',
              borderBottom: '1px solid #eee'
            }}
          >
            📋 View Details
          </button>
          <button
            onClick={() => { setIsOpen(false); onDecline(work); }}
            disabled={!isDeclineEnabled}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 15px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: isDeclineEnabled ? 'pointer' : 'not-allowed',
              color: isDeclineEnabled ? '#dc3545' : '#999',
              fontSize: '14px'
            }}
            title={!isDeclineEnabled ? "Cannot decline when less than 80% of time remains. You can only decline in the early stages." : ""}
          >
            🚫 Decline Work
          </button>
        </div>
      )}
      {/* Backdrop to close */}
      {isOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9 }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// Priority Star Component
const PriorityStar = ({ priority, onClick }) => {
  const getStarColor = () => {
    switch (priority) {
      case 'high': return '#ffc107'; // Gold
      case 'medium': return '#adb5bd'; // Gray
      case 'low': return '#dee2e6'; // Light Gray
      default: return '#adb5bd';
    }
  };

  return (
    <div
      className="priority-star"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`Priority: ${priority}`}
      style={{ cursor: 'pointer', fontSize: '20px', color: getStarColor(), transition: 'color 0.2s' }}
    >
      ★
    </div>
  );
};

const AssignedWorks = ({ onUpdate }) => {
  const navigate = useNavigate();
  const { confirm, showAlert } = useDialog();
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending'); // all, pending, completed
  const [showWorkTypeDetails, setShowWorkTypeDetails] = useState(false);
  const [selectedWorkTypeForDetails, setSelectedWorkTypeForDetails] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedWorkForNotes, setSelectedWorkForNotes] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedWorkForHistory, setSelectedWorkForHistory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleWorkSelect = (workBreakdown) => {
    navigate(`/editor/upload-work/${workBreakdown._id}`);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      assigned: 'badge-primary',
      in_progress: 'badge-primary',
      submitted: 'badge-success',
      under_review: 'badge-warning',
      completed: 'badge-success',
    };
    return statusMap[status] || 'badge-secondary';
  };

  const getDeadlineStatus = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    const daysUntil = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (diff <= 0) {
      return { status: 'overdue', days: Math.abs(daysUntil), className: 'deadline-overdue', color: '#dc3545' };
    } else if (daysUntil <= 3) {
      return { status: 'urgent', days: daysUntil, className: 'deadline-urgent', color: '#ffc107' };
    } else {
      return { status: 'normal', days: daysUntil, className: 'deadline-normal', color: '#28a745' };
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await worksAPI.getAssignedBreakdowns();
      setWorks(response.data);
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [onUpdate]);

  // Check for approved works to trigger celebration
  useEffect(() => {
    const approvedWorks = works.filter(w =>
      w.approvals?.admin && w.approvals?.client
    );

    if (approvedWorks.length > 0) {
      // Small celebration on load if there are approved works
      // Only trigger if we haven't celebrated this session? 
      // For now, just a subtle effect or only on status change would be better, 
      // but without previous state, let's skip auto-confetti on load to avoid annoyance.
    }
  }, [works]);

  const triggerCelebration = (e) => {
    e.stopPropagation();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const [processingId, setProcessingId] = useState(null);

  const handlePriorityToggle = async (work) => {
    const priorities = ['low', 'medium', 'high'];
    const currentIdx = priorities.indexOf(work.priority || 'medium');
    const newPriority = priorities[(currentIdx + 1) % priorities.length];

    try {
      setProcessingId(work._id + '-priority');
      await worksAPI.updateDetails(work._id, undefined, newPriority);
      loadData(); // Reload to reflect changes and re-sort
    } catch (err) {
      console.error('Failed to update priority', err);
      showAlert(err.response?.data?.message || 'Failed to update priority', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleStartWorking = async (work) => {
    try {
      setProcessingId(work._id + '-status');
      await worksAPI.updateStatus(work._id, 'in_progress');
      loadData();
    } catch (err) {
      console.error('Failed to start working', err);
      showAlert(err.response?.data?.message || 'Failed to start working', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenNotes = (work) => {
    setSelectedWorkForNotes(work);
    setShowNotesModal(true);
  };

  const handleSaveNotes = async (workId, notes) => {
    try {
      setProcessingId(workId + '-notes');
      await worksAPI.updateDetails(workId, notes, undefined);
      loadData();
    } catch (err) {
      console.error('Failed to save notes', err);
      showAlert(err.response?.data?.message || 'Failed to save notes', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenHistory = (work) => {
    setSelectedWorkForHistory(work);
    setShowHistoryModal(true);
  };

  const handleDeclineWork = async (work) => {
    const isConfirmed = await confirm({
      title: 'Decline Work',
      message: `Are you sure you want to decline "${work.workType}" for project "${work.project?.title}"? This action cannot be undone.`,
      confirmText: 'Decline',
      isDanger: true
    });

    if (isConfirmed) {
      try {
        await workBreakdownAPI.decline(work._id);
        await showAlert('Work declined successfully.', 'Success');
        loadData(); // Refresh list
      } catch (err) {
        console.error('Failed to decline work:', err);
        await showAlert(err.response?.data?.message || 'Failed to decline work', 'Error');
      }
    }
  };

  const filteredWorks = works.filter(work => {
    // Basic filter: Don't show work that is already paid/settled
    if (work.isPaid) return false;

    const matchesStatus = filterStatus === 'all' ? true : (filterStatus === 'pending' ? !work.approved : work.approved);
    const matchesSearch = work.project?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      work.workType?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  })
    // Sort by priority (high > medium > low) then deadline
    .sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      const pA = priorityMap[a.priority || 'medium'];
      const pB = priorityMap[b.priority || 'medium'];
      if (pA !== pB) return pB - pA;
      return new Date(a.deadline) - new Date(b.deadline);
    });

  const handleViewWorkTypeDetails = (workBreakdown) => {
    setSelectedWorkTypeForDetails(workBreakdown);
    setShowWorkTypeDetails(true);
  };

  const stats = {
    total: works.filter(w => !w.isPaid).length,
    pending: works.filter(w => !w.isPaid && !w.approved).length, // Tasks not approved by both client and admin
    completed: works.filter(w => !w.isPaid && w.approved).length, // Tasks approved but not yet paid
  };

  return (
    <div className="assigned-works">
      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card" onClick={() => setFilterStatus('all')} style={{ cursor: 'pointer', borderColor: filterStatus === 'all' ? '#06A77D' : '#e0e0e0' }}>
          <div className="stat-icon" style={{ backgroundColor: '#e3f2fd', color: '#0d47a1' }}><FaClipboardList /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilterStatus('pending')} style={{ cursor: 'pointer', borderColor: filterStatus === 'pending' ? '#06A77D' : '#e0e0e0' }}>
          <div className="stat-icon" style={{ backgroundColor: '#fff3cd', color: '#856404' }}><FaHourglassHalf /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => setFilterStatus('completed')} style={{ cursor: 'pointer', borderColor: filterStatus === 'completed' ? '#06A77D' : '#e0e0e0' }}>
          <div className="stat-icon" style={{ backgroundColor: '#d1e7dd', color: '#0f5132' }}><FaCheckCircle /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="dashboard-controls" style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search projects or work types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 15px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px'
            }}
          />
        </div>

        {filterStatus !== 'all' && (
          <div className="filter-info" style={{ margin: 0 }}>
            <span>Showing: <strong>{filterStatus.toUpperCase()}</strong></span>
            <button className="btn-clear-filter" onClick={() => setFilterStatus('all')} style={{ marginLeft: '10px' }}>Clear</button>
          </div>
        )}
      </div>

      {/* Works Grid */}
      {filteredWorks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FaClipboardList /></div>
          <h3>No {filterStatus !== 'all' ? filterStatus.replace('_', ' ') : ''} works found</h3>
          <p>{filterStatus === 'all' ? 'You don\'t have any assigned works yet.' : `You don't have any ${filterStatus.replace('_', ' ')} works.`}</p>
        </div>
      ) : (
        <motion.div
          className="works-grid"
          layout
        >
          <AnimatePresence>
            {filteredWorks.map((work) => {
              const deadlineInfo = getDeadlineStatus(work.deadline);
              const isDeclined = work.status === 'declined';

              return (
                <motion.div
                  key={work._id}
                  className="work-card"
                  onClick={() => !isDeclined && handleWorkSelect(work)}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={!isDeclined ? { y: -5, boxShadow: '0 10px 30px rgba(0,0,0,0.1)' } : {}}
                  transition={{ duration: 0.2 }}
                  style={{ cursor: isDeclined ? 'default' : 'pointer' }}
                >
                  {/* Card Header */}
                  <div className="work-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="work-title-section">
                      <h3 className="work-project-title">{work.project?.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="work-type-badge">{work.workType}</span>
                        {/* Notes icon moved here - next to work type */}
                        <button
                          className="btn-icon"
                          onClick={(e) => { e.stopPropagation(); handleOpenNotes(work); }}
                          title="My Notes"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', color: '#666', display: 'flex', alignItems: 'center' }}
                        >
                          {work.editorNotes ? <FaStickyNote color="#ffc107" /> : <FaRegStickyNote />}
                        </button>
                        {/* Version Badge */}
                        {work.submissionStats?.latestVersion > 0 && (
                          <span className="version-badge" style={{
                            fontSize: '0.75rem',
                            padding: '2px 6px',
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            borderRadius: '4px',
                            fontWeight: '600',
                            border: '1px solid #cbd5e1'
                          }}>
                            v{work.submissionStats.latestVersion}
                          </span>
                        )}
                        {/* General Feedback Badge */}
                        {work.feedback && work.feedback.length > 0 && (
                          <span className="feedback-indicator" title="General Feedback Available" style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            borderRadius: '12px',
                            fontWeight: '600',
                            border: '1px solid #bfdbfe',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            💬 {work.feedback.length}
                          </span>
                        )}

                        {/* History Badge */}
                        {work.submissionStats?.submissionCount > 0 && (
                          <button
                            className="btn-icon"
                            onClick={(e) => { e.stopPropagation(); handleOpenHistory(work); }}
                            title="View Version History"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px', color: '#3b82f6', display: 'flex', alignItems: 'center', marginLeft: '4px' }}
                          >
                            <FaClock style={{ marginRight: '2px' }} /> History
                          </button>
                        )}
                      </div>
                    </div>
                    {!isDeclined && <EditorWorkMenu work={work} onDecline={handleDeclineWork} onViewDetails={handleViewWorkTypeDetails} />}
                  </div>

                  {/* Priority and Status Row */}
                  <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PriorityStar priority={work.priority || 'medium'} onClick={() => !isDeclined && handlePriorityToggle(work)} />
                      <span style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>{work.priority || 'medium'}</span>
                    </div>

                    {/* Status label moved to right end */}
                    {(() => {
                      const stats = work.submissionStats;

                      // Derive display status
                      let displayStatus = work.status;

                      if (work.status === 'declined') displayStatus = 'declined';
                      else if (work.approved) displayStatus = 'approved';
                      else if (stats?.needsResubmission && stats?.pendingCorrections > 0) displayStatus = 'needs_revision';
                      else if (stats?.hasSubmission) displayStatus = 'under_review';
                      else if (work.status === 'in_progress') displayStatus = 'in_progress';
                      else if (work.status === 'pending') displayStatus = 'assigned'; // Display "Assigned" for pending to be clearer? Or keep pending.

                      return <StatusBadge status={displayStatus} />;
                    })()}
                  </div>

                  {/* Card Body */}
                  <div className="work-card-body">
                    {/* Payment and Deadline Info Row */}
                    <div className="work-info-row">
                      <div className="info-item">
                        <span className="info-icon" style={{ color: '#28a745' }}><FaMoneyBillWave /></span>
                        <div className="info-details">
                          <span className="info-label">Payment</span>
                          <span className="info-value">{work.project?.currency || 'INR'} {work.amount?.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="info-item">
                        <span className="info-icon" style={{ color: '#dc3545' }}><FaCalendarAlt /></span>
                        <div className="info-details">
                          <span className="info-label">Deadline</span>
                          <span className="info-value" style={{ fontSize: '13px' }}>{formatDateTime(work.deadline)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Deadline Countdown and Progress */}
                    {!work.approved && (
                      <DeadlineCountdown
                        deadline={work.deadline}
                        createdAt={work.createdAt}
                        deadlineInfo={deadlineInfo}
                      />
                    )}
                  </div>

                  {/* Card Footer */}
                  {!isDeclined && (
                    <div className="work-card-footer" style={{ display: 'flex', gap: '10px' }}>
                      {work.status !== 'in_progress' && work.status !== 'completed' && !work.approved && (
                        <button
                          className="btn-work-action"
                          disabled={processingId === work._id + '-status'}
                          onClick={(e) => { e.stopPropagation(); handleStartWorking(work); }}
                          style={{
                            background: '#6c757d',
                            flex: 1,
                            opacity: processingId === work._id + '-status' ? 0.7 : 1,
                            cursor: processingId === work._id + '-status' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>
                            {processingId === work._id + '-status' ? <FaClock className="spin" /> : <FaPlay />}
                          </span>
                          {processingId === work._id + '-status' ? ' Starting...' : ' Start'}
                        </button>
                      )}
                      <button className="btn-work-action" onClick={(e) => { e.stopPropagation(); handleWorkSelect(work); }} style={{ flex: 1 }}>
                        <span style={{ fontSize: '14px' }}><FaUpload /></span> {work.submissionStats?.hasSubmission ? 'View Submission' : 'Upload Work'}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )
      }

      {
        showWorkTypeDetails && selectedWorkTypeForDetails && (
          <WorkTypeDetailsModal
            workBreakdown={selectedWorkTypeForDetails}
            onClose={() => {
              setShowWorkTypeDetails(false);
              setSelectedWorkTypeForDetails(null);
            }}
          />
        )
      }

      {
        showNotesModal && selectedWorkForNotes && (
          <EditorNotesModal
            workBreakdown={selectedWorkForNotes}
            onClose={() => {
              setShowNotesModal(false);
              setSelectedWorkForNotes(null);
            }}
            onSave={handleSaveNotes}
          />
        )
      }

      {
        showHistoryModal && selectedWorkForHistory && (
          <VersionHistoryModal
            workBreakdown={selectedWorkForHistory}
            onClose={() => {
              setShowHistoryModal(false);
              setSelectedWorkForHistory(null);
            }}
          />
        )
      }
    </div >
  );
};

export default AssignedWorks;
