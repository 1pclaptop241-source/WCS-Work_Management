import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { projectsAPI, resetAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import AssignedWorks from './AssignedWorks';
import './EditorDashboard.css';

const EditorDashboard = () => {
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletionReports, setDeletionReports] = useState([]);


  useEffect(() => {
    loadData();
    loadDeletionReports();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const projectsRes = await projectsAPI.getAll();
      setProjects(projectsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
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
      <div className="dashboard-header">
        <h1>Editor Dashboard</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="welcome-message">
            Welcome, {user.name}!
          </div>

        </div>
      </div>

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
              onClick={() => setDeletionReports([])}
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

      <div className="tab-content" style={{ marginTop: '20px' }}>
        <AssignedWorks projects={projects} onUpdate={loadData} />
      </div>

    </div>
  );
};

export default EditorDashboard;

