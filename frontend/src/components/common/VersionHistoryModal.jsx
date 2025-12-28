import React, { useState, useEffect } from 'react';
import { worksAPI, API_BASE_URL } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import StatusBadge from './StatusBadge';
import { FaHistory, FaDownload, FaExternalLinkAlt, FaQuoteLeft } from 'react-icons/fa';

const VersionHistoryModal = ({ workBreakdown, onClose }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, [workBreakdown]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const response = await worksAPI.getByWorkBreakdown(workBreakdown._id);
            setSubmissions(response.data);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <h2>
                        <FaHistory style={{ marginRight: '10px' }} />
                        Version History
                    </h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body" style={{ padding: '20px', backgroundColor: '#f8f9fa' }}>
                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 5px 0', color: '#555' }}>Project: {workBreakdown.project?.title}</h4>
                        <p style={{ margin: 0, color: '#777' }}>Work Type: {workBreakdown.workType}</p>
                    </div>

                    {loading ? (
                        <div className="text-center" style={{ padding: '40px', color: '#666' }}>Loading history...</div>
                    ) : submissions.length === 0 ? (
                        <div className="text-center" style={{ padding: '40px', color: '#666' }}>No submissions found.</div>
                    ) : (
                        <div className="version-timeline" style={{ position: 'relative', paddingLeft: '20px' }}>
                            {/* Vertical Line */}
                            <div style={{
                                position: 'absolute',
                                left: '29px',
                                top: '0',
                                bottom: '0',
                                width: '2px',
                                backgroundColor: '#e9ecef'
                            }}></div>

                            {submissions.map((sub, index) => (
                                <div key={sub._id} className="version-card" style={{
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    padding: '20px',
                                    marginBottom: '20px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    position: 'relative',
                                    border: index === 0 ? '2px solid #3b82f6' : '1px solid #eee' // Highlight latest
                                }}>
                                    {/* Timeline Dot */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '-37px',
                                        top: '25px',
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        backgroundColor: index === 0 ? '#3b82f6' : '#cbd5e1',
                                        border: '3px solid #f8f9fa'
                                    }}></div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                                <span style={{
                                                    fontWeight: 'bold',
                                                    fontSize: '1.1rem',
                                                    color: '#333'
                                                }}>
                                                    Version {sub.version || (submissions.length - index)}
                                                </span>
                                                {index === 0 && <span className="badge badge-primary" style={{ fontSize: '0.7em' }}>LATEST</span>}
                                                <StatusBadge status={sub.status} />
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#888' }}>
                                                Submitted on {formatDateTime(sub.submittedAt)}
                                            </div>
                                        </div>

                                        <div className="submission-actions">
                                            {sub.submissionType === 'link' ? (
                                                <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <FaExternalLinkAlt /> Open Link
                                                </a>
                                            ) : (
                                                <a href={sub.fileUrl.match(/^https?:\/\//) ? sub.fileUrl : (sub.fileUrl.startsWith('/') || sub.fileUrl.startsWith('uploads') ? `${API_BASE_URL}${sub.fileUrl}` : `https://${sub.fileUrl}`)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <FaDownload /> Download File
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Changelog Section */}
                                    <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '15px', borderLeft: '3px solid #cbd5e1' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Changelog / Notes</div>
                                        <div style={{ color: '#334155', whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                                            {sub.changelog || sub.editorMessage || "No notes provided."}
                                        </div>
                                    </div>

                                    {/* Feedback Section - only if corrections exist */}
                                    {(sub.corrections?.length > 0 || sub.clientFeedback) && (
                                        <div style={{ marginTop: '15px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                            <h5 style={{ margin: '0 0 10px 0', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <FaQuoteLeft size={12} /> Feedback & Corrections
                                            </h5>

                                            {sub.clientFeedback && (
                                                <div style={{ marginBottom: '10px', fontStyle: 'italic', color: '#555' }}>
                                                    "{sub.clientFeedback}"
                                                </div>
                                            )}

                                            {sub.corrections?.length > 0 && (
                                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                    {sub.corrections.map((corr, i) => (
                                                        <li key={i} style={{
                                                            padding: '8px 12px',
                                                            backgroundColor: corr.done ? '#f0fdf4' : '#fff7ed',
                                                            marginBottom: '8px',
                                                            borderRadius: '4px',
                                                            borderLeft: `3px solid ${corr.done ? '#22c55e' : '#f97316'}`
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: '#333' }}>{corr.text}</span>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: corr.done ? '#22c55e' : '#f97316' }}>
                                                                    {corr.done ? 'RESOLVED' : 'OPEN'}
                                                                </span>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VersionHistoryModal;
