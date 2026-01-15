import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { workBreakdownAPI, projectsAPI, worksAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Calendar, User, DollarSign, Edit, Trash2, ArrowRight } from 'lucide-react';

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
        window.location.reload();
      } catch (error) {
        console.error('Failed to delete project:', error);
        await showAlert('Failed to delete project. Please try again.', 'Error');
        setDeleting(null);
      }
    }
  };

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
      <div className="space-y-2 mt-4">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  const DynamicStatusBadge = ({ projectId, closed }) => {
    const [status, setStatus] = useState({ text: 'Loading...', variant: 'secondary' });

    useEffect(() => {
      const getProjectStatus = async () => {
        try {
          if (closed) {
            setStatus({ text: 'Closed', variant: 'secondary' });
            return;
          }

          const response = await workBreakdownAPI.getByProject(projectId);
          const breakdown = response.data;

          if (breakdown.length === 0) {
            setStatus({ text: 'Assigned', variant: 'default' });
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

          let text, variant;
          if (workStates.every(s => s === 'completed')) {
            text = 'Completed';
            variant = 'success'; // standard badge variant "success" might not exist, usually "default" or "outline" or custom class
          } else if (workStates.includes('waiting_client')) {
            text = 'Awaiting Approval';
            variant = 'warning';
          } else if (workStates.includes('waiting_admin')) {
            text = 'Under Review';
            variant = 'default';
          } else if (workStates.every(s => s === 'pending')) {
            text = 'Assigned';
            variant = 'secondary';
          } else {
            text = 'In Progress';
            variant = 'default';
          }

          // Mapping variants to standard or custom classes
          setStatus({ text, variant });
        } catch (err) {
          console.error('Failed to load status:', err);
          setStatus({ text: 'Unknown', variant: 'secondary' });
        }
      };
      getProjectStatus();
    }, [projectId, closed]);

    // Helper to map variant to class
    const getBadgeClass = (v) => {
      switch (v) {
        case 'success': return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400';
        case 'warning': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
        case 'default': return 'bg-primary text-primary-foreground hover:bg-primary/90';
        case 'secondary': return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
        default: return '';
      }
    }

    return <Badge variant="outline" className={`${getBadgeClass(status.variant)} border-0 font-medium`}>{status.text}</Badge>;
  };

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-lg bg-muted/10">
        <p className="text-muted-foreground">No projects to show. Create a new one to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <Card
          key={project._id}
          className={`group transition-all duration-300 hover:shadow-lg border-l-4 ${project.closed ? 'border-l-slate-400 opacity-70' : 'border-l-primary'} cursor-pointer`}
          onClick={() => onProjectSelect(project)}
        >
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start gap-2">
              <CardTitle className="text-lg font-bold leading-tight line-clamp-2">{project.title}</CardTitle>
              {project.accepted && <DynamicStatusBadge projectId={project._id} closed={project.closed} />}
            </div>
            {project.closed && <Badge variant="secondary" className="mt-1">Closed</Badge>}
          </CardHeader>

          <CardContent className="space-y-3 pb-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  <Calendar className="h-3 w-3" /> Deadline
                </div>
                <div className="font-medium truncate" title={formatDateTime(project.deadline)}>
                  {formatDateTime(project.deadline)}
                </div>
              </div>

              {(() => {
                const displayAmount = project.clientAmount || project.amount;
                if (!displayAmount) return null;
                return (
                  <div className="flex flex-col p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                      <DollarSign className="h-3 w-3" /> Budget
                    </div>
                    <div className="font-medium">
                      {project.currency} {parseFloat(displayAmount).toFixed(2)}
                    </div>
                  </div>
                );
              })()}
            </div>

            {project.assignedEditor && (
              <div className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded-lg">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground text-xs font-semibold uppercase">Editor:</span>
                <span className="font-medium">{project.assignedEditor.name}</span>
              </div>
            )}

            {project.accepted && <ProjectProgress projectId={project._id} />}
          </CardContent>

          <CardFooter className="pt-2 flex justify-end gap-2">
            {project.accepted ? (
              <Button
                className="w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
                onClick={(e) => { e.stopPropagation(); onProjectSelect(project); }}
              >
                View Progress & Feedback <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={(e) => { e.stopPropagation(); onEdit(project); }}>
                  <Edit className="h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={(e) => handleDelete(project._id, e)}
                  disabled={deleting === project._id}
                >
                  <Trash2 className="h-4 w-4" /> {deleting === project._id ? 'Deleting...' : 'Delete'}
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default OngoingProjects;

