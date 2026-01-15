import { useState } from 'react';
import { projectsAPI } from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Edit, Save, X, Info } from 'lucide-react';

const ProjectDetails = ({ project, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(project.description);
  const [projectDetails, setProjectDetails] = useState(project.projectDetails || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      await projectsAPI.update(project._id, {
        description,
        projectDetails,
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update project details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDescription(project.description);
    setProjectDetails(project.projectDetails || '');
    setEditing(false);
    setError('');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-semibold">Project Details</CardTitle>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2">
            <Edit className="h-4 w-4" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Enter project description..."
              />
            </div>

            <div className="space-y-2">
              <Label>Additional Project Details</Label>
              <Textarea
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                rows={6}
                placeholder="Add any additional project details here..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCancel} disabled={loading}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium leading-none mb-2 flex items-center gap-2 text-primary">
                Description
                {project.editedFields?.description && project.accepted && (
                  <Badge variant="warning" className="text-[10px] px-1 py-0 h-4 bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-200">Edited</Badge>
                )}
              </h4>
              <p className="text-sm text-foreground bg-muted/40 p-3 rounded-md">{project.description}</p>
            </div>

            {project.projectDetails && (
              <div>
                <h4 className="text-sm font-medium leading-none mb-2 flex items-center gap-2 text-primary">
                  Additional Details
                  {project.editedFields?.projectDetails && project.accepted && (
                    <Badge variant="warning" className="text-[10px] px-1 py-0 h-4 bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-200">Edited</Badge>
                  )}
                </h4>
                <p className="text-sm text-foreground bg-muted/40 p-3 rounded-md whitespace-pre-wrap">{project.projectDetails}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/40 p-3 rounded-md">
                <h4 className="text-sm font-medium leading-none mb-1 flex items-center gap-2 text-primary">
                  Deadline
                  {project.editedFields?.deadline && project.accepted && (
                    <Badge variant="warning" className="text-[10px] px-1 py-0 h-4 bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-200">Edited</Badge>
                  )}
                </h4>
                <p className="text-sm font-semibold">{formatDate(project.deadline)}</p>
              </div>

              {project.assignedEditor && (
                <div className="bg-muted/40 p-3 rounded-md">
                  <h4 className="text-sm font-medium leading-none mb-1 text-primary">Assigned Editor</h4>
                  <p className="text-sm font-semibold">{project.assignedEditor.name}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectDetails;

