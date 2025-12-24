import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { FaUserCircle, FaCheckCircle, FaExclamationCircle, FaChartLine } from 'react-icons/fa';
import './EditorPerformanceView.css';

const EditorPerformanceView = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const res = await usersAPI.getEditorStats();
            setStats(res.data);
        } catch (err) {
            setError('Failed to load editor statistics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-spinner">Loading editor stats...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="performance-view">
            <div className="view-header">
                <h2>Editor Performance Overview</h2>
                <button className="btn btn-secondary btn-sm" onClick={loadStats}>Refresh Data</button>
            </div>

            <div className="stats-table-container">
                <table className="performance-table">
                    <thead>
                        <tr>
                            <th>Editor</th>
                            <th>Active Tasks</th>
                            <th>Completed</th>
                            <th>On-Time Rate</th>
                            <th>Avg. Revisions</th>
                            <th>Workload</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stats.map(editor => {
                            const completedTotal = editor.completedTasks || 0;
                            const totalFinished = completedTotal + (editor.lateSubmissions || 0);
                            const onTimeRate = totalFinished > 0
                                ? Math.round((completedTotal / totalFinished) * 100)
                                : 100;

                            const workloadColor = editor.activeTasks > 5 ? '#ef4444' : editor.activeTasks > 3 ? '#f59e0b' : '#10b981';

                            return (
                                <tr key={editor._id}>
                                    <td>
                                        <div className="editor-cell">
                                            <FaUserCircle size={24} color="#64748b" />
                                            <div>
                                                <div className="editor-name">{editor.name}</div>
                                                <div className="editor-email">{editor.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className="count-badge blue">{editor.activeTasks}</span></td>
                                    <td><span className="count-badge green">{editor.completedTasks}</span></td>
                                    <td>
                                        <div className="rate-cell">
                                            <div className="rate-bar-bg">
                                                <div
                                                    className="rate-bar-fill"
                                                    style={{
                                                        width: `${onTimeRate}%`,
                                                        backgroundColor: onTimeRate > 80 ? '#10b981' : onTimeRate > 60 ? '#f59e0b' : '#ef4444'
                                                    }}
                                                />
                                            </div>
                                            <span>{onTimeRate}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="revision-cell">
                                            <FaChartLine size={14} color="#64748b" />
                                            <span>{editor.avgVersions}x / task</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="workload-dot" style={{ backgroundColor: workloadColor }} />
                                        {editor.activeTasks > 5 ? 'High' : editor.activeTasks > 3 ? 'Medium' : 'Low'}
                                    </td>
                                    <td>
                                        {editor.activeTasks === 0 ? (
                                            <span className="status-badge available">Available</span>
                                        ) : (
                                            <span className="status-badge busy">Busy</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EditorPerformanceView;
