import { API_BASE_URL } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import { motion, AnimatePresence } from 'framer-motion';
import './FeedbackChat.css';

const FeedbackChat = ({ corrections, currentUser, onMarkFixed, canMarkFixed, markingId }) => {
    if (!corrections || corrections.length === 0) {
        return (
            <div className="feedback-chat empty">
                <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center' }}>
                    No feedback or corrections yet.
                </p>
            </div>
        );
    }

    return (
        <div className="feedback-chat">
            {corrections.map((msg, index) => {
                // Determine if message is sent by current user or someone else
                // Ideally 'addedBy' should have an ID. If it's populated, check _id. 
                // If not populated (legacy), default to 'received' style unless we can determine.
                const isMe = msg.addedBy?._id === currentUser?._id;
                const isMarking = markingId === msg._id;

                return (
                    <div key={index} className={`chat-message ${isMe ? 'sent' : 'received'}`}>
                        <div className="message-avatar" title={msg.addedBy?.name || 'User'}>
                            {(msg.addedBy?.name || 'U').charAt(0).toUpperCase()}
                        </div>

                        <div className="message-content">
                            <div className="message-header">
                                <span className="sender-name">{msg.addedBy?.name || 'Unknown'}</span>
                                <span className="message-time">{formatDateTime(msg.addedAt)}</span>
                            </div>

                            <div className="message-body">
                                {msg.text || (
                                    <span style={{ fontStyle: 'italic', color: '#888' }}>
                                        {(msg.voiceFile || msg.mediaFiles?.length > 0) ? 'Shared files' : 'No text content'}
                                    </span>
                                )}
                            </div>

                            {(msg.voiceFile || (msg.mediaFiles && msg.mediaFiles.length > 0)) && (
                                <div className="message-attachments">
                                    {msg.voiceFile && (
                                        <div style={{ width: '100%' }}>
                                            <audio
                                                controls
                                                src={`${API_BASE_URL}${msg.voiceFile}`}
                                                className="voice-note-player"
                                            />
                                        </div>
                                    )}
                                    {msg.mediaFiles && msg.mediaFiles.map((file, i) => (
                                        <a
                                            key={i}
                                            href={`${API_BASE_URL}${file}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="attachment-link"
                                        >
                                            📎 Attachment {i + 1}
                                        </a>
                                    ))}
                                </div>
                            )}

                            <div className="message-actions">
                                {msg.done ? (
                                    <motion.span
                                        className="status-badge status-fixed"
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        type="spring"
                                        stiffness={500}
                                    >
                                        ✓ Fixed
                                    </motion.span>
                                ) : (
                                    canMarkFixed ? (
                                        <motion.button
                                            className="mark-fixed-btn"
                                            onClick={() => !isMarking && onMarkFixed(msg._id)}
                                            disabled={isMarking}
                                            whileHover={!isMarking ? { scale: 1.05 } : {}}
                                            whileTap={!isMarking ? { scale: 0.95 } : {}}
                                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                            style={{ opacity: isMarking ? 0.7 : 1, cursor: isMarking ? 'not-allowed' : 'pointer' }}
                                        >
                                            {isMarking ? 'Marking Fixed...' : 'Mark as Fixed'}
                                        </motion.button>
                                    ) : (
                                        <span className="status-badge status-pending">⚠ Pending Fix</span>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default FeedbackChat;
