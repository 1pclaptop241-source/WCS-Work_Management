import React from 'react';
import './ProjectRoadmap.css';
import { FaCheck, FaClock, FaCircle, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { formatDateTime } from '../../utils/formatDate';

// Define the logical order of stages
const STAGE_ORDER = [
    'roughcut',
    'broll',
    'colorCorrection',
    'motionGraphics',
    'memes',
    'musicSfx'
];

const STAGE_LABELS = {
    roughcut: 'Rough Cut',
    broll: 'B-Roll',
    colorCorrection: 'Color Correction',
    motionGraphics: 'Motion Graphics',
    memes: 'Memes',
    musicSfx: 'Music & SFX'
};

const ProjectRoadmap = ({ roadmap, currentWorkType }) => {
    if (!roadmap) return null;

    // Determine current active step based on roadmap status
    // We want to visually show progress.

    // Helper to determine step status
    const getStepStatus = (stageKey) => {
        const stageData = roadmap[stageKey];
        if (!stageData) return 'pending';

        // If specific status is set
        if (stageData.status === 'done') return 'done';
        if (stageData.status === 'in_progress') return 'active';

        // Special check for current work type of the editor
        // If the component is being viewed in context of a specific work type, highlight it
        if (currentWorkType && currentWorkType.toLowerCase().replace(/[^a-z]/g, '') === stageKey.toLowerCase()) {
            // Logic to map work types to keys might need refinement if they don't match exactly
            // Assuming 'Rough Cut' -> 'roughcut' via simple normalization
        }

        return 'pending';
    };

    // Find the index of the furthest 'done' or 'in_progress' step to calculate progress bar width
    let maxActiveIndex = -1;
    STAGE_ORDER.forEach((key, index) => {
        if (roadmap[key]?.status === 'done' || roadmap[key]?.status === 'in_progress') {
            maxActiveIndex = index;
        }
    });

    // Calculate progress percentage for the line
    const progressPercentage = maxActiveIndex === -1 ? 0 : (maxActiveIndex / (STAGE_ORDER.length - 1)) * 100;

    return (
        <div className="project-roadmap">
            <div className="roadmap-header">
                <h3>🚀 Project Roadmap</h3>
                <p className="roadmap-subtitle">Track the progress of this project through its creative stages.</p>
            </div>

            <div className="roadmap-stepper">
                {/* Progress Line Background is in CSS ::before */}

                {/* Active Progress Line (Inline style for width) */}
                <div
                    className="roadmap-progress-line"
                    style={{ width: `${progressPercentage}%` }}
                // For vertical (mobile), we'd need height, handled via media query + JS ideally, 
                // but CSS-only responsive constraints might limit dynamic vertical line without JS resize observer.
                // For MVP, we use the simple width=100% approach in CSS for vertical or just hide the progress line in mobile if complex.
                // See CSS for mobile override.
                />

                {STAGE_ORDER.map((stageKey, index) => {
                    const status = getStepStatus(stageKey);
                    const stageData = roadmap[stageKey];
                    const isCurrentWorkContext = currentWorkType &&
                        currentWorkType.toLowerCase().replace(/[^a-z]/g, '') === stageKey.toLowerCase();

                    // If it matches the current work page context and isn't marked differently, ensure it looks active
                    const displayStatus = isCurrentWorkContext && status === 'pending' ? 'active' : status;

                    return (
                        <div
                            key={stageKey}
                            className={`roadmap-step ${displayStatus}`}
                        >
                            <div className="step-circle" title={stageData?.status}>
                                {displayStatus === 'done' ? (
                                    <FaCheck className="step-icon" />
                                ) : displayStatus === 'active' ? (
                                    <FaSpinner className="step-icon spin" />
                                ) : (
                                    <FaCircle className="step-icon" style={{ fontSize: '8px' }} />
                                )}
                            </div>

                            <div className="step-label">
                                {STAGE_LABELS[stageKey] || stageKey}
                            </div>

                            {stageData?.updatedAt && (
                                <div className="step-status">
                                    {displayStatus === 'done' ? 'Completed' : displayStatus === 'active' ? 'In Progress' : ''}
                                    {/* formatDateTime(stageData.updatedAt) - optional to show date */}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectRoadmap;
