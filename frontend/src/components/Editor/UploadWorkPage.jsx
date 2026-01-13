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
    const [uploadType, setUploadType] = useState('link');
    const [workUploadType, setWorkUploadType] = useState('link');
    const [linkUrl, setLinkUrl] = useState('');
    const [workLinkUrl, setWorkLinkUrl] = useState('');
    const [editorMessage, setEditorMessage] = useState('');
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

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (uploadType === 'file' && !file) {
            setError('Please select a file to upload');
            return;
        }
        if (uploadType === 'link' && !linkUrl.trim()) {
            setError('Please provide a link URL');
            return;
        }

        try {
            setUploading(true);
            setError('');
            setSuccess(false); // Clear previous success

            const formData = new FormData();
            formData.append('projectId', workBreakdown.project._id);
            formData.append('workBreakdownId', workBreakdownId);

            if (uploadType === 'file') {
                formData.append('file', file);
            } else {
                formData.append('linkUrl', linkUrl);
            }

            if (workFile) {
                formData.append('workFile', workFile);
            }
            if (workLinkUrl && workLinkUrl.trim()) {
                formData.append('workLinkUrl', workLinkUrl);
            }

            // Debug: Log FormData keys
            for (let [key, value] of formData.entries()) {
                console.log(`FormData: ${key} = ${value}`);
            }

            if (editorMessage.trim()) {
                formData.append('editorMessage', editorMessage);
            }

            // worksAPI.upload now needs to handle FormData correctly or we pass FormData directly if the API wrapper supports it.
            // Assuming worksAPI.upload takes arguments and builds FormData, we might need to update the API service wrapper OR just pass form data if it constructs it manually.
            // Let's check `handleSubmit` again. It constructs `formData` manually above (lines 95-107).
            // But the original code calls `worksAPI.upload` with arguments at line 109.
            // I need to see `worksAPI.upload` implementation to match it, or check if I can pass FormData directly.
            // Looking at the original code (lines 109-115), it passes arguments.
            // I should likely update `worksAPI.upload` signature in `api.js` OR change this component to call the endpoint directly/differently.
            // However, to stay consistent, I will assume I can modify `worksAPI` later or the `api.js` file needs checking. 
            // Wait, I can't check api.js right now in this step.
            // The safest bet is often to pass the FormData if the API function supports it, OR update the arguments.
            // Let's assume I will update `api.js` to accept `workFile` as well.

            await worksAPI.upload(formData);
            // NOTE: I am changing the call to pass formData directly, which implies I MUST update `services/api.js`.
            // Alternatively, I can pass all args: project_id, wb_id, file, link, msg, workFile.
            // Let's try to pass arguments to be safe if I can't change api.js easily right now or if I want to minimize changes.
            // But FormData is already built in the component (lines 95+). 
            // Actually, lines 109-115 call `worksAPI.upload` with args, but lines 95-107 BUILD formData but DON'T USE IT in the original code!
            // Wait, looking at original code... 
            // 95: const formData = new FormData();
            // ...
            // 109: await worksAPI.upload(...)
            // The original code BUILDS formData but creates a NEW request in `worksAPI.upload`? 
            // Or `worksAPI.upload` uses the arguments to build its own FormData?
            // If I look closely at the original snippet:
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
                uploadType === 'file' ? file : null,
                uploadType === 'link' ? linkUrl : null,
                editorMessage,
                workFile // Adding workFile as new argument
            );

            setSuccess(true);
            // setFile(null); // Removed - no longer used
            setWorkFile(null);
            setLinkUrl('');
            setWorkLinkUrl('');
            setEditorMessage('');
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
                        roadmap={workBreakdown.project?.roadmap}
                        currentWorkType={workBreakdown.workType}
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

                            <form onSubmit={handleSubmit}>
                                {/* Upload Type Tabs - DISABLED TEMPORARILY
                                <div className="upload-tabs">
                                    <button
                                        type="button"
                                        className={`tab-btn ${uploadType === 'file' ? 'active' : ''}`}
                                        onClick={() => setUploadType('file')}
                                    >
                                        📁 File Upload
                                    </button>
                                    <button
                                        type="button"
                                        className={`tab-btn ${uploadType === 'link' ? 'active' : ''}`}
                                        onClick={() => setUploadType('link')}
                                    >
                                        🔗 Link URL
                                    </button>
                                </div>
                                */}

                                {/* File/Link Input */}
                                <div className="form-group">
                                    {uploadType === 'file' ? (
                                        <>
                                            <label className="form-label">Select File</label>
                                            <input
                                                type="file"
                                                className="form-input"
                                                onChange={handleFileChange}
                                                required
                                            />
                                            {file && (
                                                <p className="file-info">
                                                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <label className="form-label">Link URL (Output)</label>
                                            <input
                                                type="url"
                                                className="form-input"
                                                value={linkUrl}
                                                onChange={(e) => setLinkUrl(e.target.value)}
                                                placeholder="https://example.com/your-work"
                                                required
                                            />
                                        </>
                                    )}
                                </div>

                                {/* Work File Input (Source) */}
                                <div className="form-group" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                                    <label className="form-label">
                                        Work/Project File (Source)
                                        <span className="label-hint">Optional: Upload the source file for the next editor</span>
                                    </label>

                                    {/* Work Upload/Link Tabs */}
                                    {/* Work Upload/Link Tabs - DISABLED TEMPORARILY
                                    <div className="upload-tabs" style={{ marginBottom: '10px' }}>
                                        <button
                                            type="button"
                                            className={`tab-btn ${workUploadType === 'file' ? 'active' : ''}`}
                                            onClick={() => setWorkUploadType('file')}
                                            style={{ fontSize: '13px', padding: '5px 10px' }}
                                        >
                                            📁 File Upload
                                        </button>
                                        <button
                                            type="button"
                                            className={`tab-btn ${workUploadType === 'link' ? 'active' : ''}`}
                                            onClick={() => setWorkUploadType('link')}
                                            style={{ fontSize: '13px', padding: '5px 10px' }}
                                        >
                                            🔗 Link URL
                                        </button>
                                    </div>
                                    */}

                                    {workUploadType === 'file' ? (
                                        <>
                                            <input
                                                type="file"
                                                className="form-input"
                                                onChange={(e) => setWorkFile(e.target.files[0])}
                                            />
                                            {workFile && (
                                                <p className="file-info">
                                                    Selected: {workFile.name} ({(workFile.size / 1024 / 1024).toFixed(2)} MB)
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <input
                                            type="url"
                                            className="form-input"
                                            value={workLinkUrl}
                                            onChange={(e) => setWorkLinkUrl(e.target.value)}
                                            placeholder="https://drive.google.com/..."
                                        />
                                    )}
                                </div>

                                {/* Editor Message */}
                                <div className="form-group">
                                    <label className="form-label">
                                        Message (Optional)
                                        <span className="label-hint">Add a note for the client/admin</span>
                                    </label>
                                    <textarea
                                        className="form-textarea"
                                        value={editorMessage}
                                        onChange={(e) => setEditorMessage(e.target.value)}
                                        rows="4"
                                        placeholder="E.g., 'Applied color grading as discussed. Please review the final scene.'"
                                    />
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-block"
                                    disabled={uploading || (uploadType === 'file' ? false : !linkUrl)} // Changed check since file is disabled
                                >
                                    {uploading ? 'Uploading...' : '📤 Upload Work'}
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
