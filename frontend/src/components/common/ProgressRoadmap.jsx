import { useEffect, useMemo, useState } from 'react';
import { projectsAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const STAGES = [
  { key: 'roughcut', label: 'Rough Cut' },
  { key: 'broll', label: 'B-Roll' },
  { key: 'colorCorrection', label: 'Color Correction' },
  { key: 'motionGraphics', label: 'Motion Graphics' },
  { key: 'memes', label: 'Memes' },
  { key: 'musicSfx', label: 'Music & SFX' },
];

const statusVariant = (status) => {
  if (status === 'done') return 'success';
  if (status === 'in_progress') return 'warning';
  return 'secondary';
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

  if (loading) return <div className="p-4 text-center text-muted-foreground">Loading progress...</div>;

  return (
    <div className="space-y-6">
      {error && <div className="p-4 bg-destructive/10 text-destructive rounded">{error}</div>}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Progress Roadmap</CardTitle>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Progress value={percent} className="w-32 h-2" />
              <span>{percent}%</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAGES.map(({ key, label }) => {
              const stage = roadmap?.[key] || {};
              return (
                <Card key={key} className="border bg-card shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">{label}</h4>
                      <Badge variant={statusVariant(stage.status)}>
                        {(stage.status || 'not_started').replace('_', ' ')}
                      </Badge>
                    </div>

                    {stage.updatedAt && (
                      <div className="text-xs text-muted-foreground">
                        Updated: {formatDateTime(stage.updatedAt)}
                      </div>
                    )}

                    {stage.notes && !canEdit && (
                      <div className="text-sm bg-muted/50 p-2 rounded">{stage.notes}</div>
                    )}

                    {canEdit && (
                      <div className="space-y-3 pt-2">
                        <div className="flex flex-wrap gap-2">
                          {['not_started', 'in_progress', 'done'].map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={stage.status === s ? (s === 'done' ? 'default' : s === 'in_progress' ? 'secondary' : 'outline') : 'ghost'}
                              className={stage.status === s && s === 'done' ? 'bg-green-600 hover:bg-green-700' : ''}
                              disabled={savingStage === key}
                              onClick={() => updateStage(key, s, stage.notes || '')}
                            >
                              {s.replace('_', ' ')}
                            </Button>
                          ))}
                        </div>
                        <Textarea
                          placeholder="Add notes..."
                          value={stage.notes || ''}
                          onChange={(e) => setRoadmap({ ...roadmap, [key]: { ...(stage || {}), notes: e.target.value } })}
                          rows={2}
                          className="text-sm"
                        />
                        <Button
                          size="sm"
                          className="w-full"
                          disabled={savingStage === key}
                          onClick={() => updateStage(key, stage.status || 'not_started', stage.notes || '')}
                        >
                          {savingStage === key ? 'Saving...' : 'Save Notes'}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressRoadmap;


