import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, workBreakdownAPI, worksAPI, usersAPI, API_BASE_URL } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import VoiceRecorder from '../common/VoiceRecorder';
import WorkTypeMenu from '../common/WorkTypeMenu';
import WorkTypeDetailsModal from '../common/WorkTypeDetailsModal';
import './AdminProjectPage.css';

const AdminProjectPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { confirm, showAlert } = useDialog();

    const [project, setProject] = useState(null);
    const [workBreakdown, setWorkBreakdown] = useState([]);
    const [workSubmissions, setWorkSubmissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
    const [correctionText, setCorrectionText] = useState('');
    const [voiceFile, setVoiceFile] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [showWorkTypeDetails, setShowWorkTypeDetails] = useState(false);
    const [selectedWorkTypeForDetails, setSelectedWorkTypeForDetails] = useState(null);
    const [editors, setEditors] = useState([]);
    const [editingWork, setEditingWork] = useState(null);
    const [editFormData, setEditFormData] = useState({ assignedEditor: '', deadline: '', amount: '', shareDetails: '', links: [{ title: '', url: '' }] });
    const [feedbackText, setFeedbackText] = useState({});
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(null);

    useEffect(() => {
        loadProject();
        loadWorkBreakdown();
        loadEditors();
    }, [projectId]);

    useEffect(() => {
        if (workBreakdown.length > 0) {
            loadWorkSubmissions();
        }
    }, [workBreakdown]);

    const loadProject = async () => {
        try {
            const response = await projectsAPI.getById(projectId);
            setProject(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load project');
        }
    };

    const loadWorkBreakdown = async () => {
        try {
            setLoading(true);
            const response = await workBreakdownAPI.getByProject(projectId);
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

    const loadEditors = async () => {
        try {
            const response = await usersAPI.getEditors();
            setEditors(response.data);
        } catch (err) {
            console.error('Failed to load editors:', err);
        }
    };

    const handleEditClick = (work) => {
        setEditingWork(work);

        // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
        let deadlineStr = '';
        if (work.deadline) {
            const date = new Date(work.deadline);
            const tzoffset = date.getTimezoneOffset() * 60000;
            deadlineStr = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
        }

        setEditFormData({
            assignedEditor: work.assignedEditor?._id || work.assignedEditor,
            deadline: deadlineStr,
            amount: work.amount,
            shareDetails: work.shareDetails || '',
            links: work.links && work.links.length > 0 ? work.links : [{ title: '', url: '' }]
        });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            // Fix: Convert local datetime to ISO string
            const payload = {
                ...editFormData,
                deadline: new Date(editFormData.deadline).toISOString()
            };
            await workBreakdownAPI.update(editingWork._id, payload);
            setEditingWork(null);
            loadWorkBreakdown(); // Reload to see changes
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update work breakdown');
        }
    };

    const handleAddCorrection = async (e) => {
        e.preventDefault();
        if (!selectedSubmission) return;

        try {
            if (!correctionText.trim() && !voiceFile && mediaFiles.length === 0) {
                await showAlert('Please provide correction details (text, voice, or files)', 'Validation Error');
                return;
            }

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
        }
    };

    const handleMarkCorrectionDone = async (submissionId, correctionId) => {
        try {
            await worksAPI.markCorrectionDone(submissionId, correctionId);
            await loadWorkSubmissions();
            await loadWorkBreakdown();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to mark correction as done');
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

    const handleCloseProject = async () => {
        const isConfirmed = await confirm({
            title: 'Close Project',
            message: 'Are you sure you want to close this project? It will be hidden after 2 days and deleted after 7 days.',
            confirmText: 'Close Project',
            isDanger: true
        });

        if (isConfirmed) {
            try {
                await projectsAPI.closeProject(projectId);
                await showAlert('Project closed successfully! Notifications sent to client and editors.', 'Success');
                navigate('/admin/dashboard');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to close project');
            }
        }
    };

    if (loading || !project) {
        return (
            <div className="admin-project-page">
                <div className="spinner"></div>
            </div>
        );
    }

    const progress = calculateProgress();

    return (
        <div className="admin-project-page">
            {/* Page Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px', flexWrap: 'nowrap' }}>
                <button
                    title="Back to Dashboard"
                    style={{
                        padding: '8px',
                        backgroundColor: '#ffffff',
                        color: '#06A77D',
                        border: '1px solid #e2e8f0',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease',
                        width: '40px',
                        height: '40px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        flexShrink: 0
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#06A77D';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.transform = 'translateX(-3px)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                        e.currentTarget.style.color = '#06A77D';
                        e.currentTarget.style.transform = 'translateX(0)';
                    }}
                    onClick={() => navigate('/admin/dashboard')}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <div className="header-content" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap', minWidth: 0, flex: 1 }}>
                    <h1 style={{ fontSize: '1.5rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{project.title}</h1>
                    <span className={`badge badge-primary`} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {project.status.replace('_', ' ')}
                    </span>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Project Information Card */}
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
                                href={project.scriptFile.match(/^https?:\/\//) ? project.scriptFile : (project.scriptFile.startsWith('/') || project.scriptFile.startsWith('uploads') ? `${API_BASE_URL}${project.scriptFile}` : `https://${project.scriptFile}`)}
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
                        <div className="progress-bar-container">
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${progress}%` }}
                            >
                                {Math.round(progress)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Work Status Table */}
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
                                        <th>Amount</th>
                                        <th>Approved</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workBreakdown.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="text-center">No work breakdown found</td>
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

                                                        let statusText, statusClass;
                                                        if (bothApproved) {
                                                            statusText = 'Completed';
                                                            statusClass = 'badge-success';
                                                        } else if (adminApproved) { // Admin approved but waiting for client
                                                            statusText = 'Client Review';
                                                            statusClass = 'badge-warning';
                                                        } else if (hasSubmission) {
                                                            statusText = 'Under Review';
                                                            statusClass = 'badge-warning';
                                                        } else if (work.status === 'declined') {
                                                            statusText = 'Declined';
                                                            statusClass = 'badge-danger';
                                                        } else {
                                                            statusText = 'Pending Upload';
                                                            statusClass = 'badge-secondary';
                                                        }

                                                        return (
                                                            <span className={`badge ${statusClass}`}>
                                                                {statusText}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td>{formatDateTime(work.deadline)}</td>
                                                <td>{project.currency} {work.amount?.toFixed(2)}</td>
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Admin:</span>
                                                            {work.approvals?.admin ? (
                                                                <span className="badge badge-success" style={{ fontSize: '10px' }}>✓</span>
                                                            ) : (
                                                                <span className="badge badge-secondary" style={{ fontSize: '10px' }}>✗</span>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Client:</span>
                                                            {work.approvals?.client ? (
                                                                <span className="badge badge-success" style={{ fontSize: '10px' }}>✓</span>
                                                            ) : (
                                                                <span className="badge badge-secondary" style={{ fontSize: '10px' }}>✗</span>
                                                            )}
                                                        </div>
                                                    </div>
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

                                    let statusBadge;
                                    if (bd.status === 'declined') {
                                        statusBadge = <span className="badge badge-danger" style={{ backgroundColor: '#dc3545', color: 'white' }}>Declined</span>;
                                    } else if (!hasUpload) {
                                        statusBadge = <span className="badge badge-secondary">Pending Upload</span>;
                                    } else if (isApproved) {
                                        statusBadge = <span className="badge badge-success">Approved</span>;
                                    } else if (hasPendingCorrections) {
                                        statusBadge = <span className="badge badge-warning">Needs Revision</span>;
                                    } else {
                                        statusBadge = <span className="badge badge-primary">Pending Approval</span>;
                                    }

                                    return (
                                        <div key={bd._id} className="work-item" style={{ borderLeft: isApproved ? '4px solid green' : '4px solid #ddd' }}>
                                            <div className="work-header">
                                                <div>
                                                    <strong style={{ fontSize: '16px', color: '#2E86AB' }}>{bd.workType}</strong>
                                                    <div className="price-tag">{project.currency} {bd.amount}</div>
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

                                            <div className="work-actions">
                                                {hasUpload ? (
                                                    <>
                                                        <a
                                                            href={work.submissionType === 'link'
                                                                ? (work.fileUrl.match(/^https?:\/\//) || work.fileUrl.match(/^\/\//) ? work.fileUrl : `https://${work.fileUrl}`)
                                                                : work.fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-primary btn-sm"
                                                        >
                                                            {work.submissionType === 'link' ? 'View Link' : 'Download File'}
                                                        </a>

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

                                                        {!isApproved && (
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
                                                                            await workBreakdownAPI.approve(bd._id);
                                                                            await loadWorkBreakdown();
                                                                            await loadWorkSubmissions();
                                                                            await loadProject();
                                                                        } catch (e) {
                                                                            setError(e.response?.data?.message || 'Failed to approve');
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={hasPendingCorrections}
                                                                title={hasPendingCorrections ? "Complete all corrections first" : "Approve this work"}
                                                            >
                                                                Approve Work
                                                            </button>
                                                        )}
                                                        {isApproved && <span style={{ color: 'green', fontWeight: 'bold', padding: '5px' }}>Approved</span>}
                                                    </>
                                                ) : (
                                                    <button className="btn btn-primary btn-sm" disabled>
                                                        Awaiting Upload
                                                    </button>
                                                )}

                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => focusFeedback(bd._id)}
                                                    style={{ marginLeft: 'auto' }}
                                                >
                                                    💬 Give Feedback
                                                </button>
                                                {/* Work File Section */}
                                                {hasUpload && work.workFileUrl && (
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
                                                )}
                                            </div>

                                            {/* Work Items and Corrections Card Footer Actions */}
                                            <div className="work-item-footer" style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => handleEditClick(bd)}
                                                    title="Edit Assignment"
                                                >
                                                    ✏️ Edit Assignment
                                                </button>
                                            </div>

                                            {/* Editor Message */}
                                            {hasUpload && work.editorMessage && (
                                                <div className="editor-message">
                                                    <strong>📝 Editor's Note:</strong>
                                                    <p>{work.editorMessage}</p>
                                                </div>
                                            )}

                                            {/* Work Feedback Section */}
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
                                            </div>

                                            {/* Corrections */}
                                            {(() => {
                                                const allCorrections = getAllCorrectionsForBreakdown(bd._id);
                                                return allCorrections.length > 0 && (
                                                    <div className="corrections-container">
                                                        <strong>Corrections Requested ({allCorrections.filter(c => !c.done).length} pending, {allCorrections.filter(c => c.done).length} fixed):</strong>
                                                        <ul>
                                                            {allCorrections.map((c, i) => (
                                                                <li key={i} className={c.done ? 'correction-done' : 'correction-pending'}>
                                                                    <div className="correction-header">
                                                                        <span className="correction-date">
                                                                            Requested by {c.addedBy?.name || 'Unknown'} on {formatDateTime(c.addedAt)}
                                                                        </span>
                                                                        <div>
                                                                            {c.done ? (
                                                                                <span className="badge badge-success">✓ Fixed by Editor</span>
                                                                            ) : (
                                                                                <button
                                                                                    className="btn btn-success btn-sm"
                                                                                    onClick={() => handleMarkCorrectionDone(c.workId, c._id)}
                                                                                >
                                                                                    Mark as Fixed
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        {c.text && <p className="correction-text">{c.text}</p>}
                                                                        {c.voiceFile && (
                                                                            <audio controls src={c.voiceFile} className="correction-audio" />
                                                                        )}
                                                                        {c.mediaFiles && c.mediaFiles.length > 0 && (
                                                                            <div className="correction-media">
                                                                                {c.mediaFiles.map((m, idx) => (
                                                                                    <a key={idx} href={m} target="_blank" rel="noopener noreferrer">
                                                                                        📎 Attachment {idx + 1}
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </li>
                                                            ))}
                                                        </ul>
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

                {/* Action Buttons */}
                <div className="page-actions">
                    {project.clientApproved && project.adminApproved && Math.round(progress) >= 100 && !project.closed && (
                        <button className="btn btn-danger" onClick={handleCloseProject}>
                            Close Project
                        </button>
                    )}
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
                                    onClick={() => setShowCorrectionsModal(false)}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-success">
                                    Submit Correction Request
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

            {/* Edit Work Breakdown Modal */}
            {editingWork && (
                <div className="modal-overlay" onClick={() => setEditingWork(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Edit Work: {editingWork.workType}</h2>
                            <button className="modal-close" onClick={() => setEditingWork(null)}>×</button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Assigned Editor</label>
                                <select
                                    className="form-select"
                                    value={editFormData.assignedEditor}
                                    onChange={(e) => setEditFormData({ ...editFormData, assignedEditor: e.target.value })}
                                    required
                                >
                                    <option value="">Select Editor</option>
                                    {editors.map(editor => (
                                        <option key={editor._id} value={editor._id}>{editor.name} ({editor.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Deadline</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={editFormData.deadline}
                                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount ({project?.currency})</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    value={editFormData.amount}
                                    onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                                    required
                                    min="0"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sharing Project Details (Optional)</label>
                                <textarea
                                    className="form-textarea"
                                    value={editFormData.shareDetails}
                                    onChange={(e) => setEditFormData({ ...editFormData, shareDetails: e.target.value })}
                                    rows="3"
                                    placeholder="Add any specific instructions or details for the editor..."
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sharing Links (Optional)</label>
                                {editFormData.links.map((link, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Link Title (e.g. Assets)"
                                            value={link.title}
                                            onChange={(e) => {
                                                const newLinks = [...editFormData.links];
                                                newLinks[index].title = e.target.value;
                                                setEditFormData({ ...editFormData, links: newLinks });
                                            }}
                                            style={{ flex: 1 }}
                                        />
                                        <input
                                            type="url"
                                            className="form-input"
                                            placeholder="URL"
                                            value={link.url}
                                            onChange={(e) => {
                                                const newLinks = [...editFormData.links];
                                                newLinks[index].url = e.target.value;
                                                setEditFormData({ ...editFormData, links: newLinks });
                                            }}
                                            style={{ flex: 2 }}
                                        />
                                        {editFormData.links.length > 1 && (
                                            <button
                                                type="button"
                                                className="btn btn-danger btn-sm"
                                                onClick={() => {
                                                    const newLinks = editFormData.links.filter((_, i) => i !== index);
                                                    setEditFormData({ ...editFormData, links: newLinks });
                                                }}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setEditFormData({ ...editFormData, links: [...editFormData.links, { title: '', url: '' }] })}
                                >
                                    + Add Another Link
                                </button>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setEditingWork(null)}>Cancel</button>
                                <button type="submit" className="btn btn-success">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminProjectPage;
