import { useState, useEffect } from 'react';
import { workBreakdownAPI, projectsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { formatDate } from '../../utils/formatDate';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Lock } from 'lucide-react';
import { cn } from '@/utils/cn';

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

  const handleDelete = async (e) => {
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
  };

  const handleClose = async (e) => {
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
        await showAlert('Project closed successfully!', 'Success');
      } catch (err) {
        await showAlert(err.response?.data?.message || 'Failed to close project', 'Error');
      }
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md relative overflow-hidden group",
        project.closed ? "opacity-75 bg-muted" : "bg-card"
      )}
      onClick={() => onViewDetails(project)}
    >
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full z-10",
        project.closed ? "bg-slate-500" : "bg-gradient-to-b from-primary to-green-500"
      )} />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
        <CardTitle className="text-lg font-semibold truncate pr-2">
          {project.title}
        </CardTitle>
        <div className="flex items-center gap-1">
          {project.closed && (
            <Badge variant="secondary" className="text-[10px] uppercase font-bold gap-1">
              <Lock className="h-3 w-3" /> Closed
            </Badge>
          )}
          {onDelete && !project.closed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDelete}
              title="Delete Project"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pl-6 pt-2 pb-2 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Client:</span>
          <span className="font-medium">{project.client?.name || 'N/A'}</span>
        </div>
        {project.clientAmount && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">{project.currency} {project.clientAmount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Deadline:</span>
          <span className="font-medium">{formatDate(project.deadline)}</span>
        </div>
      </CardContent>

      <CardFooter className="pl-6 pt-2 flex flex-col gap-2">
        <div className="flex w-full justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-bold">{Math.round(progress)}%</span>
        </div>

        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {!project.closed && user?.role === 'admin' && Math.round(progress) >= 100 && (
          <Button
            variant="success"
            size="sm"
            className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleClose}
          >
            Close Project
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;
