import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import './TermsModal.css';

const TermsModal = () => {
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [show, setShow] = useState(true);

    // Only hide if specifically true. If undefined/null/false, SHOW IT.
    if (!user || user.role === 'admin' || user.agreedToTerms === true || !show) {
        return null;
    }

    const agreementFile = user.role === 'client'
        ? '/agreements/Clientagreement.pdf'
        : '/agreements/Editoragreement.pdf';

    const handleAgree = async () => {
        if (!agreed) {
            setError('Please read and check the agreement box.');
            return;
        }

        try {
            setLoading(true);
            const response = await authAPI.agreeTerms();

            // Updating local storage to match new state
            const updatedUser = { ...user, ...response.data };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Force reload ensures the entire app (including context) receives the new 'agreedToTerms: true'
            // This prevents the modal from reopening
            window.location.reload();
        } catch (err) {
            console.error('Agreement error:', err);
            setError(err.response?.data?.message || 'Failed to update agreement status.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // If they close the modal without agreeing, they cannot proceed.
        // We log them out to enforce the requirement.
        logout();
        window.location.href = '/login';
    };

    return (
        <div className="terms-modal-overlay">
            <div className="terms-modal">
                <button
                    className="close-button"
                    onClick={handleClose}
                    aria-label="Close"
                >
                    ×
                </button>

                <h2>Terms and Conditions</h2>
                <p>Please read and agree to the terms and conditions to continue.</p>

                <div className="pdf-container">
                    <iframe
                        src={agreementFile}
                        title="Terms and Conditions"
                        width="100%"
                        height="400px"
                    />
                </div>

                <div className="pdf-fallback-link">
                    <p>
                        Can't see the Terms & conditions? <a href={agreementFile} target="_blank" rel="noopener noreferrer">Click here to view in a new tab</a>
                    </p>
                </div>

                {error && <div className="alert-error">{error}</div>}

                <div className="terms-actions">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={agreed}
                            onChange={(e) => {
                                setAgreed(e.target.checked);
                                setError('');
                            }}
                        />
                        I have read and agree to the Terms and Conditions
                    </label>

                    <button
                        className="btn btn-primary"
                        onClick={handleAgree}
                        disabled={loading || !agreed}
                    >
                        {loading ? 'Processing...' : 'Accept & Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;
