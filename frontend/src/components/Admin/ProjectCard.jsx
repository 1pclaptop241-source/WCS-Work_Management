import { useState, useEffect } from 'react';
import { workBreakdownAPI, projectsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { formatDate, formatDateTime } from '../../utils/formatDate';

const ProjectCard = ({ project, onViewDetails, onDelete, onUpdate }) => {
  const { user } = useAuth();
  const { confirm, showAlert } = useDialog();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const calculateProgress = async () => {
      try {
        const response = await workBreakdownAPI.getByProject(project._id);
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
  }, [project._id]);

  return (
    <div className="card" style={{
      cursor: 'pointer',
      position: 'relative',
      background: '#ffffff',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e2e8f0',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden'
    }} onClick={() => onViewDetails(project)}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '5px',
        height: '100%',
        background: project.closed ? '#64748b' : 'linear-gradient(180deg, #2E86AB, #06A77D)',
        zIndex: 1
      }} />
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <h3 style={{ margin: 0 }}>
          {project.title}
        </h3>
        {onDelete && !project.closed ? (
          <button
            title="Delete Project"
            style={{
              padding: '6px',
              backgroundColor: 'rgba(220, 53, 69, 0.1)',
              color: '#dc3545',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              marginLeft: '8px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#dc3545';
              e.currentTarget.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
              e.currentTarget.style.color = '#dc3545';
            }}
            onClick={async (e) => {
              e.stopPropagation();
              const isConfirmed = await confirm({
                title: 'Delete Project',
                message: `Are you sure you want to delete the project "${project.title}"? This action cannot be undone.`,
                confirmText: 'Delete',
                isDanger: true
              });
              if (isConfirmed) {
                onDelete(project._id);
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        ) : project.closed ? (
          <span style={{
            padding: '4px 10px',
            fontSize: '11px',
            backgroundColor: 'rgba(100, 116, 139, 0.1)',
            color: '#64748b',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: '700',
            border: '1px solid rgba(100, 116, 139, 0.2)',
            textTransform: 'uppercase'
          }}>
            <span style={{ fontSize: '14px' }}>🔒</span> Closed
          </span>
        ) : null}
      </div>
      <div className="card-body">
        <p><strong>Client:</strong> {project.client?.name || 'N/A'}</p>
        {project.clientAmount && (
          <p><strong>Client Amount:</strong> {project.currency} {project.clientAmount.toLocaleString()}</p>
        )}
        {project.accepted && project.amount && (
          <p><strong>Allocated Amount:</strong> {project.currency} {project.amount.toLocaleString()}</p>
        )}
        <p><strong>Deadline:</strong> {formatDate(project.deadline)}</p>
        <div style={{ marginTop: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>

          {/* Show Progress Bar or Close Button */}
          {!project.closed ? (
            !(user?.role === 'admin' && Math.round(progress) >= 100) ? (
              <div style={{ width: '100%', height: '20px', backgroundColor: '#e0e0e0', borderRadius: '10px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #059669, #10b981)',
                    transition: 'width 0.3s ease',
                    boxShadow: '0 0 10px rgba(5, 150, 105, 0.2)'
                  }}
                />
              </div>
            ) : (
              /* Show Close Button if 100% AND Admin AND Not Closed */
              <button
                className="btn btn-success"
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  const isConfirmed = await confirm({
                    title: 'Close Project',
                    message: 'Are you sure you want to close this project? It will be hidden after 2 days and deleted after 7 days.',
                    confirmText: 'Close Project',
                    isDanger: true
                  });

                  if (isConfirmed) {
                    try {
                      await projectsAPI.closeProject(project._id);
                      if (onUpdate) {
                        await onUpdate();
                      }
                      await showAlert('Project closed successfully! Notifications sent to client and editors.', 'Success');
                    } catch (err) {
                      await showAlert(err.response?.data?.message || 'Failed to close project', 'Error');
                    }
                  }
                }}
              >
                Close Project
              </button>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;

