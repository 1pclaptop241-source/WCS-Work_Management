import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { worksAPI, API_BASE_URL } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import FeedbackChat from '../common/FeedbackChat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Loader2 } from 'lucide-react';

const CorrectionsView = ({ project, works, onClose }) => {
  const { user } = useAuth();
  const [projectWorks, setProjectWorks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (project?._id) {
      loadWorks();
    }
  }, [project]);

  const loadWorks = async () => {
    try {
      setLoading(true);
      const response = await worksAPI.getByProject(project._id);
      setProjectWorks(response.data);
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle>Corrections & Feedback - {project.title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : projectWorks.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
              <p>No submissions or corrections yet.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {projectWorks.map((work) => (
                <div key={work._id} className="border rounded-lg p-4 bg-card shadow-sm">
                  {/* Submission Header */}
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4 pb-4 border-b">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-muted-foreground uppercase">Submission:</span>
                        <a
                          href={work.submissionType === 'link' ? work.fileUrl : (work.fileUrl.match(/^https?:\/\//) ? work.fileUrl : (work.fileUrl.startsWith('/') || work.fileUrl.startsWith('uploads') ? `${API_BASE_URL}${work.fileUrl}` : `https://${work.fileUrl}`))}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium flex items-center gap-1"
                        >
                          {work.fileName} <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Submitted: {formatDateTime(work.submittedAt)}
                      </div>
                    </div>
                    <div>
                      <Badge variant={work.status === 'approved' ? 'default' : 'secondary'} className="capitalize">
                        {work.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {/* General Feedback */}
                  {work.clientFeedback && (
                    <div className="mb-4 bg-muted/50 p-3 rounded-md">
                      <strong className="block text-sm font-semibold mb-1 text-foreground">General Feedback:</strong>
                      <p className="text-sm text-foreground/90">{work.clientFeedback}</p>
                    </div>
                  )}

                  {/* Chat Section */}
                  {work.corrections && work.corrections.length > 0 ? (
                    <div className="mt-4">
                      <strong className="block text-sm font-semibold mb-2 text-foreground">Detailed Corrections:</strong>
                      <FeedbackChat
                        corrections={work.corrections}
                        currentUser={user}
                        canMarkFixed={false}
                      />
                    </div>
                  ) : (
                    !work.clientFeedback && (
                      <p className="text-sm text-muted-foreground italic">No detailed corrections requested.</p>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-4 border-t bg-muted/20">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CorrectionsView;
