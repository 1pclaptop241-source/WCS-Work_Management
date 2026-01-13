import React, { useState, useEffect } from 'react';
import './ProjectRoadmap.css';
import { FaCheck, FaClock, FaCircle, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { workBreakdownAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';

const ProjectRoadmap = ({ projectId, currentWorkType, projectTitle }) => {
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectId) {
            loadRoadmap();
        }
    }, [projectId]);

    const loadRoadmap = async () => {
        try {
            setLoading(true);
            const response = await workBreakdownAPI.getByProject(projectId);
            // The API returns the work breakdown items. We should respect their order.
            // If the API doesn't guarantee order, we might need to sort by deadline or insertion order.
            // For now assuming API returns logical order or insertion order.
            setStages(response.data || []);
        } catch (err) {
            console.error("Failed to load project roadmap:", err);
            setError("Could not load roadmap");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="roadmap-loading"><FaSpinner className="spin" /> Loading Roadmap...</div>;
    if (error) return null; // Or show error elegantly
    if (!stages || stages.length === 0) return null;

    // Helper to determine step status based on WorkBreakdown object
    const getStepStatus = (stage) => {
        if (stage.approved) return 'done';

        // If it's not approved, check if there are submissions or if it matches current work context
        // We might want to mark it 'active' if it's the current context
        const isCurrentContext = currentWorkType &&
            currentWorkType.toLowerCase().replace(/[^a-z]/g, '') === stage.workType.toLowerCase().replace(/[^a-z]/g, '');

        if (isCurrentContext) return 'active';

        // You could also check stage.status from backend if available (e.g. 'in_progress' vs 'pending')
        if (stage.status === 'in_progress' || stage.status === 'under_review') return 'active';

        return 'pending';
    };

    // Calculate progress: find the index of the last 'done' step
    // Actually, progress line should extend through all 'done' steps and land on 'active'
    let lastDoneIndex = -1;
    stages.forEach((stage, index) => {
        const s = getStepStatus(stage);
        if (s === 'done') {
            lastDoneIndex = index;
        }
    });

    // Add 1 to include the partial progress to the next step if active? 
    // Or just simple percentage based on completed steps.
    // Let's stick to the visual style: percentage of total steps.
    // referencing the last DONE index means the line goes up to that point. 
    // If we want it to go to the current active one, use that.

    let activeIndex = lastDoneIndex;
    // Find first active after done
    const firstActiveIndex = stages.findIndex((s, i) => i > lastDoneIndex && getStepStatus(s) === 'active');
    if (firstActiveIndex !== -1) activeIndex = firstActiveIndex;

    const progressPercentage = stages.length <= 1 ? 0 : (activeIndex / (stages.length - 1)) * 100;

    return (
        <div className="project-roadmap">
            <div className="roadmap-header">
                <h3 style={{ margin: 0 }}>🚀 Roadmap: {projectTitle || 'Project'}</h3>
            </div>

            <div className="roadmap-stepper">
                {/* Active Progress Line */}
                <div
                    className="roadmap-progress-line"
                    style={{ width: `${Math.max(0, Math.min(100, progressPercentage))}%` }}
                />

                {stages.map((stage, index) => {
                    const status = getStepStatus(stage);

                    return (
                        <div
                            key={stage._id || index}
                            className={`roadmap-step ${status}`}
                        >
                            <div className="step-circle">
                                {status === 'done' ? (
                                    <FaCheck className="step-icon" />
                                ) : status === 'active' ? (
                                    <FaSpinner className="step-icon spin" />
                                ) : (
                                    <FaCircle className="step-icon" style={{ fontSize: '8px' }} />
                                )}
                            </div>

                            <div className="step-label">
                                {stage.workType || 'Untitled Stage'}
                            </div>

                            {/* Optional: Show deadline or status text */}
                            {/* 
                            <div className="step-status">
                                {status === 'done' ? 'Completed' : status === 'active' ? 'In Progress' : ''}
                            </div> 
                            */}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectRoadmap;
