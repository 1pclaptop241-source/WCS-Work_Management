import { useState, useEffect } from 'react';
import { projectsAPI, usersAPI, resetAPI, workBreakdownAPI } from '../../services/api';
import { worksAPI, API_BASE_URL } from '../../services/api';
import ProgressRoadmap from '../common/ProgressRoadmap';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../context/DialogContext';
import ProjectCard from './ProjectCard';
import DashboardStats from './DashboardStats';
import ProjectPipeline from './ProjectPipeline';
import EditorPerformanceView from './EditorPerformanceView';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { confirm, showAlert } = useDialog();
  const [unacceptedProjects, setUnacceptedProjects] = useState([]);
  const [acceptedProjects, setAcceptedProjects] = useState([]);
  const [editors, setEditors] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('accepted'); // 'pipeline', 'accepted', 'unaccepted', 'performance'
  const [showStats, setShowStats] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showAcceptConfirmModal, setShowAcceptConfirmModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectWorks, setProjectWorks] = useState([]);
  const [workMode, setWorkMode] = useState('default'); // 'default' or 'custom'
  const [totalAmount, setTotalAmount] = useState('');
  const [workBreakdown, setWorkBreakdown] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client: '',
    assignedEditor: '',
    deadline: '',
    projectDetails: '',
    baseAmount: '',
  });
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [unacceptedRes, acceptedRes, editorsRes, clientsRes] = await Promise.all([
        projectsAPI.getUnaccepted(),
        projectsAPI.getAccepted(),
        usersAPI.getEditors(),
        usersAPI.getClients(),
      ]);
      setUnacceptedProjects(unacceptedRes.data);
      setAcceptedProjects(acceptedRes.data);
      setEditors(editorsRes.data);
      setClients(clientsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isAssigningEditor, setIsAssigningEditor] = useState(false);
  const [isSharingDetails, setIsSharingDetails] = useState(false);
  const [isAcceptingProject, setIsAcceptingProject] = useState(false);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setIsCreatingUser(true);
      setError('');
      await usersAPI.create(userForm);
      setShowCreateUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'editor' });
      await loadData();
      await showAlert('User created successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
      showAlert(err.response?.data?.message || 'Failed to create user', 'Error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      setIsCreatingProject(true);
      setError('');
      await projectsAPI.create(formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        client: '',
        assignedEditor: '',
        deadline: '',
        projectDetails: '',
        baseAmount: '',
      });
      await loadData();
      await showAlert('Project created successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
      showAlert(err.response?.data?.message || 'Failed to create project', 'Error');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleAssignEditor = async (e) => {
    e.preventDefault();
    try {
      setIsAssigningEditor(true);
      setError('');
      await projectsAPI.assignEditor(
        selectedProject._id,
        formData.assignedEditor,
        formData.baseAmount
      );
      setShowAssignModal(false);
      setSelectedProject(null);
      setFormData({ assignedEditor: '', baseAmount: '' });
      await loadData();
      await showAlert('Editor assigned successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign editor');
      showAlert(err.response?.data?.message || 'Failed to assign editor', 'Error');
    } finally {
      setIsAssigningEditor(false);
    }
  };

  const handleShareDetails = async (e) => {
    e.preventDefault();
    try {
      setIsSharingDetails(true);
      setError('');
      await projectsAPI.shareDetails(selectedProject._id, formData.projectDetails);
      setShowDetailsModal(false);
      setSelectedProject(null);
      setFormData({ projectDetails: '' });
      await loadData();
      await showAlert('Details shared successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share details');
      showAlert(err.response?.data?.message || 'Failed to share details', 'Error');
    } finally {
      setIsSharingDetails(false);
    }
  };

  const openProgressModal = async (project) => {
    setSelectedProject(project);
    setShowProgressModal(true);
    setProjectWorks([]); // Reset works while loading
    try {
      const res = await worksAPI.getByProject(project._id);
      setProjectWorks(res.data);
    } catch (e) {
      // Non-blocking
    }
  };

  const confirmAcceptProject = async () => {
    try {
      setIsAcceptingProject(true);
      setError('');
      // Recalculate amounts based on total
      const total = parseFloat(totalAmount);
      const updatedBreakdown = workBreakdown.map(work => ({
        ...work,
        amount: (total * parseFloat(work.percentage)) / 100,
      }));

      await projectsAPI.accept(selectedProject._id, updatedBreakdown, totalAmount);
      setShowAcceptConfirmModal(false);
      setShowAcceptModal(false);
      setSelectedProject(null);
      await loadData();
      await showAlert('Project accepted successfully!', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept project');
      showAlert(err.response?.data?.message || 'Failed to accept project', 'Error');
    } finally {
      setIsAcceptingProject(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      setError('');
      await projectsAPI.delete(projectId);
      await loadData();
      await showAlert('Project deleted successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
      showAlert(err.response?.data?.message || 'Failed to delete project', 'Error');
    }
  };


  const initializeAcceptModal = (project) => {
    setWorkMode('default');
    setTotalAmount(project.amount?.toString() || '');

    // Initialize default work breakdown
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

    // Recalculate amount if percentage or total amount changes
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

  const removeWorkType = (index) => {
    if (workBreakdown[index].workType === 'Final Render') {
      showAlert('Final Render cannot be removed', 'Warning');
      return;
    }
    setWorkBreakdown(workBreakdown.filter((_, i) => i !== index));
  };

  const handleAcceptProject = async (e) => {
    e.preventDefault();
    try {
      // Validate work breakdown
      const hasFinalRender = workBreakdown.some(w => w.workType === 'Final Render');
      if (!hasFinalRender) {
        await showAlert('Final Render work type is required', 'Validation Error');
        return;
      }

      const totalPercentage = workBreakdown.reduce((sum, w) => sum + parseFloat(w.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        await showAlert(`Total percentage must equal 100%. Current: ${totalPercentage}%`, 'Validation Error');
        return;
      }

      // Show confirmation modal instead of directly accepting
      setShowAcceptConfirmModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept project');
    }
  };


  const getStatusBadge = (status) => {
    const statusMap = {
      assigned: 'badge-primary',
      in_progress: 'badge-primary',
      submitted: 'badge-success',
      under_review: 'badge-warning',
      completed: 'badge-success',
    };
    return statusMap[status] || 'badge-secondary';
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="container">
      <div className="dashboard-header" style={{ marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Admin Dashboard</h1>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowStats(!showStats)}
            style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}
          >
            {showStats ? 'Hide Stats' : 'Show Stats'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
            + Project
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/activity-logs')} style={{ backgroundColor: '#6610f2', color: 'white' }}>
            Activity Logs
          </button>
          <button
            className="btn btn-danger"
            onClick={() => setShowResetConfirmModal(true)}
            style={{ backgroundColor: '#dc3545', color: 'white' }}
          >
            Reset All Data
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Analytics Stats */}
      {showStats && (
        <DashboardStats
          projects={acceptedProjects}
          clients={clients}
          editors={editors}
        />
      )}

      {/* Tabs & Search Unified */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: '1px solid #eee',
        paddingBottom: '2px'
      }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          <button
            className={`tab ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Pipeline
          </button>
          <button
            className={`tab ${activeTab === 'accepted' ? 'active' : ''}`}
            onClick={() => setActiveTab('accepted')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Accepted
          </button>
          <button
            className={`tab ${activeTab === 'unaccepted' ? 'active' : ''}`}
            onClick={() => setActiveTab('unaccepted')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Unaccepted
          </button>
          <button
            className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Insights
          </button>
        </div>

        <div className="search-bar" style={{ marginBottom: 0 }}>
          <input
            type="text"
            placeholder="Search..."
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '200px',
              padding: '6px 12px',
              fontSize: '13px',
              height: '32px'
            }}
          />
        </div>
      </div>

      {/* Pipeline View Tab */}
      {activeTab === 'pipeline' && (
        <ProjectPipeline projects={[...unacceptedProjects, ...acceptedProjects]} />
      )}

      {/* Unaccepted Projects Tab */}
      {activeTab === 'unaccepted' && (
        <div className="card">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Deadline</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {unacceptedProjects.filter(p =>
                  !searchTerm ||
                  p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      No unaccepted projects found
                    </td>
                  </tr>
                ) : (
                  unacceptedProjects.filter(p =>
                    !searchTerm ||
                    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((project) => (
                    <tr key={project._id}>
                      <td>{project.title}</td>
                      <td>{project.client?.name || 'N/A'}</td>
                      <td>{project.amount ? `${project.currency} ${project.amount.toLocaleString()}` : 'N/A'}</td>
                      <td>{formatDate(project.deadline)}</td>
                      <td>{formatDate(project.createdAt)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => navigate(`/admin/accept-project/${project._id}`)}
                          >
                            Accept Project
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'accepted' && (
        <div className="accepted-projects-view">
          {(() => {
            const filtered = acceptedProjects.filter(p =>
              !searchTerm ||
              p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            const activeOnes = filtered.filter(p => !p.closed).sort((a, b) => {
              const isAwaitingAction = (p) => p.status === 'submitted' || p.status === 'under_review';
              const aWaiting = isAwaitingAction(a);
              const bWaiting = isAwaitingAction(b);
              if (aWaiting !== bWaiting) return aWaiting ? -1 : 1;
              return new Date(b.createdAt) - new Date(a.createdAt);
            });

            const closedOnes = filtered.filter(p => p.closed).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            if (filtered.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  No accepted projects found
                </div>
              );
            }

            return (
              <>
                {activeOnes.length > 0 && (
                  <div className="project-section" style={{
                    marginBottom: '40px',
                    background: '#f8fafc',
                    padding: '25px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      padding: '10px',
                      margin: '0 0 10px 0',
                      fontSize: '1.1rem',
                      color: '#2E86AB',
                      borderBottom: '2px solid #e3f2fd',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      🚀 Active Projects
                      <span style={{
                        backgroundColor: '#e3f2fd',
                        color: '#2E86AB',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>{activeOnes.length}</span>
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '15px',
                      padding: '5px'
                    }}>
                      {activeOnes.map((project) => (
                        <ProjectCard
                          key={project._id}
                          project={project}
                          onViewDetails={(proj) => navigate(`/admin/project/${proj._id}`)}
                          onDelete={handleDeleteProject}
                          onUpdate={loadData}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {closedOnes.length > 0 && (
                  <div className="project-section" style={{
                    marginTop: '20px',
                    background: '#f1f5f9',
                    padding: '25px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <h3 style={{
                      padding: '10px',
                      margin: '0 0 10px 0',
                      fontSize: '1.1rem',
                      color: '#64748b',
                      borderBottom: '2px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      ✅ Closed Projects
                      <span style={{
                        backgroundColor: '#f1f5f9',
                        color: '#64748b',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.8rem'
                      }}>{closedOnes.length}</span>
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                      gap: '15px',
                      padding: '5px',
                      opacity: 0.8
                    }}>
                      {closedOnes.map((project) => (
                        <ProjectCard
                          key={project._id}
                          project={project}
                          onViewDetails={(proj) => navigate(`/admin/project/${proj._id}`)}
                          onDelete={handleDeleteProject}
                          onUpdate={loadData}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Performance/Insights Tab */}
      {activeTab === 'performance' && (
        <EditorPerformanceView />
      )}


      {/* Create Project Modal */}
      {
        showCreateModal && (
          <div className="modal-overlay">
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Project</h2>
                <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateProject} className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select
                    className="form-select"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client._id} value={client._id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Deadline</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Client Amount ({selectedProject?.currency || 'INR'})</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.clientAmount || ''}
                    onChange={(e) => setFormData({ ...formData, clientAmount: e.target.value })}
                    placeholder="Amount to collect from client"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Project Details (Optional)</label>
                  <textarea
                    className="form-textarea"
                    value={formData.projectDetails}
                    onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })}
                    placeholder="Project details to share with editor"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" disabled={isCreatingProject} onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isCreatingProject}>
                    {isCreatingProject ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Assign Editor Modal */}
      {
        showAssignModal && selectedProject && (
          <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Assign Editor to {selectedProject.title}</h2>
                <button className="modal-close" onClick={() => setShowAssignModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleAssignEditor} className="modal-body">
                <div className="form-group">
                  <label className="form-label">Editor</label>
                  <select
                    className="form-select"
                    value={formData.assignedEditor}
                    onChange={(e) => setFormData({ ...formData, assignedEditor: e.target.value })}
                    required
                  >
                    <option value="">Select Editor</option>
                    {editors.map((editor) => (
                      <option key={editor._id} value={editor._id}>
                        {editor.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Base Amount ($)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.baseAmount}
                    onChange={(e) => setFormData({ ...formData, baseAmount: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" disabled={isAssigningEditor} onClick={() => setShowAssignModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={isAssigningEditor}>
                    {isAssigningEditor ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Share Details Modal */}
      {
        showDetailsModal && selectedProject && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Share Project Details - {selectedProject.title}</h2>
                <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleShareDetails} className="modal-body">
                <div className="form-group">
                  <label className="form-label">Project Details</label>
                  <textarea
                    className="form-textarea"
                    value={formData.projectDetails}
                    onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })}
                    rows="8"
                    placeholder="Enter project details to share with the editor..."
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" disabled={isSharingDetails} onClick={() => setShowDetailsModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSharingDetails}>
                    {isSharingDetails ? 'Sharing...' : 'Share Details'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Create User Modal */}
      {
        showCreateUserModal && (
          <div className="modal-overlay" onClick={() => setShowCreateUserModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create User</h2>
                <button className="modal-close" onClick={() => setShowCreateUserModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    minLength={6}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    required
                  >
                    <option value="editor">Editor</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" disabled={isCreatingUser} onClick={() => setShowCreateUserModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isCreatingUser}>
                    {isCreatingUser ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Progress Modal */}
      {
        showProgressModal && selectedProject && (
          <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Project Progress - {selectedProject.title}</h2>
                <button className="modal-close" onClick={() => setShowProgressModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '16px' }}>
                  <ProgressRoadmap projectId={selectedProject._id} canEdit={false} />
                </div>
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Submissions & Corrections</h3>
                  </div>
                  <div className="card-body">
                    {projectWorks.length === 0 ? (
                      <p>No submissions yet.</p>
                    ) : (
                      <ul>
                        {projectWorks.map((w) => (
                          <li key={w._id} style={{ marginBottom: '8px' }}>
                            <strong>{w.fileName}</strong> — {formatDateTime(w.submittedAt)} —
                            <span className={`badge ${w.status === 'approved' ? 'badge-success' : w.status === 'needs_revision' ? 'badge-warning' : 'badge-primary'}`} style={{ marginLeft: 6 }}>
                              {w.status.replace('_', ' ')}
                            </span>
                            {w.clientFeedback && (
                              <div style={{ marginTop: '6px' }}>
                                <em>Feedback:</em> {w.clientFeedback}
                              </div>
                            )}
                            {w.corrections && w.corrections.length > 0 && (
                              <div style={{ marginTop: '6px' }}>
                                <em>Corrections:</em>
                                <ul>
                                  {w.corrections.map((c, i) => (
                                    <li key={i}>{c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div style={{ marginTop: '6px', display: 'flex', gap: 8 }}>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={async () => {
                                  const text = prompt('Enter feedback (optional). Use new lines for multiple corrections.');
                                  if (text === null) return;
                                  const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
                                  try {
                                    await worksAPI.addCorrections(w._id, lines, text);
                                    const res = await worksAPI.getByProject(selectedProject._id);
                                    setProjectWorks(res.data);
                                  } catch (e) {
                                    await showAlert(e.response?.data?.message || 'Failed to send corrections', 'Error');
                                  }
                                }}
                              >
                                Send Corrections
                              </button>
                              {!w.adminApproved && (
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={async () => {
                                    const isConfirmed = await confirm({
                                      title: 'Approve Work',
                                      message: 'Are you sure you want to approve this work?',
                                      confirmText: 'Approve'
                                    });

                                    if (isConfirmed) {
                                      try {
                                        await worksAPI.adminApprove(w._id);
                                        const res = await worksAPI.getByProject(selectedProject._id);
                                        setProjectWorks(res.data);
                                      } catch (e) {
                                        await showAlert(e.response?.data?.message || 'Failed to approve work', 'Error');
                                      }
                                    }
                                  }}
                                >
                                  Approve Work
                                </button>
                              )}
                              <div style={{ fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span className={w.adminApproved ? "text-success" : "text-muted"}>Admin: {w.adminApproved ? '✓' : 'Pending'}</span>
                                <span className={w.clientApproved ? "text-success" : "text-muted"}>Client: {w.clientApproved ? '✓' : 'Pending'}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
                  <button
                    className="btn btn-success"
                    onClick={async () => {
                      try {
                        await projectsAPI.approve(selectedProject._id);
                        await loadData();
                        const res = await worksAPI.getByProject(selectedProject._id);
                        setProjectWorks(res.data);
                      } catch (e) {
                        await showAlert(e.response?.data?.message || 'Failed to approve', 'Error');
                      }
                    }}
                  >
                    Approve (Admin)
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      try {
                        await projectsAPI.publish(selectedProject._id);
                        await loadData();
                        setShowProgressModal(false);
                      } catch (e) {
                        await showAlert(e.response?.data?.message || 'Failed to publish', 'Error');
                      }
                    }}
                  >
                    Mark as Published
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowProgressModal(false)}>Close</button>
                <button
                  className="btn btn-success"
                  onClick={async () => {
                    try {
                      await projectsAPI.approve(selectedProject._id);
                      await loadData();
                    } catch (e) {
                      await showAlert(e.response?.data?.message || 'Failed to approve', 'Error');
                    }
                  }}
                >
                  Approve (Admin)
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Accept Project Modal */}
      {
        showAcceptModal && selectedProject && (
          <div className="modal-overlay">
            <div className="modal modal-large" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div className="modal-header">
                <h2>Accept Project - {selectedProject.title}</h2>
                <button className="modal-close" onClick={() => setShowAcceptModal(false)}>
                  ×
                </button>
              </div>
              <form onSubmit={handleAcceptProject} className="modal-body">
                {/* Pre-filled Project Info */}
                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                  <h3 style={{ marginTop: 0 }}>Project Information</h3>
                  <p><strong>Title:</strong> {selectedProject.title}</p>
                  <p><strong>Description:</strong> {selectedProject.description}</p>
                  <p><strong>Client:</strong> {selectedProject.client?.name}</p>
                  {selectedProject.rawFootageLinks && selectedProject.rawFootageLinks.length > 0 && (
                    <div>
                      <strong>Raw Footage Links:</strong>
                      <ul>
                        {selectedProject.rawFootageLinks.map((link, idx) => {
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
                  {selectedProject.scriptFile && (
                    <p><strong>Script:</strong> <a href={`${API_BASE_URL}${selectedProject.scriptFile}`} target="_blank" rel="noopener noreferrer">Download Script</a></p>
                  )}
                  <p><strong>Project Details:</strong> {selectedProject.projectDetails || 'N/A'}</p>
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
                        initializeAcceptModal(selectedProject);
                      }
                    }}
                  >
                    <option value="default">Default</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                {/* Client Amount (Total) */}
                <div className="form-group">
                  <label className="form-label">Client Amount ({selectedProject.currency || 'INR'}) - To be collected</label>
                  <input
                    type="number"
                    className="form-input"
                    value={selectedProject.clientAmount || selectedProject.amount || ''}
                    disabled
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>

                {/* Allocated Amount (Editor Budget) */}
                <div className="form-group">
                  <label className="form-label">Allocated Amount - Budget for Editors ({selectedProject.currency || 'INR'})</label>
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
                  />
                </div>

                {/* Work Breakdown Table */}
                <div className="form-group">
                  <label className="form-label">Work Breakdown</label>
                  <div style={{ marginBottom: '10px' }}>
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
                          <th>Work Type</th>
                          <th>Assigned Editor</th>
                          <th>Deadline</th>
                          <th>Percentage</th>
                          <th>Amount</th>
                          <th>Share Details (Optional)</th>
                          <th>Links (Optional)</th>
                          {workMode === 'custom' && <th>Action</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {workBreakdown.map((work, index) => (
                          <tr key={index}>
                            <td>
                              {workMode === 'default' ? (
                                work.workType
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
                            </td>
                            <td>
                              <select
                                className="form-select"
                                value={work.assignedEditor}
                                onChange={(e) => handleWorkBreakdownChange(index, 'assignedEditor', e.target.value)}
                                required
                                style={{ fontSize: '12px' }}
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
                                style={{ fontSize: '12px' }}
                              />
                            </td>
                            <td>
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
                                style={{ width: '80px', fontSize: '12px' }}
                              />
                              %
                            </td>
                            <td>
                              {selectedProject.currency || 'INR'} {work.amount.toFixed(2)}
                            </td>
                            <td>
                              <textarea
                                className="form-textarea"
                                value={work.shareDetails || ''}
                                onChange={(e) => handleWorkBreakdownChange(index, 'shareDetails', e.target.value)}
                                placeholder="Optional details for editor..."
                                style={{ fontSize: '12px', minHeight: '60px', width: '200px' }}
                              />
                            </td>
                            <td>
                              <div style={{ minWidth: '250px' }}>
                                {work.links && work.links.map((link, linkIndex) => (
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
                            {workMode === 'custom' && (
                              <td>
                                {work.workType !== 'Final Render' && (
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() => removeWorkType(index)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ marginTop: '10px', textAlign: 'right' }}>
                    <strong>Total Percentage: {
                      workBreakdown.reduce((sum, w) => sum + parseFloat(w.percentage || 0), 0).toFixed(2)
                    }%</strong>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" disabled={isAcceptingProject} onClick={() => setShowAcceptModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={isAcceptingProject}>
                    {isAcceptingProject ? 'Accepting...' : 'Accept Project'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Reset Confirmation Modal */}
      {
        showResetConfirmModal && (
          <div className="modal-overlay" onClick={() => setShowResetConfirmModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>⚠️ Confirm Reset</h2>
                <button className="modal-close" onClick={() => setShowResetConfirmModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <h3 style={{ color: '#dc3545', marginBottom: '20px' }}>
                    WARNING: This action cannot be undone!
                  </h3>
                  <p style={{ fontSize: '16px', marginBottom: '15px' }}>
                    Choose what you want to delete:
                  </p>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="resetOption"
                        value="projects"
                        defaultChecked
                        style={{ marginRight: '8px' }}
                      />
                      <strong>Delete Projects & Payments Only</strong>
                      <p style={{ fontSize: '12px', color: '#666', marginLeft: '24px', marginTop: '5px' }}>
                        Delete all project details and payment details, but keep user accounts
                      </p>
                    </label>
                    <label style={{ display: 'block', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="resetOption"
                        value="everything"
                        style={{ marginRight: '8px' }}
                      />
                      <strong>Delete Everything (Including User Accounts)</strong>
                      <p style={{ fontSize: '12px', color: '#666', marginLeft: '24px', marginTop: '5px' }}>
                        Delete complete details including user accounts (except admin accounts)
                      </p>
                    </label>
                  </div>
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
                    A PDF report containing all deleted data will be automatically generated and sent to all clients and editors.
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc3545' }}>
                    Are you absolutely sure you want to proceed?
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowResetConfirmModal(false)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={async () => {
                    const selectedOption = document.querySelector('input[name="resetOption"]:checked')?.value;
                    const deleteUsers = selectedOption === 'everything';
                    try {
                      setResetting(true);
                      await resetAPI.resetAll(deleteUsers);
                      setShowResetConfirmModal(false);
                      setError('');
                      await loadData();
                      await showAlert('Reset completed successfully. A PDF report has been sent to all clients and editors.', 'Success');
                    } catch (err) {
                      setError(err.response?.data?.message || 'Failed to reset data');
                    } finally {
                      setResetting(false);
                    }
                  }}
                  disabled={resetting}
                  style={{ backgroundColor: '#dc3545', color: 'white' }}
                >
                  {resetting ? 'Resetting...' : 'Yes, Proceed'}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default AdminDashboard;

