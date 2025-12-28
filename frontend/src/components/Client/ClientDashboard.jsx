import { useState, useEffect } from 'react';
import { projectsAPI, worksAPI, resetAPI } from '../../services/api';
import { useDialog } from '../../context/DialogContext';
import { formatDateTime } from '../../utils/formatDate';
import OngoingProjects from './OngoingProjects';
import WorkView from './WorkView';
import ProjectDetails from './ProjectDetails';
import confetti from 'canvas-confetti';
import CountUp from 'react-countup';
import './ClientDashboard.css';

const ClientDashboard = () => {
  const { showAlert } = useDialog();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('projects-ongoing'); // 'projects-ongoing', 'projects-created', 'work'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletionReports, setDeletionReports] = useState([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    projectDetails: '',
    currency: 'INR',
    amount: '',
    rawFootageLinks: [],
    scriptFile: null
  });
  const [editingProject, setEditingProject] = useState(null);


  // ...

  const handleEditProject = (project) => {
    setEditingProject(project);

    // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
    let deadlineStr = '';
    if (project.deadline) {
      const date = new Date(project.deadline);
      const tzoffset = date.getTimezoneOffset() * 60000;
      deadlineStr = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    }

    setFormData({
      title: project.title,
      description: project.description,
      deadline: deadlineStr,
      projectDetails: project.projectDetails || '',
      currency: project.currency || 'INR',
      amount: project.clientAmount || project.amount || '',
      rawFootageLinks: project.rawFootageLinks || [],
      scriptFile: null // File input can't be pre-filled securely, leaving empty implies no change unless new file selected
    });
    setLinkTitle('');
    setLinkUrl('');
    setShowCreateModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingProject(null);
    setFormData({
      title: '',
      description: '',
      deadline: '',
      projectDetails: '',
      currency: 'INR',
      amount: '',
      rawFootageLinks: [],
      scriptFile: null
    });
    setLinkTitle('');
    setLinkUrl('');
  };

  // ... in Render ...
  // Updates for OngoingProjects calls:
  // onEdit={handleEditProject}

  // Updates for Modal:
  // Title: {editingProject ? "Edit Project" : "Create New Project"}
  // Submit Handler:
  /*
                   if (editingProject) {
                        await projectsAPI.update(editingProject._id, submitData); // Need to check if update supports FormData? 
                        // actually updateProject in backend supports req.body, but creates req.file.
                        // api.js update method might need check. existing update uses json.
                        // checking api.js...
                    } else {
                        await projectsAPI.createWithFile(submitData);
                    }
  */

  // Wait, I need to check `api.js` to see if `update` supports `FormData` or if I need `updateWithFile`.
  // Usually `update` takes JSON. If script file is updated, I might need a specific endpoint or change `update` to multipart.
  // The backend `updateProject` uses `req.body`. `multer` (upload.single) is likely not attached to `updateProject` route?
  // I should check `backend/routes/projects.js`.

  useEffect(() => {
    loadProjects();
    loadDeletionReports();
  }, []);

  const loadProjects = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const response = await projectsAPI.getAll();
      const sortedProjects = response.data.sort((a, b) => {
        // 1. Closed projects always last
        if (a.closed && !b.closed) return 1;
        if (!a.closed && b.closed) return -1;

        // 2. Awaiting Approval (submitted/under_review) first
        const isAwaitingAction = (p) => p.status === 'submitted' || p.status === 'under_review';
        const aWaiting = isAwaitingAction(a);
        const bWaiting = isAwaitingAction(b);

        if (aWaiting && !bWaiting) return -1;
        if (!aWaiting && bWaiting) return 1;

        // 3. Fallback to createdAt (newest first)
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setProjects(sortedProjects);
      if (selectedProject) {
        const updated = sortedProjects.find(p => p._id === selectedProject._id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const loadDeletionReports = async () => {
    try {
      const response = await resetAPI.getReports();
      setDeletionReports(response.data);
    } catch (err) {
      console.error('Failed to load deletion reports:', err);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      const response = await resetAPI.downloadReport(reportId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deletion-report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await showAlert('Failed to download report', 'Error');
    }
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="container">
      {activeView !== 'work' && (
        <div className="dashboard-header">
          <h1>Client Dashboard</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="project-count">
              <CountUp
                end={projects.filter(p => p.accepted && !p.closed).length}
                duration={1.5}
              />{' '}
              Ongoing Project{projects.filter(p => p.accepted && !p.closed).length !== 1 ? 's' : ''}
            </div>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontWeight: '600',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              <span>+</span> Create Project
            </button>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* Deletion Reports Section */}
      {deletionReports.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', backgroundColor: '#fff3cd', border: '1px solid #ffc107', position: 'relative' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="card-title" style={{ color: '#856404', margin: 0 }}>
              ⚠️ Data Deletion Notifications
            </h2>
            <button
              className="modal-close"
              onClick={() => {
                setDeletionReports([]);
                // In a real app, we might mark these as read in DB, but for now UI clearing is requested
              }}
              style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#856404' }}
            >
              ×
            </button>
          </div>
          <div className="card-body">
            {deletionReports.map((report) => (
              <div key={report._id} style={{ marginBottom: '15px', padding: '15px', backgroundColor: 'white', borderRadius: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <strong>Data Deletion Report</strong>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      Deleted on: {formatDateTime(report.deletedAt)}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      Projects deleted: {report.deletedProjects.length} | Payments deleted: {report.deletedPayments.length}
                    </p>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleDownloadReport(report.reportId)}
                  >
                    Download PDF Report
                  </button>
                </div>
                <p style={{ fontSize: '13px', color: '#856404', fontStyle: 'italic' }}>
                  The administrator has deleted projects and payments. Please download the PDF report for details.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView !== 'work' && (
        <div className="tabs">
          <button
            className={`tab ${activeView === 'projects-ongoing' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('projects-ongoing');
              setSelectedProject(null);
            }}
          >
            Ongoing Projects
          </button>
          <button
            className={`tab ${activeView === 'projects-created' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('projects-created');
              setSelectedProject(null);
            }}
          >
            Created Projects
          </button>
        </div>
      )}

      <div className="client-content">
        {activeView === 'projects-ongoing' && (
          <OngoingProjects
            projects={projects.filter(p => p.accepted)}
            onProjectSelect={(project) => {
              setSelectedProject(project);
              setActiveView('work');
            }}
            onEdit={handleEditProject}
          />
        )}

        {activeView === 'projects-created' && (
          <OngoingProjects
            projects={projects.filter(p => !p.accepted)}
            onProjectSelect={(project) => {
              setSelectedProject(project);
              setActiveView('work');
            }}
            onEdit={handleEditProject}
          />
        )}

        {activeView === 'work' && selectedProject && (
          <WorkView
            project={selectedProject}
            onBack={() => {
              setActiveView('projects-ongoing');
              setSelectedProject(null);
            }}
            onUpdate={() => loadProjects(true)}
          />
        )}
      </div>
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h2>{editingProject ? 'Edit Project' : 'Create New Project'}</h2>
                  <button className="modal-close" onClick={handleModalClose} style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                </div>

                {/* Visual Roadmap */}
                {!editingProject && (
                  <div className="project-roadmap">
                    <div className="roadmap-line">
                      <div className="roadmap-line-fill" style={{ width: '0%' }}></div>
                    </div>
                    <div className="roadmap-step active">
                      <div className="step-circle">1</div>
                      <span className="step-label">Submit</span>
                    </div>
                    <div className="roadmap-step">
                      <div className="step-circle">2</div>
                      <span className="step-label">Review</span>
                    </div>
                    <div className="roadmap-step">
                      <div className="step-circle">3</div>
                      <span className="step-label">Assign</span>
                    </div>
                    <div className="roadmap-step">
                      <div className="step-circle">4</div>
                      <span className="step-label">Start</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <form
              className="modal-body"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const submitData = new FormData();
                  submitData.append('title', formData.title);
                  submitData.append('description', formData.description);
                  submitData.append('deadline', new Date(formData.deadline).toISOString());
                  submitData.append('projectDetails', formData.projectDetails || '');
                  submitData.append('currency', formData.currency);
                  submitData.append('amount', formData.amount);
                  submitData.append('rawFootageLinks', JSON.stringify(formData.rawFootageLinks));
                  if (formData.scriptFile) {
                    submitData.append('scriptFile', formData.scriptFile);
                  }

                  if (editingProject) {
                    await projectsAPI.updateWithFile(editingProject._id, submitData);
                    await showAlert('Project updated successfully', 'Success');
                  } else {
                    await projectsAPI.createWithFile(submitData);
                    // Success Celebration
                    confetti({
                      particleCount: 150,
                      spread: 70,
                      origin: { y: 0.6 },
                      colors: ['#06A77D', '#FFD700', '#007BFF']
                    });
                    await showAlert('Project created successfully! Waiting for admin approval.', 'Success');
                  }

                  handleModalClose();
                  await loadProjects();
                } catch (err) {
                  setError(err.response?.data?.message || 'Failed to save project');
                }
              }}
            >
              <div className="form-group">
                <label className="form-label">Project Title</label>
                <input className="form-input" placeholder="e.g. Summer Vacation Vlog #1" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Project Description</label>
                <textarea className="form-textarea" placeholder="Describe your vision, style, and any specific requirements..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Project Assets & Links</label>
                <span className="form-helper">Add links to Google Drive, Dropbox, or WeTransfer folders containing your footage.</span>
                <div style={{ marginBottom: '10px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Link Title"
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <input
                      type="url"
                      className="form-input"
                      placeholder="Link URL"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        if (linkTitle && linkUrl) {
                          setFormData({
                            ...formData,
                            rawFootageLinks: [...formData.rawFootageLinks, { title: linkTitle, url: linkUrl }]
                          });
                          setLinkTitle('');
                          setLinkUrl('');
                        }
                      }}
                    >
                      Add Link
                    </button>
                  </div>
                  {formData.rawFootageLinks.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      {formData.rawFootageLinks.map((link, index) => (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                          <span style={{ flex: 1, fontWeight: 'bold' }}>{link.title}:</span>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ flex: 2, color: '#2E86AB' }}>{link.url}</a>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                rawFootageLinks: formData.rawFootageLinks.filter((_, i) => i !== index)
                              });
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Budget / Estimate</label>
                <span className="form-helper">Specify your expected budget for this project.</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Amount"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                    style={{ flex: 2 }}
                    disabled={editingProject && editingProject.accepted}
                  />
                  <select
                    className="form-select"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    style={{ flex: 1 }}
                    disabled={editingProject && editingProject.accepted}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Desired Deadline</label>
                <input type="datetime-local" className="form-input" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Script or Guideline (Optional)</label>
                <span className="form-helper">Upload any PDF or Word document that outlines the flow.</span>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,.doc,.docx"
                  style={{ marginTop: '8px' }}
                  onChange={(e) => setFormData({ ...formData, scriptFile: e.target.files[0] })}
                />
                {formData.scriptFile && (
                  <p style={{ marginTop: '5px', fontSize: '14px', color: '#666' }}>
                    Selected: {formData.scriptFile.name}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Additional Instructions (Optional)</label>
                <textarea className="form-textarea" placeholder="Any final notes for the editor..." value={formData.projectDetails} onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleModalClose}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingProject ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientDashboard;

