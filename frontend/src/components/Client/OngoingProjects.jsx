import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { workBreakdownAPI, projectsAPI, worksAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import './OngoingProjects.css';

const OngoingProjects = ({ projects, onProjectSelect, onEdit }) => {
  const { user } = useAuth();
  const { confirm, showAlert } = useDialog();
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (projectId, e) => {
    e.stopPropagation();
    const isConfirmed = await confirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? This action cannot be undone.',
      confirmText: 'Delete',
      isDanger: true
    });

    if (isConfirmed) {
      try {
        setDeleting(projectId);
        await projectsAPI.delete(projectId);
        window.location.reload(); // Reload to refresh project list
      } catch (error) {
        console.error('Failed to delete project:', error);
        await showAlert('Failed to delete project. Please try again.', 'Error');
        setDeleting(null);
      }
    }
  };

  // Component to calculate and display work completion progress
  const ProjectProgress = ({ projectId }) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      const calculateProgress = async () => {
        try {
          const response = await workBreakdownAPI.getByProject(projectId);
          const breakdown = response.data;
          const totalPct = breakdown.reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
          const donePct = breakdown
            .filter(w => w.approved === true)
            .reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
          const pct = totalPct > 0 ? (donePct / totalPct) * 100 : 0;
          setProgress(pct);
        } catch (err) {
          console.error('Failed to load progress:', err);
        }
      };
      calculateProgress();
    }, [projectId]);

    return (
      <div className="completion-container">
        <div className="completion-header">
          <span className="completion-label">📈 Progress</span>
          <span className="completion-value">{Math.round(progress)}%</span>
        </div>
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  // Component to dynamically determine and display project status badge
  const DynamicStatusBadge = ({ projectId, closed }) => {
    const [status, setStatus] = useState({ text: 'Loading...', className: 'badge-secondary' });

    useEffect(() => {
      const getProjectStatus = async () => {
        try {
          if (closed) {
            setStatus({ text: 'Closed', className: 'badge-secondary' });
            return;
          }

          const response = await workBreakdownAPI.getByProject(projectId);
          const breakdown = response.data;

          if (breakdown.length === 0) {
            setStatus({ text: 'Assigned', className: 'badge-primary' });
            return;
          }

          const workWithSubmissions = await Promise.all(breakdown.map(async (work) => {
            try {
              const subResponse = await worksAPI.getByWorkBreakdown(work._id);
              return { ...work, hasSubmission: subResponse.data && subResponse.data.length > 0 };
            } catch (e) {
              return { ...work, hasSubmission: false };
            }
          }));

          const workStates = workWithSubmissions.map(w => {
            const hasSub = w.hasSubmission;
            const clientApp = w.approvals?.client;
            const adminApp = w.approvals?.admin;
            if (clientApp && adminApp) return 'completed';
            if (clientApp && !adminApp) return 'waiting_admin';
            if (hasSub && !clientApp) return 'waiting_client';
            return 'pending';
          });

          let text, className;
          if (workStates.every(s => s === 'completed')) {
            text = 'Completed';
            className = 'badge-success';
          } else if (workStates.includes('waiting_client')) {
            text = 'Awaiting Approval';
            className = 'badge-warning';
          } else if (workStates.includes('waiting_admin')) {
            text = 'Under Review';
            className = 'badge-primary';
          } else if (workStates.every(s => s === 'pending')) {
            text = 'Assigned';
            className = 'badge-secondary';
          } else {
            text = 'In Progress';
            className = 'badge-primary';
          }

          setStatus({ text, className });
        } catch (err) {
          console.error('Failed to load status:', err);
          setStatus({ text: 'Unknown', className: 'badge-secondary' });
        }
      };
      getProjectStatus();
    }, [projectId, closed]);

    return <span className={`badge ${status.className}`}>{status.text}</span>;
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

  if (projects.length === 0) {
    return (
      <div className="card">
        <p className="text-center">No projects to show — create a new project.</p>
      </div>
    );
  }

  return (
    <div className="ongoing-projects">
      <div className="card">
        <div className="projects-grid">
          {projects.map((project) => (
            <div key={project._id} className={`project-card ${project.closed ? 'is-closed' : ''}`} onClick={() => onProjectSelect(project)}>
              <div className="project-header">
                <div>
                  <h3>{project.title}</h3>
                </div>
                {project.accepted && <DynamicStatusBadge projectId={project._id} closed={project.closed} />}
              </div>
              <div className="project-body">
                <div className="project-info-grid">
                  <div className="info-item">
                    <span className="label">🗓️ Deadline</span>
                    <span className="value">{formatDateTime(project.deadline)}</span>
                  </div>

                  {project.assignedEditor && (
                    <div className="info-item">
                      <span className="label">👤 Editor</span>
                      <span className="value">{project.assignedEditor.name}</span>
                    </div>
                  )}
                  {(() => {
                    const displayAmount = project.amount || project.clientAmount;
                    return displayAmount ? (
                      <div className="info-item">
                        <span className="label">💰 Budget</span>
                        <span className="value">{project.currency} {parseFloat(displayAmount).toFixed(2)}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
                {/* Work Completion Progress */}
                {project.accepted && <ProjectProgress projectId={project._id} />}
              </div>
              <div className="project-footer">
                {project.accepted ? (
                  <>
                    <button className="btn btn-view-progress" onClick={(e) => { e.stopPropagation(); onProjectSelect(project); }}>
                      View Progress & Give Feedback
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onEdit(project); }}>Edit Details</button>
                    <button
                      className="btn btn-danger"
                      onClick={(e) => handleDelete(project._id, e)}
                      disabled={deleting === project._id}
                    >
                      {deleting === project._id ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OngoingProjects;

