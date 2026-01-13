import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { worksAPI, workBreakdownAPI, API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import ProjectRoadmap from '../common/ProjectRoadmap';
import './UploadWorkPage.css';

const UploadWorkPage = () => {
    const { workBreakdownId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [workBreakdown, setWorkBreakdown] = useState(null);
    const [workFile, setWorkFile] = useState(null);
    const [uploadType, setUploadType] = useState('output'); // 'output' or 'source'
    const [linkUrl, setLinkUrl] = useState('');
    const [workLinkUrl, setWorkLinkUrl] = useState('');
    // const [editorMessage, setEditorMessage] = useState(''); // Removed message state
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    const handleAddFeedback = async () => {
        if (!feedbackText.trim()) return;

        try {
            setIsSubmittingFeedback(true);
            await workBreakdownAPI.addFeedback(workBreakdownId, feedbackText);
            setFeedbackText('');
            loadWorkBreakdown(); // Reload to show new feedback
        } catch (err) {
            console.error('Failed to add feedback:', err);
            setError('Failed to add feedback');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    useEffect(() => {
        loadWorkBreakdown();
        loadSubmissions();
    }, [workBreakdownId]);

    const loadWorkBreakdown = async () => {
        try {
            setLoading(true);
            const response = await workBreakdownAPI.getByEditor(user._id);
            const work = response.data.find(w => w._id === workBreakdownId);
            if (!work) {
                setError('Work breakdown not found');
                return;
            }
            setWorkBreakdown(work);
        } catch (err) {
            setError('Failed to load work details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadSubmissions = async () => {
        try {
            const response = await worksAPI.getByWorkBreakdown(workBreakdownId);
            setSubmissions(response.data);
        } catch (err) {
            console.error('Failed to load submissions:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (uploadType === 'output' && !linkUrl.trim()) {
            setError('Please provide a Final Output URL');
            return;
        }
        if (uploadType === 'source' && !workLinkUrl.trim()) {
            setError('Please provide a Source File URL');
            return;
        }

        try {
            setUploading(true);
            setError('');
            setSuccess(false);

            // Determine what we are sending based on active tab
            // If output tab: send linkUrl (and null source)
            // If source tab: send workLinkUrl (and null output)
            // Backend now supports partials.

            const submitLinkUrl = uploadType === 'output' ? linkUrl : '';
            const submitWorkLinkUrl = uploadType === 'source' ? workLinkUrl : '';
            /*
            95:             const formData = new FormData();
            96:             formData.append('projectId', workBreakdown.project._id);
            ...
            109:             await worksAPI.upload(
            110:                 workBreakdown.project._id,
            ...
            */
            // The `formData` variable created in lines 95-107 is UNUSED in the original `handleSubmit`.
            // The API call uses arguments. 
            // So I should modify the API call to pass `workFile` and update `api.js` later.
            // OR I should use the `formData` I built and pass THAT if `worksAPI.upload` supports it.
            // To be robust, I will use `formData` and update `api.js` to accept it, OR I will update the arguments here and in `api.js`.
            // I will update the arguments here to include `workFile`.

            await worksAPI.upload(
                workBreakdown.project._id,
                workBreakdownId,
                null, // No file
                submitLinkUrl,
                '', // No editor message
                null, // No work file (upload)
                submitWorkLinkUrl
            );

            setSuccess(true);
            setLinkUrl('');
            setWorkLinkUrl('');
            loadSubmissions();

            setTimeout(() => {
                navigate('/editor/dashboard');
            }, 2000);
        } catch (err) {
            console.error('Upload error:', err);
            setSuccess(false); // Clear success if error
            setError(err.response?.data?.message || err.message || 'Failed to upload work');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return <div className="spinner"></div>;
    }

    if (!workBreakdown) {
        return (
            <div className="container">
                <div className="alert alert-error">{error || 'Work not found'}</div>
                <button className="btn btn-secondary" onClick={() => navigate('/editor/dashboard')}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (workBreakdown.status === 'declined') {
        return (
            <div className="container">
                <div className="alert alert-error" style={{ backgroundColor: '#f8d7da', color: '#721c24' }}>
                    <h3>🚫 Work Declined</h3>
                    <p>You have declined this work. You cannot upload files or view details for declined tasks.</p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate('/editor/dashboard')}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="upload-work-page">
            <div className="page-header">
                <button className="btn-back" onClick={() => navigate('/editor/dashboard')}>
                    ← Back to Dashboard
                </button>
                <h1>Upload Work: {workBreakdown.workType}</h1>
            </div>

            <div className="page-content">
                {/* Left Column - Work Details */}
                <div className="work-details-section">
                    <ProjectRoadmap
                        projectId={workBreakdown.project?._id}
                        currentWorkType={workBreakdown.workType}
                        projectTitle={workBreakdown.project?.title}
                    />

                    <div className="card">
                        <div className="card-header">
                            <h2>Work Details</h2>
                        </div>
                        <div className="card-body">
                            <div className="detail-item">
                                <strong>Project:</strong>
                                <span>{workBreakdown.project?.title}</span>
                            </div>
                            <div className="detail-item">
                                <strong>Work Type:</strong>
                                <span>{workBreakdown.workType}</span>
                            </div>
                            <div className="detail-item">
                                <strong>Deadline:</strong>
                                <span>{formatDate(workBreakdown.deadline)}</span>
                            </div>
                            <div className="detail-item">
                                <strong>Amount:</strong>
                                <span>
                                    {workBreakdown.project?.currency === 'INR' ? '₹' :
                                        workBreakdown.project?.currency === 'USD' ? '$' :
                                            workBreakdown.project?.currency === 'EUR' ? '€' : ''}
                                    {workBreakdown.amount} {workBreakdown.project?.currency || 'INR'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Client Script Section */}
                    {workBreakdown.project?.scriptFile && (
                        <div className="card">
                            <div className="card-header">
                                <h3>📄 Client Script</h3>
                            </div>
                            <div className="card-body">
                                <a
                                    href={workBreakdown.project.scriptFile.match(/^https?:\/\//) ? workBreakdown.project.scriptFile : (workBreakdown.project.scriptFile.startsWith('/') || workBreakdown.project.scriptFile.startsWith('uploads') ? `${API_BASE_URL}${workBreakdown.project.scriptFile}` : `https://${workBreakdown.project.scriptFile}`)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="script-download-btn"
                                >
                                    <span>📥</span>
                                    <span>Download Script File</span>
                                    <span>↗</span>
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Admin Shared Details */}
                    {(workBreakdown.shareDetails || (workBreakdown.links && workBreakdown.links.length > 0)) && (
                        <div className="card">
                            <div className="card-header">
                                <h3>📋 Admin Instructions</h3>
                            </div>
                            <div className="card-body">
                                {workBreakdown.shareDetails && (
                                    <div className="admin-details">
                                        <strong>Details:</strong>
                                        <p>{workBreakdown.shareDetails}</p>
                                    </div>
                                )}
                                {workBreakdown.links && workBreakdown.links.length > 0 && (
                                    <div className="admin-links">
                                        <strong>Shared Links:</strong>
                                        {workBreakdown.links.map((link, idx) => (
                                            <a
                                                key={idx}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="admin-link"
                                            >
                                                🔗 {link.title || `Link ${idx + 1}`}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Work Feedback & Discussion */}
                    {workBreakdown.feedback && workBreakdown.feedback.length > 0 && (
                        <div className="card feedback-card">
                            <div className="card-header">
                                <h3>💬 General Feedback & Discussion</h3>
                            </div>
                            <div className="card-body">
                                <div className="feedback-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {workBreakdown.feedback.map((f, i) => (
                                        <div
                                            key={i}
                                            className={`feedback-bubble ${f.from?._id === user._id ? 'sent' : 'received'}`}
                                            style={{
                                                padding: '10px 15px',
                                                borderRadius: '15px',
                                                backgroundColor: f.from?._id === user._id ? '#e3f2fd' : '#f1f5f9',
                                                border: '1px solid #e2e8f0',
                                                maxWidth: '85%',
                                                alignSelf: f.from?._id === user._id ? 'flex-end' : 'flex-start'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                                                <strong style={{ fontSize: '11px', color: '#1976d2' }}>{f.from?.name || 'User'} ({f.from?.role})</strong>
                                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>{formatDateTime(f.timestamp)}</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>{f.content}</p>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                    <input
                                        type="text"
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: '20px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            outline: 'none'
                                        }}
                                        placeholder="Write a message..."
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddFeedback()}
                                    />
                                    <button
                                        className="btn btn-primary btn-sm"
                                        style={{ borderRadius: '20px', padding: '0 15px' }}
                                        onClick={handleAddFeedback}
                                        disabled={isSubmittingFeedback || !feedbackText.trim()}
                                    >
                                        {isSubmittingFeedback ? '...' : 'Send'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Previous Submissions */}
                    {submissions.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <h3>History & Corrections</h3>
                            </div>
                            <div className="card-body">
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

                                        {sub.editorMessage && (
                                            <div className="editor-message">
                                                <strong>Your Message:</strong>
                                                <p>{sub.editorMessage}</p>
                                            </div>
                                        )}

                                        {sub.corrections && sub.corrections.length > 0 && (
                                            <div className="corrections-container">
                                                <h4>Corrections ({sub.corrections.filter(c => !c.done).length} pending)</h4>
                                                <ul>
                                                    {sub.corrections.map((corr, idx) => (
                                                        <li key={idx} className={corr.done ? 'correction-done' : 'correction-pending'}>
                                                            <div className="correction-status">
                                                                <span className="date">{formatDateTime(corr.addedAt)}</span>
                                                                <span className={corr.done ? 'status-fixed' : 'status-pending'}>
                                                                    {corr.done ? '✓ Fixed' : '⚠ Needs Fix'}
                                                                </span>
                                                            </div>
                                                            {corr.text && <div className="correction-text">{corr.text}</div>}
                                                            {corr.voiceFile && (
                                                                <div className="correction-voice">
                                                                    <strong>🎤 Voice Note:</strong>
                                                                    <audio controls src={corr.voiceFile.match(/^https?:\/\//) ? corr.voiceFile : (corr.voiceFile.startsWith('/') || corr.voiceFile.startsWith('uploads') ? `${API_BASE_URL}${corr.voiceFile}` : `https://${corr.voiceFile}`)} />
                                                                </div>
                                                            )}
                                                            {corr.mediaFiles && corr.mediaFiles.length > 0 && (
                                                                <div className="correction-media">
                                                                    <strong>📎 Attachments:</strong>
                                                                    {corr.mediaFiles.map((m, i) => (
                                                                        <a key={i} href={m.match(/^https?:\/\//) ? m : (m.startsWith('/') || m.startsWith('uploads') ? `${API_BASE_URL}${m}` : `https://${m}`)} target="_blank" rel="noopener noreferrer">
                                                                            📄 File {i + 1}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Upload Form */}
                <div className="upload-form-section">
                    <div className="card">
                        <div className="card-header">
                            <h2>Upload Your Work</h2>
                        </div>
                        <div className="card-body">
                            {error && <div className="alert alert-error">{error}</div>}
                            {success && <div className="alert alert-success">Work uploaded successfully! Redirecting...</div>}

                            <div className="upload-tabs" style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '20px' }}>
                                <button
                                    type="button"
                                    className={`tab-btn ${uploadType === 'output' ? 'active' : ''}`}
                                    onClick={() => setUploadType('output')}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: uploadType === 'output' ? '2px solid #2E86AB' : 'none',
                                        color: uploadType === 'output' ? '#2E86AB' : '#666',
                                        fontWeight: uploadType === 'output' ? '600' : '400',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📤 Final Output
                                </button>
                                <button
                                    type="button"
                                    className={`tab-btn ${uploadType === 'source' ? 'active' : ''}`}
                                    onClick={() => setUploadType('source')}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: uploadType === 'source' ? '2px solid #2E86AB' : 'none',
                                        color: uploadType === 'source' ? '#2E86AB' : '#666',
                                        fontWeight: uploadType === 'source' ? '600' : '400',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📦 Source File
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Final Output Tab */}
                                {uploadType === 'output' && (
                                    <div className="form-group">
                                        <label className="form-label">Link URL (Output)</label>
                                        <input
                                            type="url"
                                            className="form-input"
                                            value={linkUrl}
                                            onChange={(e) => setLinkUrl(e.target.value)}
                                            placeholder="https://example.com/your-work"
                                            required={uploadType === 'output'}
                                        />
                                        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                            Provide the link to the final rendered output (e.g. Frame.io, Vimeo, Drive).
                                        </p>
                                    </div>
                                )}

                                {/* Source File Tab */}
                                {uploadType === 'source' && (
                                    <div className="form-group">
                                        <label className="form-label">
                                            Work/Project File (Source)
                                        </label>
                                        <input
                                            type="url"
                                            className="form-input"
                                            value={workLinkUrl}
                                            onChange={(e) => setWorkLinkUrl(e.target.value)}
                                            placeholder="https://drive.google.com/..."
                                            required={uploadType === 'source'}
                                        />
                                        <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                            Provide the link to the source project files for the next editor.
                                        </p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-block"
                                    style={{ marginTop: '20px' }}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading...' : (uploadType === 'output' ? '📤 Upload Final Output' : '📦 Upload Source File')}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadWorkPage;
