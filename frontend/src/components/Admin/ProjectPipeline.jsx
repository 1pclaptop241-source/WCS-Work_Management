import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { FaClock, FaUser, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import './ProjectPipeline.css';

const ProjectPipeline = ({ projects }) => {
    const navigate = useNavigate();

    const columns = [
        { title: 'New', status: 'pending', color: '#64748b' },
        { title: 'In Production', status: 'in_progress', color: '#3b82f6' },
        { title: 'Internal Review', status: 'submitted', color: '#f59e0b' },
        { title: 'Client Review', status: 'under_review', color: '#8b5cf6' },
        { title: 'Completed', status: 'completed', color: '#10b981' }
    ];

    const getProjectColumn = (project) => {
        if (!project.accepted) return 'pending';
        if (project.closed || project.status === 'completed') return 'completed';
        if (project.status === 'under_review') return 'under_review';
        if (project.status === 'submitted') return 'submitted';
        return 'in_progress';
    };

    const groupedProjects = columns.reduce((acc, col) => {
        acc[col.status] = projects.filter(p => getProjectColumn(p) === col.status);
        return acc;
    }, {});

    const getDeadlineInfo = (deadline) => {
        const now = new Date();
        const dDate = new Date(deadline);
        const diff = dDate - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return { label: 'Overdue', color: '#ef4444', icon: <FaExclamationTriangle /> };
        if (days <= 2) return { label: 'Urgent', color: '#f59e0b', icon: <FaClock /> };
        return { label: `${days}d left`, color: '#64748b', icon: <FaClock /> };
    };

    return (
        <div className="pipeline-container">
            <div className="pipeline-board">
                {columns.map(col => (
                    <div key={col.status} className="pipeline-column">
                        <div className="column-header" style={{ borderTop: `4px solid ${col.color}` }}>
                            <h3>{col.title} <span className="count">{groupedProjects[col.status]?.length || 0}</span></h3>
                        </div>
                        <div className="column-body">
                            {groupedProjects[col.status]?.map(project => {
                                const deadlineInfo = getDeadlineInfo(project.deadline);
                                return (
                                    <div
                                        key={project._id}
                                        className="pipeline-card"
                                        onClick={() => navigate(`/admin/project/${project._id}`)}
                                    >
                                        <div className="card-top">
                                            <h4 title={project.title}>{project.title}</h4>
                                            <StatusBadge status={project.status} />
                                        </div>

                                        <div className="card-details">
                                            <div className="detail-item">
                                                <FaUser size={12} />
                                                <span>{project.client?.name || 'No Client'}</span>
                                            </div>
                                            <div className="detail-item" style={{ color: deadlineInfo.color }}>
                                                {deadlineInfo.icon}
                                                <span>{deadlineInfo.label}</span>
                                            </div>
                                        </div>

                                        <div className="card-footer">
                                            <div className="amount">
                                                {project.currency === 'INR' ? '₹' : project.currency === 'USD' ? '$' : '€'}
                                                {project.clientAmount?.toLocaleString() || project.amount?.toLocaleString()}
                                            </div>
                                            {project.assignedEditor && (
                                                <div className="editor-avatar" title={`Editor: ${project.assignedEditor.name}`}>
                                                    {project.assignedEditor.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {(!groupedProjects[col.status] || groupedProjects[col.status].length === 0) && (
                                <div className="empty-column">No projects</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectPipeline;
