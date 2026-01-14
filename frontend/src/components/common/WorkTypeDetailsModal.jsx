import './WorkTypeDetailsModal.css';

const WorkTypeDetailsModal = ({ workBreakdown, onClose }) => {
    if (!workBreakdown) return null;

    const hasDetails = (workBreakdown.shareDetails && workBreakdown.shareDetails.trim()) ||
        (workBreakdown.adminInstructions && workBreakdown.adminInstructions.trim()) ||
        (workBreakdown.clientInstructions && workBreakdown.clientInstructions.trim());
    const hasLinks = workBreakdown.links && workBreakdown.links.length > 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal work-details-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Work Type Details: {workBreakdown.workType}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {!hasDetails && !hasLinks ? (
                        <div className="no-details-message">
                            <p>No additional details or links were shared for this work type.</p>
                        </div>
                    ) : (
                        <>
                            {workBreakdown.clientInstructions && workBreakdown.clientInstructions.trim() && (
                                <div className="details-section" style={{ marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>👤 Client Instructions</h3>
                                    <div className="details-content" style={{ padding: '10px', background: '#f0f9ff', borderRadius: '8px', borderLeft: '4px solid #0ea5e9' }}>
                                        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{workBreakdown.clientInstructions}</p>
                                    </div>
                                </div>
                            )}

                            {(workBreakdown.adminInstructions || (workBreakdown.shareDetails && workBreakdown.shareDetails.trim())) && (
                                <div className="details-section">
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>📝 Admin Instructions</h3>
                                    <div className="details-content">
                                        {workBreakdown.adminInstructions && (
                                            <p style={{ whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{workBreakdown.adminInstructions}</p>
                                        )}
                                        {workBreakdown.shareDetails && workBreakdown.shareDetails.trim() && (
                                            <div style={{ borderTop: workBreakdown.adminInstructions ? '1px solid #eee' : 'none', paddingTop: workBreakdown.adminInstructions ? '10px' : '0' }}>
                                                {workBreakdown.adminInstructions && <strong>Additional Details:</strong>}
                                                <p style={{ whiteSpace: 'pre-wrap' }}>{workBreakdown.shareDetails}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {hasLinks && (
                                <div className="links-section">
                                    <h3>🔗 Shared Links</h3>
                                    <div className="links-list">
                                        {workBreakdown.links.map((link, index) => (
                                            <div key={index} className="link-item">
                                                <span className="link-title">{link.title || `Link ${index + 1}`}</span>
                                                <a
                                                    href={link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="link-url"
                                                >
                                                    {link.url}
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default WorkTypeDetailsModal;
