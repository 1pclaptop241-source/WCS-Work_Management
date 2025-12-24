import { useState } from 'react';
import './SupportPage.css';

const SupportPage = ({ onClose, userRole }) => {
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        email: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        // Create mailto link with pre-filled data
        const mailtoLink = `mailto:support@wcsmanagement.com?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
            `From: ${formData.email}\n\n${formData.message}`
        )}`;
        window.location.href = mailtoLink;
    };

    return (
        <div className="support-modal-overlay" onClick={onClose}>
            <div className="support-modal" onClick={(e) => e.stopPropagation()}>
                <div className="support-modal-header">
                    <h2>Support & Help</h2>
                    <button className="support-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="support-modal-body">
                    {/* Contact Information Section */}
                    <div className="support-section">
                        <div className="support-icon-header">
                            <span className="support-emoji">📧</span>
                            <h3>Contact Information</h3>
                        </div>
                        <div className="contact-info">
                            <div className="contact-item">
                                <span className="contact-label">General Support:</span>
                                <a href="" className="contact-link">
                                    Loading...
                                </a>
                            </div>
                            <div className="contact-item">
                                <span className="contact-label">Technical Issues:</span>
                                <a href="" className="contact-link">
                                    Loading...
                                </a>
                            </div>
                            <div className="contact-item">
                                <span className="contact-label">Billing & Payments:</span>
                                <a href="" className="contact-link">
                                    Loading...
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Quick Contact Form */}
                    {/* <div className="support-section">
                        <div className="support-icon-header">
                            <span className="support-emoji">✉️</span>
                            <h3>Quick Contact</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="support-form">
                            <div className="form-group">
                                <label className="form-label">Your Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="your.email@example.com"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Subject</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="Brief description of your issue"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Message</label>
                                <textarea
                                    className="form-textarea"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Describe your issue or question in detail..."
                                    rows="5"
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary support-submit-btn">
                                Send Email
                            </button>
                        </form>
                    </div> */}

                    {/* FAQ Section */}
                    <div className="support-section">
                        <div className="support-icon-header">
                            <span className="support-emoji">❓</span>
                            <h3>Frequently Asked Questions</h3>
                        </div>
                        <div className="faq-list">
                            {userRole === 'client' ? (
                                <>
                                    <div className="faq-item">
                                        <h4>How do I create a new project?</h4>
                                        <p>Click the "Create Project" button on your dashboard, fill in the project details, and submit. An admin will review and accept your project.</p>
                                    </div>
                                    <div className="faq-item">
                                        <h4>How can I track my project progress?</h4>
                                        <p>Navigate to "Ongoing Projects" to view all your active projects. Click on any project to see detailed work breakdowns and status updates.</p>
                                    </div>
                                    <div className="faq-item">
                                        <h4>When will I receive my completed work?</h4>
                                        <p>You can view submitted work in the project details. Once you approve the work, it will be marked as completed.</p>
                                    </div>
                                    <div className="faq-item">
                                        <h4>How do I make payments?</h4>
                                        <p>Go to the Payments section to view pending payments and make transactions. All payment records are tracked in your dashboard.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="faq-item">
                                        <h4>How do I view my assigned tasks?</h4>
                                        <p>All your assigned work items are displayed on the "Assigned Works" tab. Click on any work card to upload or manage your submissions.</p>
                                    </div>
                                    <div className="faq-item">
                                        <h4>How do I upload my work?</h4>
                                        <p>Click on a work card, then use the upload section to submit your files. You can upload images, videos, or other required formats.</p>
                                    </div>
                                    <div className="faq-item">
                                        <h4>What if corrections are requested?</h4>
                                        <p>If corrections are needed, you'll see a "Corrections Needed" status. Review the feedback and upload the corrected version.</p>
                                    </div>
                                    <div className="faq-item">
                                        <h4>When will I receive payment?</h4>
                                        <p>Check the "Payment Information" tab to view your payment status. Payments are processed after your work is approved by both client and admin.</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Working Hours */}
                    <div className="support-section">
                        <div className="support-icon-header">
                            <span className="support-emoji">🕐</span>
                            <h3>Support Hours</h3>
                        </div>
                        <div className="support-hours">
                            <p><strong>Monday - Friday:</strong> 9:00 AM - 6:00 PM (IST)</p>
                            <p><strong>Saturday:</strong> 10:00 AM - 4:00 PM (IST)</p>
                            <p><strong>Sunday:</strong> Closed</p>
                            <p className="support-note">
                                <em>We aim to respond to all inquiries within 24 business hours.</em>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportPage;
