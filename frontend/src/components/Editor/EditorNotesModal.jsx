import { useState, useRef, useEffect } from 'react';

const EditorNotesModal = ({ workBreakdown, onClose, onSave }) => {
    const [notes, setNotes] = useState(workBreakdown.editorNotes || '');
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    const handleSave = () => {
        onSave(workBreakdown._id, notes);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
                <div className="modal-header">
                    <h3>Personal Notes</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <p style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>
                        Work: <strong>{workBreakdown.workType}</strong> ({workBreakdown.project?.title})
                    </p>
                    <div className="form-group">
                        <textarea
                            ref={textareaRef}
                            className="form-control"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add your private notes here..."
                            rows={8}
                            style={{ resize: 'vertical' }}
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save Notes</button>
                </div>
            </div>
        </div>
    );
};

export default EditorNotesModal;
