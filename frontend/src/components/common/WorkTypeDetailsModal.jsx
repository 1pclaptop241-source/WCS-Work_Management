import './WorkTypeDetailsModal.css';

const WorkTypeDetailsModal = ({ workBreakdown, onClose }) => {
    if (!workBreakdown) return null;

    const hasDetails = workBreakdown.shareDetails && workBreakdown.shareDetails.trim();
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
                            <p>No additional details or links were shared by the admin for this work type.</p>
                        </div>
                    ) : (
                        <>
                            {hasDetails && (
                                <div className="details-section">
                                    <h3>📝 Shared Details</h3>
                                    <div className="details-content">
                                        <p style={{ whiteSpace: 'pre-wrap' }}>{workBreakdown.shareDetails}</p>
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
