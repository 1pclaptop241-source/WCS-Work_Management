import { useState, useEffect } from 'react';
import api from '../../services/api'; // Use default api instance with interceptors
import { formatDateTime } from '../../utils/formatDate';
import './ActivityLogPage.css';

const ActivityLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const fetchLogs = async (pageNum) => {
        try {
            setLoading(true);
            const response = await api.get(`/activity-logs?page=${pageNum}&limit=20`);
            setLogs(response.data.logs);
            setTotalPages(response.data.pages);
        } catch (err) {
            setError('Failed to load activity logs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getActionBadge = (action) => {
        if (action.includes('CREATE')) return 'badge-success';
        if (action.includes('DELETE')) return 'badge-danger';
        if (action.includes('LOGIN')) return 'badge-primary';
        if (action.includes('PAYMENT')) return 'badge-warning';
        if (action.includes('ASSIGN')) return 'badge-info';
        if (action.includes('ACCEPT')) return 'badge-success';
        if (action.includes('APPROVE')) return 'badge-success';
        if (action.includes('CLOSE')) return 'badge-secondary';
        return 'badge-secondary';
    };

    return (
        <div className="container activity-log-page">
            <h1 className="page-title">System Activity Logs</h1>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="card">
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Action</th>
                                <th>Description</th>
                                <th>Time</th>
                                <th className="hide-mobile">IP Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center">Loading...</td></tr>
                            ) : logs.length === 0 ? (
                                <tr><td colSpan="5" className="text-center">No activity recorded yet.</td></tr>
                            ) : (
                                logs.map(log => (
                                    <tr key={log._id}>
                                        <td>
                                            <div style={{ fontWeight: 'bold' }}>{log.user?.name || 'Unknown'}</div>
                                            <div style={{ fontSize: '11px', color: '#666' }}>{log.user?.role}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${getActionBadge(log.action)}`}>
                                                {log.action.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>{log.description}</td>
                                        <td>{formatDateTime(log.createdAt)}</td>
                                        <td className="hide-mobile" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                            {log.ipAddress}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="pagination">
                    <button
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="btn btn-secondary btn-sm"
                    >
                        Previous
                    </button>
                    <span style={{ margin: '0 10px' }}>
                        Page {page} of {totalPages}
                    </span>
                    <button
                        disabled={page === totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="btn btn-secondary btn-sm"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogPage;
