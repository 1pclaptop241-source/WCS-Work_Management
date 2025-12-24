import React from 'react';

const StatusBadge = ({ status, className = '' }) => {
    const getStatusConfig = (status) => {
        switch (status) {
            case 'pending':
                return { color: '#64748b', bg: '#f1f5f9', label: 'Pending', icon: '⏳' };
            case 'assigned':
                return { color: '#0ea5e9', bg: '#e0f2fe', label: 'Assigned', icon: '👤' };
            case 'in_progress':
                return { color: '#3b82f6', bg: '#dbeafe', label: 'in-progress', icon: '🔨' };
            case 'under_review':
                return { color: '#eab308', bg: '#fef9c3', label: 'Under Review', icon: '👀' };
            case 'needs_revision':
                return { color: '#f97316', bg: '#ffedd5', label: 'Needs Revision', icon: '📝' };
            case 'approved':
            case 'completed':
                return { color: '#22c55e', bg: '#dcfce7', label: 'Approved', icon: '✅' };
            case 'declined':
                return { color: '#ef4444', bg: '#fee2e2', label: 'Declined', icon: '⛔' };
            case 'submitted':
                return { color: '#8b5cf6', bg: '#ede9fe', label: 'Submitted', icon: '📤' };
            default:
                return { color: '#64748b', bg: '#f1f5f9', label: status, icon: 'Unknown' };
        }
    };

    const config = getStatusConfig(status);

    return (
        <span
            className={`status-badge ${className}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                backgroundColor: config.bg,
                color: config.color,
                border: `1px solid ${config.color}30`
            }}
        >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{config.icon}</span>
            {config.label}
        </span>
    );
};

export default StatusBadge;
