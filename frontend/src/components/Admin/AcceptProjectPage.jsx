import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, usersAPI, workBreakdownAPI, API_BASE_URL } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { useDialog } from '../../context/DialogContext';
import confetti from 'canvas-confetti';
import './AdminDashboard.css';

const AcceptProjectPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { confirm, showAlert } = useDialog();
    const [project, setProject] = useState(null);
    const [editors, setEditors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [workMode, setWorkMode] = useState('default');
    const [totalAmount, setTotalAmount] = useState('');
    const [workBreakdown, setWorkBreakdown] = useState([]);

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [projectRes, editorsRes] = await Promise.all([
                projectsAPI.getById(projectId),
                usersAPI.getEditors(),
            ]);
            setProject(projectRes.data);
            setEditors(editorsRes.data);
            initializeAcceptModal(projectRes.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const initializeAcceptModal = (proj) => {
        setWorkMode('default');
        setTotalAmount(proj.amount?.toString() || '');

        const defaultWorkTypes = [
            { workType: 'Color Correction', percentage: 5 },
            { workType: 'Rough Cut', percentage: 20 },
            { workType: 'Essential Edit', percentage: 25 },
            { workType: 'Memes', percentage: 15 },
            { workType: 'Motion Graphics & CG/VFX', percentage: 20 },
            { workType: 'Music & SFX', percentage: 10 },
            { workType: 'Final Render', percentage: 5 },
        ];

        const initialBreakdown = defaultWorkTypes.map(work => ({
            workType: work.workType,
            assignedEditor: '',
            deadline: '',
            percentage: work.percentage,
            amount: 0,
            shareDetails: '',
            links: [],
        }));

        setWorkBreakdown(initialBreakdown);
    };

    const handleWorkBreakdownChange = (index, field, value) => {
        const updated = [...workBreakdown];
        updated[index][field] = value;

        if (field === 'percentage' || field === 'totalAmount') {
            const total = parseFloat(totalAmount) || 0;
            updated.forEach((work, i) => {
                if (i === index && field === 'percentage') {
                    work.amount = (total * parseFloat(value)) / 100;
                } else if (field === 'totalAmount') {
                    work.amount = (parseFloat(value) * parseFloat(work.percentage)) / 100;
                }
            });
        }

        setWorkBreakdown(updated);
    };

    const addCustomWorkType = () => {
        setWorkBreakdown([...workBreakdown, {
            workType: '',
            assignedEditor: '',
            deadline: '',
            percentage: 0,
            amount: 0,
            shareDetails: '',
            links: [],
        }]);
    };

    const removeWorkType = async (index) => {
        if (workBreakdown[index].workType === 'Final Render') {
            await showAlert('Final Render cannot be removed', 'Warning');
            return;
        }
        setWorkBreakdown(workBreakdown.filter((_, i) => i !== index));
    };

    const [isAccepting, setIsAccepting] = useState(false);

    const handleAcceptProject = async (e) => {
        e.preventDefault();
        try {
            const totalPercentage = workBreakdown.reduce((sum, w) => sum + parseFloat(w.percentage || 0), 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                await showAlert(`Total percentage must equal 100%. Current: ${totalPercentage.toFixed(2)}%`, 'Validation Error');
                return;
            }

            // Confirmation dialog
            const confirmed = await confirm({
                title: 'Accept Project',
                message: `Are you sure you want to accept this project?\n\n` +
                    `Project: ${project.title}\n` +
                    `Client: ${project.client?.name}\n` +
                    `Total Work Items: ${workBreakdown.length}\n` +
                    `Allocated Budget: ${project.currency} ${parseFloat(totalAmount).toLocaleString()}\n\n` +
                    `This will notify the client and all assigned editors.`,
                confirmText: 'Accept Project'
            });

            if (!confirmed) {
                return;
            }

            setIsAccepting(true);
            setError('');
            await projectsAPI.accept(projectId,
                workBreakdown.map(w => ({
                    ...w,
                    amount: parseFloat(w.amount),
                    percentage: parseFloat(w.percentage),
                    // Conversion: ensure deadline is transmitted as ISO string to prevent timezone offset issues
                    deadline: w.deadline ? new Date(w.deadline).toISOString() : w.deadline
                })),
                parseFloat(totalAmount)
            );

            // Celebration
            confetti({
                particleCount: 200,
                spread: 120,
                origin: { y: 0.6 },
                colors: ['#28a745', '#007bff', '#ffc107'],
                startVelocity: 45
            });

            await showAlert('Project accepted successfully!', 'Success');
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to accept project');
            showAlert(err.response?.data?.message || 'Failed to accept project', 'Error');
        } finally {
            setIsAccepting(false);
        }
    };

    if (loading) {
        return <div className="spinner"></div>;
    }

    if (!project) {
        return <div className="container"><div className="alert alert-error">Project not found</div></div>;
    }

    return (
        <div className="container" style={{ maxWidth: '1400px', padding: '20px' }}>
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0 }}>Accept Project - {project.title}</h1>
                    <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>
                        ← Back to Dashboard
                    </button>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleAcceptProject} className="card-body">
                    {/* Project Information */}
                    <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
                        <h2 style={{ marginTop: 0, marginBottom: '15px' }}>Project Information</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <p><strong>Title:</strong> {project.title}</p>
                                <p><strong>Client:</strong> {project.client?.name}</p>
                                <p><strong>Deadline:</strong> {formatDateTime(project.deadline)}</p>
                            </div>
                            <div>
                                <p><strong>Description:</strong> {project.description}</p>
                                <p><strong>Project Details:</strong> {project.projectDetails || 'N/A'}</p>
                            </div>
                        </div>

                        {project.rawFootageLinks && project.rawFootageLinks.length > 0 && (
                            <div style={{ marginTop: '15px' }}>
                                <strong>Raw Footage Links:</strong>
                                <ul style={{ marginTop: '5px' }}>
                                    {project.rawFootageLinks.map((link, idx) => {
                                        let url = link.url;
                                        if (!/^https?:\/\//i.test(url)) {
                                            url = 'https://' + url;
                                        }
                                        return (
                                            <li key={idx}>
                                                <a href={url} target="_blank" rel="noopener noreferrer">{link.title}</a>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}

                        {project.scriptFile && (
                            <p style={{ marginTop: '15px' }}>
                                <strong>Script:</strong> <a href={`${API_BASE_URL}${project.scriptFile}`} target="_blank" rel="noopener noreferrer">Download Script</a>
                            </p>
                        )}
                    </div>

                    {/* Work Mode Selection */}
                    <div className="form-group">
                        <label className="form-label">Work Type Mode</label>
                        <select
                            className="form-select"
                            value={workMode}
                            onChange={(e) => {
                                setWorkMode(e.target.value);
                                if (e.target.value === 'default') {
                                    initializeAcceptModal(project);
                                }
                            }}
                            style={{ maxWidth: '300px' }}
                        >
                            <option value="default">Default</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    {/* Client Amount */}
                    <div className="form-group">
                        <label className="form-label">Client Amount ({project.currency || 'INR'}) - To be collected</label>
                        <input
                            type="number"
                            className="form-input"
                            value={project.clientAmount || project.amount || ''}
                            disabled
                            style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed', maxWidth: '300px' }}
                        />
                    </div>

                    {/* Allocated Amount */}
                    <div className="form-group">
                        <label className="form-label">Allocated Amount - Budget for Editors ({project.currency || 'INR'})</label>
                        <input
                            type="number"
                            className="form-input"
                            value={totalAmount}
                            onChange={(e) => {
                                setTotalAmount(e.target.value);
                                const total = parseFloat(e.target.value) || 0;
                                setWorkBreakdown(workBreakdown.map(work => ({
                                    ...work,
                                    amount: (total * parseFloat(work.percentage)) / 100,
                                })));
                            }}
                            required
                            min="0"
                            step="0.01"
                            style={{ maxWidth: '300px' }}
                        />
                    </div>

                    {/* Work Breakdown */}
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <label className="form-label" style={{ margin: 0 }}>Work Breakdown</label>
                            {workMode === 'custom' && (
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={addCustomWorkType}
                                >
                                    Add Work Type
                                </button>
                            )}
                        </div>

                        <div className="table-responsive">
                            <table className="table" style={{ fontSize: '14px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ minWidth: '130px' }}>Work Type</th>
                                        <th style={{ minWidth: '120px' }}>Assigned Editor</th>
                                        <th style={{ minWidth: '140px' }}>Deadline</th>
                                        <th style={{ width: '80px' }}>Percentage</th>
                                        <th style={{ width: '100px' }}>Amount</th>
                                        <th style={{ minWidth: '180px' }}>Share Details (Optional)</th>
                                        <th style={{ minWidth: '200px' }}>Links (Optional)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workBreakdown.map((work, index) => (
                                        <tr key={index}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
                                                    <div style={{ flex: 1 }}>
                                                        {workMode === 'default' ? (
                                                            <span>{work.workType}</span>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                value={work.workType}
                                                                onChange={(e) => handleWorkBreakdownChange(index, 'workType', e.target.value)}
                                                                required
                                                                disabled={work.workType === 'Final Render'}
                                                                style={{ width: '100%', fontSize: '12px' }}
                                                            />
                                                        )}
                                                    </div>
                                                    {workMode === 'custom' && work.workType !== 'Final Render' && (
                                                        <button
                                                            type="button"
                                                            title="Remove this work type"
                                                            onClick={() => removeWorkType(index)}
                                                            style={{
                                                                background: '#dc3545',
                                                                border: 'none',
                                                                color: 'white',
                                                                cursor: 'pointer',
                                                                padding: '5px 10px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                fontWeight: '500',
                                                                transition: 'all 0.2s ease',
                                                                flexShrink: 0,
                                                                minWidth: 'fit-content',
                                                                opacity: 0.9
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.target.style.background = '#c82333';
                                                                e.target.style.opacity = '1';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.target.style.background = '#dc3545';
                                                                e.target.style.opacity = '0.9';
                                                            }}
                                                        >
                                                            ✕ Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <select
                                                    className="form-select"
                                                    value={work.assignedEditor}
                                                    onChange={(e) => handleWorkBreakdownChange(index, 'assignedEditor', e.target.value)}
                                                    required
                                                    style={{ fontSize: '12px', width: '100%' }}
                                                >
                                                    <option value="">Select Editor</option>
                                                    {editors.map((editor) => (
                                                        <option key={editor._id} value={editor._id}>
                                                            {editor.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="datetime-local"
                                                    className="form-input"
                                                    value={work.deadline}
                                                    onChange={(e) => handleWorkBreakdownChange(index, 'deadline', e.target.value)}
                                                    required
                                                    style={{ fontSize: '12px', width: '100%' }}
                                                />
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={work.percentage}
                                                        onChange={(e) => {
                                                            const newPercentage = parseFloat(e.target.value) || 0;
                                                            handleWorkBreakdownChange(index, 'percentage', newPercentage);
                                                            const total = parseFloat(totalAmount) || 0;
                                                            handleWorkBreakdownChange(index, 'amount', (total * newPercentage) / 100);
                                                        }}
                                                        required
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        style={{ width: '70px', fontSize: '12px' }}
                                                    />
                                                    <span>%</span>
                                                </div>
                                            </td>
                                            <td>
                                                {project.currency || 'INR'} {work.amount.toFixed(2)}
                                            </td>
                                            <td>
                                                <textarea
                                                    className="form-textarea"
                                                    value={work.shareDetails || ''}
                                                    onChange={(e) => handleWorkBreakdownChange(index, 'shareDetails', e.target.value)}
                                                    placeholder="Optional details for editor..."
                                                    style={{ fontSize: '12px', minHeight: '60px', width: '100%' }}
                                                />
                                            </td>
                                            <td>
                                                <div style={{ width: '100%' }}>
                                                    {(work.links || []).map((link, linkIndex) => (
                                                        <div key={linkIndex} style={{ display: 'flex', gap: '4px', marginBottom: '4px', alignItems: 'center' }}>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                placeholder="Title"
                                                                value={link.title}
                                                                onChange={(e) => {
                                                                    const newLinks = [...(work.links || [])];
                                                                    newLinks[linkIndex].title = e.target.value;
                                                                    handleWorkBreakdownChange(index, 'links', newLinks);
                                                                }}
                                                                style={{ fontSize: '11px', flex: 1 }}
                                                            />
                                                            <input
                                                                type="url"
                                                                className="form-input"
                                                                placeholder="URL"
                                                                value={link.url}
                                                                onChange={(e) => {
                                                                    const newLinks = [...(work.links || [])];
                                                                    newLinks[linkIndex].url = e.target.value;
                                                                    handleWorkBreakdownChange(index, 'links', newLinks);
                                                                }}
                                                                style={{ fontSize: '11px', flex: 2 }}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => {
                                                                    const newLinks = (work.links || []).filter((_, i) => i !== linkIndex);
                                                                    handleWorkBreakdownChange(index, 'links', newLinks);
                                                                }}
                                                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => {
                                                            const newLinks = [...(work.links || []), { title: '', url: '' }];
                                                            handleWorkBreakdownChange(index, 'links', newLinks);
                                                        }}
                                                        style={{ fontSize: '11px', marginTop: '4px' }}
                                                    >
                                                        + Add Link
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginTop: '15px', textAlign: 'right', fontSize: '16px' }}>
                            <strong>Total Percentage: {
                                workBreakdown.reduce((sum, w) => sum + parseFloat(w.percentage || 0), 0).toFixed(2)
                            }%</strong>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #ddd' }}>
                        <button type="button" className="btn btn-secondary" disabled={isAccepting} onClick={() => navigate('/admin/dashboard')}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-success" disabled={isAccepting} style={{ minWidth: '150px' }}>
                            {isAccepting ? 'Accepting...' : 'Accept Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AcceptProjectPage;
