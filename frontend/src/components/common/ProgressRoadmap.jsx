import { useEffect, useMemo, useState } from 'react';
import { projectsAPI } from '../../services/api';
import './ProgressRoadmap.css';
import { formatDateTime } from '../../utils/formatDate';

const STAGES = [
  { key: 'roughcut', label: 'Rough Cut' },
  { key: 'broll', label: 'B-Roll' },
  { key: 'colorCorrection', label: 'Color Correction' },
  { key: 'motionGraphics', label: 'Motion Graphics' },
  { key: 'memes', label: 'Memes' },
  { key: 'musicSfx', label: 'Music & SFX' },
];

const statusBadge = (status) => {
  if (status === 'done') return 'badge-success';
  if (status === 'in_progress') return 'badge-warning';
  return 'badge-secondary';
};

const ProgressRoadmap = ({ projectId, canEdit = false }) => {
  const [roadmap, setRoadmap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingStage, setSavingStage] = useState('');

  const percent = useMemo(() => {
    if (!roadmap) return 0;
    const total = STAGES.length;
    const done = STAGES.reduce((acc, s) => acc + (roadmap[s.key]?.status === 'done' ? 1 : 0), 0);
    return Math.round((done / total) * 100);
  }, [roadmap]);

  const loadRoadmap = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getRoadmap(projectId);
      setRoadmap(res.data || {});
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) loadRoadmap();
  }, [projectId]);

  const updateStage = async (stageKey, nextStatus, notes) => {
    try {
      setSavingStage(stageKey);
      await projectsAPI.updateRoadmap(projectId, stageKey, nextStatus, notes);
      await loadRoadmap();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to update stage');
    } finally {
      setSavingStage('');
    }
  };

  if (loading) return <div className="spinner"></div>;

  return (
    <div className="roadmap">
      {error && <div className="alert alert-error">{error}</div>}
      <div className="roadmap-header">
        <h3>Progress Roadmap</h3>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${percent}%` }} />
          <span className="progress-label">{percent}%</span>
        </div>
      </div>

      <div className="roadmap-grid">
        {STAGES.map(({ key, label }) => {
          const stage = roadmap?.[key] || {};
          return (
            <div key={key} className="roadmap-item">
              <div className="roadmap-item-header">
                <span className="roadmap-item-title">{label}</span>
                <span className={`badge ${statusBadge(stage.status)}`}>
                  {(stage.status || 'not_started').replace('_', ' ')}
                </span>
              </div>
              {stage.updatedAt && (
                <div className="roadmap-item-meta">
                  Updated: {formatDateTime(stage.updatedAt)}
                </div>
              )}
              {stage.notes && <div className="roadmap-notes">{stage.notes}</div>}

              {canEdit && (
                <div className="roadmap-actions">
                  <div className="btn-group">
                    {['not_started', 'in_progress', 'done'].map((s) => (
                      <button
                        key={s}
                        className={`btn btn-sm ${stage.status === s ? 'btn-primary' : 'btn-secondary'}`}
                        disabled={savingStage === key}
                        onClick={() => updateStage(key, s, stage.notes || '')}
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="form-textarea"
                    placeholder="Add notes..."
                    value={stage.notes || ''}
                    onChange={(e) => setRoadmap({ ...roadmap, [key]: { ...(stage || {}), notes: e.target.value } })}
                    rows={2}
                  />
                  <button
                    className="btn btn-success btn-sm"
                    disabled={savingStage === key}
                    onClick={() => updateStage(key, stage.status || 'not_started', stage.notes || '')}
                  >
                    {savingStage === key ? 'Saving...' : 'Save' }
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProgressRoadmap;


