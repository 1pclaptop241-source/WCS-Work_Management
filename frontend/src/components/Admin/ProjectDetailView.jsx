import { useState, useEffect } from 'react';
import { workBreakdownAPI, worksAPI, projectsAPI, API_BASE_URL } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import VoiceRecorder from '../common/VoiceRecorder';
import WorkTypeMenu from '../common/WorkTypeMenu';
import WorkTypeDetailsModal from '../common/WorkTypeDetailsModal';
import FeedbackChat from '../common/FeedbackChat';
import StatusBadge from '../common/StatusBadge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Check, X, Upload, Download, ExternalLink, MessageSquare,
  AlertCircle, FileText, Clock, DollarSign, Flag,
  ChevronDown, ChevronUp, Paperclip, Mic
} from 'lucide-react';
// import './ProjectDetailView.css'; // Removed legacy CSS


const ProjectDetailView = ({ project, onClose, onUpdate }) => {
  const { user } = useAuth();
  const { confirm, showAlert } = useDialog();
  const [workBreakdown, setWorkBreakdown] = useState([]);
  const [workSubmissions, setWorkSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWorkType, setSelectedWorkType] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [showWorkTypeDetails, setShowWorkTypeDetails] = useState(false);
  const [selectedWorkTypeForDetails, setSelectedWorkTypeForDetails] = useState(null);
  const [feedbackText, setFeedbackText] = useState({}); // { [workBreakdownId]: text }

  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(null); // stores breakdown ID
  const [adminInstructionsInput, setAdminInstructionsInput] = useState({});
  const [isSavingAdminInstructions, setIsSavingAdminInstructions] = useState(null);


  useEffect(() => {
    loadWorkBreakdown();
  }, [project._id]);

  useEffect(() => {
    if (workBreakdown.length > 0) {
      loadWorkSubmissions();
    }
  }, [workBreakdown]);

  const loadWorkBreakdown = async () => {
    try {
      setLoading(true);
      const response = await workBreakdownAPI.getByProject(project._id);
      setWorkBreakdown(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load work breakdown');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkSubmissions = async () => {
    try {
      const submissions = {};
      for (const work of workBreakdown) {
        try {
          const response = await worksAPI.getByWorkBreakdown(work._id);
          submissions[work._id] = response.data;
        } catch (err) {
          submissions[work._id] = [];
        }
      }
      setWorkSubmissions(submissions);
    } catch (err) {
      console.error('Failed to load work submissions:', err);
    }
  };

  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [markingFixId, setMarkingFixId] = useState(null);
  const [isApprovingWork, setIsApprovingWork] = useState(null); // stores breakdown ID
  const [isClosingProject, setIsClosingProject] = useState(false);
  const [isApprovingProject, setIsApprovingProject] = useState(false);

  const handleCloseProject = async () => {
    const isConfirmed = await confirm({
      title: 'Close Project',
      message: 'Are you sure you want to close this project? This indicates all work is completed and paid for.',
      confirmText: 'Close Project',
      isDanger: false
    });

    if (isConfirmed) {
      try {
        setIsClosingProject(true);
        await projectsAPI.closeProject(project._id);
        await onUpdate();
        onClose();
        showAlert('Project closed successfully', 'Success');
      } catch (err) {
        console.error('Failed to close project:', err);
        showAlert(err.response?.data?.message || 'Failed to close project', 'Error');
      } finally {
        setIsClosingProject(false);
      }
    }
  };

  const handleAddCorrection = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      if (!correctionText.trim() && !voiceFile && mediaFiles.length === 0) {
        await showAlert('Please provide correction details (text, voice, or files)', 'Validation Error');
        return;
      }

      setIsSubmittingCorrection(true);
      setError('');
      await worksAPI.addCorrections(selectedSubmission._id, correctionText, voiceFile, mediaFiles);
      setShowCorrectionsModal(false);
      setSelectedSubmission(null);
      setCorrectionText('');
      setVoiceFile(null);
      setMediaFiles([]);
      await loadWorkSubmissions();
      await loadWorkBreakdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add correction');
      showAlert(err.response?.data?.message || 'Failed to add correction', 'Error');
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  const handleMarkCorrectionDone = async (submissionId, correctionId) => {
    try {
      setMarkingFixId(correctionId);
      setError('');
      await worksAPI.markCorrectionDone(submissionId, correctionId);
      await loadWorkSubmissions();
      await loadWorkBreakdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark correction as done');
      showAlert(err.response?.data?.message || 'Failed to mark correction as done', 'Error');
    } finally {
      setMarkingFixId(null);
    }
  };

  const handleAddFeedback = async (workBreakdownId) => {
    const text = feedbackText[workBreakdownId];
    if (!text || !text.trim()) return;

    try {
      setIsSubmittingFeedback(workBreakdownId);
      await workBreakdownAPI.addFeedback(workBreakdownId, text);
      setFeedbackText(prev => ({ ...prev, [workBreakdownId]: '' }));
      await loadWorkBreakdown();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add feedback');
      showAlert(err.response?.data?.message || 'Failed to add feedback', 'Error');
    } finally {
      setIsSubmittingFeedback(null);
    }
  };

  const handleSaveAdminInstructions = async (workBreakdownId) => {
    const text = adminInstructionsInput[workBreakdownId];
    if (text === undefined) return;

    try {
      setIsSavingAdminInstructions(workBreakdownId);
      await workBreakdownAPI.update(workBreakdownId, { adminInstructions: text });
      await loadWorkBreakdown();
      showAlert('Admin instructions saved', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save instructions');
    } finally {
      setIsSavingAdminInstructions(null);
    }
  };

  const handleToggleVisibility = async (workId) => {
    try {
      await worksAPI.toggleWorkFileVisibility(workId);
      await loadWorkSubmissions(); // Reload to update state
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      showAlert('Failed to toggle visibility', 'Error');
    }
  };

  const focusFeedback = (bdId) => {
    const input = document.getElementById(`feedback-input-${bdId}`);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  const handleVoiceRecordingComplete = (audioBlob) => {
    setVoiceFile(audioBlob);
    setShowVoiceRecorder(false);
  };

  const handleMediaChange = (e) => {
    setMediaFiles(Array.from(e.target.files));
  };

  const calculateProgress = () => {
    if (workBreakdown.length === 0) return 0;
    const totalPct = workBreakdown.reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
    const donePct = workBreakdown
      .filter(w => w.approved === true)
      .reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
    return totalPct > 0 ? (donePct / totalPct) * 100 : 0;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: 'badge-secondary',
      in_progress: 'badge-primary',
      completed: 'badge-success',
    };
    return statusMap[status] || 'badge-secondary';
  };

  const getAllSubmissionsForBreakdown = (breakdownId) => {
    const submissions = workSubmissions[breakdownId] || [];
    return submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  };

  const getAllCorrectionsForBreakdown = (breakdownId) => {
    const allSubs = getAllSubmissionsForBreakdown(breakdownId);
    const allCorrections = [];
    allSubs.forEach(sub => {
      if (sub.corrections && sub.corrections.length > 0) {
        sub.corrections.forEach(corr => {
          allCorrections.push({ ...corr, workId: sub._id });
        });
      }
    });
    return allCorrections;
  };

  const handleViewWorkTypeDetails = (workBreakdown) => {
    setSelectedWorkTypeForDetails(workBreakdown);
    setShowWorkTypeDetails(true);
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  const progress = calculateProgress();

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-[1200px] w-[95%] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-xl">Project Details - {project.title}</DialogTitle>
                <DialogDescription>View project details, track progress, and manage work.</DialogDescription>
              </div>
              {user.role === 'admin' && Math.round(progress) === 100 && !project.closed && (
                <Button
                  variant="destructive"
                  onClick={handleCloseProject}
                  disabled={isClosingProject}
                >
                  {isClosingProject ? 'Closing...' : 'Close Project'}
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="pt-4">
            <Tabs defaultValue="overview" className="w-full space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="board">Task Board</TabsTrigger>
                <TabsTrigger value="list">Task List</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-4">
                {/* Project Information */}
                <Card>
                  <CardHeader className="bg-muted/30 pb-3">
                    <CardTitle className="text-lg text-primary flex items-center gap-2">
                      <FileText className="h-5 w-5" /> Project Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                      <div className="space-y-1">
                        <Label className="text-xs uppercase text-muted-foreground font-bold">Client</Label>
                        <div className="font-medium text-sm">{project.client?.name} ({project.client?.email})</div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
                          Amount
                          {project.editedFields?.amount && project.accepted && (
                            <Badge variant="warning" className="text-[10px] px-1 h-5">Edited</Badge>
                          )}
                        </Label>
                        <div className="font-medium text-sm flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          {project.currency} {project.amount?.toLocaleString()}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
                          Deadline
                          {project.editedFields?.deadline && project.accepted && (
                            <Badge variant="warning" className="text-[10px] px-1 h-5">Edited</Badge>
                          )}
                        </Label>
                        <div className="font-medium text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDateTime(project.deadline)}
                        </div>
                      </div>

                      {project.scriptFile && (
                        <div className="space-y-1">
                          <Label className="text-xs uppercase text-muted-foreground font-bold">Script</Label>
                          <div>
                            <Button variant="outline" size="sm" asChild className="h-8">
                              <a
                                href={project.scriptFile.match(/^https?:\/\//) ? project.scriptFile : `https://${project.scriptFile}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="mr-2 h-3 w-3" /> Download Script
                              </a>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 mt-4">
                      <Label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
                        Description
                        {project.editedFields?.description && project.accepted && (
                          <Badge variant="warning" className="text-[10px] px-1 h-5">Edited</Badge>
                        )}
                      </Label>
                      <div className="font-medium text-sm whitespace-pre-wrap bg-muted/20 p-3 rounded-md border text-muted-foreground">
                        {project.description}
                      </div>
                    </div>

                    {project.rawFootageLinks && project.rawFootageLinks.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <Label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
                          Raw Footage Links
                          {project.editedFields?.rawFootageLinks && project.accepted && (
                            <Badge variant="warning" className="text-[10px] px-1 h-5">Edited</Badge>
                          )}
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {project.rawFootageLinks.map((link, idx) => (
                            <a
                              key={idx}
                              href={link.url.match(/^https?:\/\//) ? link.url : `https://${link.url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-md border bg-background hover:bg-muted text-sm text-primary transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="truncate">{link.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {project.projectDetails && (
                      <div className="space-y-1 mt-4">
                        <Label className="text-xs uppercase text-muted-foreground font-bold flex items-center gap-2">
                          Project Details
                          {project.editedFields?.projectDetails && project.accepted && (
                            <Badge variant="warning" className="text-[10px] px-1 h-5">Edited</Badge>
                          )}
                        </Label>
                        <div className="font-medium text-sm whitespace-pre-wrap bg-muted/20 p-3 rounded-md border text-muted-foreground">
                          {project.projectDetails}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Progress Section */}
                <Card>
                  <CardHeader className="bg-muted/30 pb-3">
                    <CardTitle className="text-lg text-primary flex items-center gap-2">
                      <Clock className="h-5 w-5" /> Overall Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex justify-between mb-2 text-sm font-medium">
                      <span>Completion</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-4 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 transition-all duration-500 ease-out flex items-center justify-center text-[10px] text-white font-bold"
                        style={{ width: `${progress}%` }}
                      >
                        {Math.round(progress) > 5 && `${Math.round(progress)}%`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="list" className="space-y-6 mt-4">
                {/* Status Section */}
                <Card>
                  <CardHeader className="bg-muted/30 pb-3">
                    <CardTitle className="text-lg text-primary flex items-center gap-2">
                      <FileText className="h-5 w-5" /> Work Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Work Type</TableHead>
                          <TableHead>Assigned Editor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Deadline</TableHead>
                          {user.role === 'admin' && <TableHead>Amount</TableHead>}
                          <TableHead>Approved</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workBreakdown.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={user.role === 'admin' ? 6 : 5} className="text-center py-6 text-muted-foreground">
                              No work breakdown found
                            </TableCell>
                          </TableRow>
                        ) : (
                          workBreakdown.map((work) => (
                            <TableRow key={work._id}>
                              <TableCell className="font-medium">{work.workType}</TableCell>
                              <TableCell>{work.assignedEditor?.name || <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                              <TableCell>
                                {(() => {
                                  const submissions = workSubmissions[work._id] || [];
                                  const hasSubmission = submissions.length > 0;
                                  const adminApproved = work.approvals?.admin || false;
                                  const clientApproved = work.approvals?.client || false;
                                  const bothApproved = adminApproved && clientApproved;

                                  let statusText, statusVariant;
                                  if (bothApproved) {
                                    statusText = 'Completed';
                                    statusVariant = 'success'; // Custom variant or use default/green classes
                                  } else if (hasSubmission) {
                                    statusText = 'Under Review';
                                    statusVariant = 'warning';
                                  } else {
                                    statusText = 'Pending';
                                    statusVariant = 'secondary';
                                  }

                                  return (
                                    <Badge variant={statusVariant} className={
                                      statusVariant === 'success' ? 'bg-green-500 hover:bg-green-600' :
                                        statusVariant === 'warning' ? 'bg-amber-500 hover:bg-amber-600' : ''
                                    }>
                                      {statusText}
                                    </Badge>
                                  );
                                })()}
                              </TableCell>
                              <TableCell>{user.role === 'admin' ? formatDateTime(work.deadline) : formatDate(work.deadline)}</TableCell>
                              {user.role === 'admin' && (
                                <TableCell>
                                  {project.currency} {work.amount?.toFixed(2)}
                                  {(() => {
                                    const deadline = new Date(work.deadline);
                                    const now = new Date();
                                    if (now > deadline && !work.approved) {
                                      return (
                                        <div className="flex items-center gap-1 text-[10px] text-destructive font-bold mt-1">
                                          <AlertCircle className="h-3 w-3" /> Overdue
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </TableCell>
                              )}
                              <TableCell>
                                {(() => {
                                  const adminApproved = work.approvals?.admin || false;
                                  const clientApproved = work.approvals?.client || false;

                                  return (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 opacity-90">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground w-10">Admin</span>
                                        {adminApproved ? (
                                          <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
                                        ) : (
                                          <X className="h-3 w-3 text-muted-foreground/50" />
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 opacity-90">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground w-10">Client</span>
                                        {clientApproved ? (
                                          <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
                                        ) : (
                                          <X className="h-3 w-3 text-muted-foreground/50" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="board" className="space-y-6 mt-4">
                {/* Work Items and Corrections */}
                <Card>
                  <CardHeader className="bg-muted/30 pb-3">
                    <CardTitle className="text-lg text-primary flex items-center gap-2">
                      <FileText className="h-5 w-5" /> Work Items and Corrections
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {workBreakdown.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                        <p>No work breakdown defined for this project.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {workBreakdown.map((bd) => {
                          const submissions = workSubmissions[bd._id] || [];
                          const work = submissions.length > 0
                            ? submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0]
                            : null;

                          const hasUpload = !!work;
                          const hasPendingCorrections = getAllCorrectionsForBreakdown(bd._id).some(c => !c.done);
                          const isApproved = bd.approved;

                          // Determine border color based on status
                          let statusBorderClass = 'border-slate-200';
                          if (isApproved) statusBorderClass = 'border-l-4 border-l-green-500';
                          else if (hasPendingCorrections) statusBorderClass = 'border-l-4 border-l-amber-500';
                          else if (hasUpload) statusBorderClass = 'border-l-4 border-l-blue-500';
                          else statusBorderClass = 'border-l-4 border-l-slate-300';

                          return (
                            <div key={bd._id} className={`bg-card rounded-lg border shadow-sm p-5 transition-shadow hover:shadow-md ${statusBorderClass}`}>

                              {/* Work Item Header */}
                              <div className="flex justify-between items-start mb-5 pb-4 border-b border-border/50">
                                <div className="flex items-center gap-3">
                                  <h4 className="text-lg font-bold text-foreground tracking-tight">{bd.workType}</h4>
                                  {work?.version && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                      v{work.version}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  {user.role === 'admin' && (
                                    <span className="text-sm font-semibold text-muted-foreground bg-secondary px-3 py-1 rounded-md border">
                                      {project.currency} {bd.amount}
                                    </span>
                                  )}
                                  <div className="flex items-center">
                                    <WorkTypeMenu workBreakdown={bd} onViewDetails={handleViewWorkTypeDetails} />
                                  </div>
                                </div>
                              </div>

                              {/* Work Item Info Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assigned to</span>
                                  <span className="font-medium text-sm text-foreground">{bd.assignedEditor?.name || 'Unassigned'}</span>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</span>
                                  <div>
                                    <StatusBadge status={isApproved ? 'approved' : (hasPendingCorrections ? 'needs_revision' : (hasUpload ? 'under_review' : 'pending'))} />
                                  </div>
                                </div>

                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Latest Submission</span>
                                  {hasUpload ? (
                                    <div className="flex flex-col">
                                      {work.submissionType === 'link' ? (
                                        <a
                                          href={work.fileUrl.match(/^https?:\/\//) ? work.fileUrl : `https://${work.fileUrl}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="font-medium text-sm truncate max-w-[200px] text-blue-600 hover:underline block"
                                          title={work.fileUrl}
                                        >
                                          {work.fileUrl}
                                        </a>
                                      ) : (
                                        <span className="font-medium text-sm truncate max-w-[200px]" title={work.fileName}>{work.fileName}</span>
                                      )}
                                      <span className="text-xs text-muted-foreground">({formatDate(work.submittedAt)})</span>
                                    </div>
                                  ) : (
                                    <span className="text-sm italic text-muted-foreground">Waiting for upload...</span>
                                  )}
                                </div>
                              </div>

                              {/* Instructions Section */}
                              <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border/50 space-y-4">
                                <div className="space-y-2">
                                  <Label className="uppercase text-xs font-bold text-muted-foreground">Client Instructions</Label>
                                  <div className="p-3 bg-background rounded-md border min-h-[40px] text-sm whitespace-pre-wrap">
                                    {bd.clientInstructions || <span className="italic text-muted-foreground">No instructions provided.</span>}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label className="uppercase text-xs font-bold text-muted-foreground">Admin Instructions (to Editor)</Label>
                                  <div className="flex gap-2">
                                    <Textarea
                                      className="min-h-[60px] text-sm resize-none"
                                      placeholder="Add instructions for the editor..."
                                      value={adminInstructionsInput[bd._id] !== undefined ? adminInstructionsInput[bd._id] : (bd.adminInstructions || '')}
                                      onChange={(e) => setAdminInstructionsInput(prev => ({ ...prev, [bd._id]: e.target.value }))}
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveAdminInstructions(bd._id)}
                                      disabled={isSavingAdminInstructions === bd._id}
                                      className="h-auto self-start"
                                    >
                                      {isSavingAdminInstructions === bd._id ? '...' : 'Save'}
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {/* Actions & Source File */}
                              <div className="mt-6 flex flex-col gap-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  {hasUpload ? (
                                    <>
                                      {work.fileUrl && (
                                        <Button variant="outline" size="sm" asChild className="h-8 gap-2">
                                          <a
                                            href={work.submissionType === 'link'
                                              ? (work.fileUrl.match(/^https?:\/\//) || work.fileUrl.match(/^\/\//) ? work.fileUrl : `https://${work.fileUrl}`)
                                              : `${API_BASE_URL}${work.fileUrl}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            {work.submissionType === 'link' ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                                            {work.submissionType === 'link' ? 'View Link' : 'Download File'}
                                          </a>
                                        </Button>
                                      )}

                                      {(user.role === 'client' || user.role === 'admin') && (
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="h-8 gap-2 bg-red-50 text-red-600 hover:bg-red-100 border-red-200 border shadow-none"
                                          onClick={() => {
                                            setSelectedSubmission(work);
                                            setCorrectionText('');
                                            setVoiceFile(null);
                                            setMediaFiles([]);
                                            setShowCorrectionsModal(true);
                                          }}
                                        >
                                          <FileText className="h-3.5 w-3.5" /> Request Changes
                                        </Button>
                                      )}

                                      {!isApproved && (user.role === 'admin' || user.role === 'client') && (
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="h-8 gap-2 bg-green-600 hover:bg-green-700 text-white"
                                          onClick={async () => {
                                            const isConfirmed = await confirm({
                                              title: `Approve ${bd.workType}?`,
                                              message: `Are you sure you want to approve ${bd.workType}? Both admin and client must approve to mark it done.`,
                                              confirmText: 'Approve'
                                            });

                                            if (isConfirmed) {
                                              try {
                                                setIsApprovingWork(bd._id);
                                                setError('');
                                                await workBreakdownAPI.approve(bd._id);
                                                await loadWorkBreakdown();
                                                await loadWorkSubmissions();
                                                await onUpdate();
                                              } catch (e) {
                                                setError(e.response?.data?.message || 'Failed to approve');
                                                showAlert(e.response?.data?.message || 'Failed to approve', 'Error');
                                              } finally {
                                                setIsApprovingWork(null);
                                              }
                                            }
                                          }}
                                          disabled={isApprovingWork === bd._id || hasPendingCorrections}
                                          title={hasPendingCorrections ? "Complete all corrections first" : "Approve this work"}
                                        >
                                          {isApprovingWork === bd._id ? 'Approving...' : <><Check className="h-3.5 w-3.5" /> Approve Work</>}
                                        </Button>
                                      )}

                                      {isApproved && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 h-8 px-3 gap-1">
                                          <Check className="h-3.5 w-3.5" /> Approved
                                        </Badge>
                                      )}
                                    </>
                                  ) : (
                                    <Button variant="secondary" size="sm" disabled className="h-8 opacity-70">
                                      Awaiting Upload
                                    </Button>
                                  )}

                                  {(user.role === 'admin' || user.role === 'client') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 gap-2 ml-auto text-muted-foreground"
                                      onClick={() => focusFeedback(bd._id)}
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" /> Discussion
                                    </Button>
                                  )}
                                </div>

                                {hasUpload && work.workFileUrl && (
                                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md border border-border/50">
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1">
                                          <Upload className="h-3 w-3" /> Source / Work File
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Label htmlFor={`visibility-${work._id}`} className="text-[10px] text-muted-foreground font-normal">Client Access:</Label>
                                        <Switch
                                          id={`visibility-${work._id}`}
                                          checked={work.isWorkFileVisibleToClient}
                                          onCheckedChange={() => handleToggleVisibility(work._id)}
                                          className="h-4 w-8"
                                        />
                                      </div>
                                    </div>
                                    <Button variant="link" size="sm" asChild className="h-auto p-0 text-blue-600">
                                      <a
                                        href={work.workFileUrl.match(/^https?:\/\//) ? work.workFileUrl : (work.workFileUrl.startsWith('/') ? `${API_BASE_URL}${work.workFileUrl}` : `https://${work.workFileUrl}`)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1"
                                      >
                                        {work.workSubmissionType === 'link' || !work.workFileUrl.includes('cloudinary') ? 'Open Link' : 'Download File'}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  </div>
                                )}

                                {/* Editor Message */}
                                {hasUpload && work.editorMessage && (
                                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-md">
                                    <h5 className="text-xs font-bold text-amber-700 uppercase mb-1 flex items-center gap-1">
                                      <FileText className="h-3 w-3" /> Editor's Note
                                    </h5>
                                    <p className="text-sm text-amber-900">{work.editorMessage}</p>
                                  </div>
                                )}
                              </div>

                              {/* Feedback Section */}
                              <div className="mt-6 pt-6 border-t border-border/50">
                                <h4 className="text-sm font-bold text-muted-foreground mb-4 flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" /> Work Feedback & Discussion
                                </h4>

                                <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                  {bd.feedback && bd.feedback.length > 0 ? (
                                    bd.feedback.map((f, i) => (
                                      <div key={i} className={`flex flex-col max-w-[85%] ${f.from?._id === user._id ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1 px-1">
                                          <span className="font-bold">{f.from?.name || 'User'}</span>
                                          <span>{formatDateTime(f.timestamp)}</span>
                                        </div>
                                        <div className={`p-3 rounded-xl text-sm ${f.from?._id === user._id
                                          ? 'bg-primary text-primary-foreground rounded-tr-none'
                                          : 'bg-muted text-foreground rounded-tl-none border'
                                          }`}>
                                          {f.content}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-sm text-muted-foreground italic text-center py-4">No feedback yet.</p>
                                  )}
                                </div>

                                {/* Add Feedback Input */}
                                {(user.role === 'admin' || user.role === 'client') && (
                                  <div className="flex gap-2">
                                    <Input
                                      id={`feedback-input-${bd._id}`}
                                      placeholder="Write your feedback..."
                                      value={feedbackText[bd._id] || ''}
                                      onChange={(e) => setFeedbackText(prev => ({ ...prev, [bd._id]: e.target.value }))}
                                      onKeyPress={(e) => e.key === 'Enter' && handleAddFeedback(bd._id)}
                                      className="flex-1"
                                    />
                                    <Button
                                      size="icon"
                                      onClick={() => handleAddFeedback(bd._id)}
                                      disabled={isSubmittingFeedback === bd._id || !feedbackText[bd._id]?.trim()}
                                    >
                                      {isSubmittingFeedback === bd._id ? <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" /> : <Upload className="h-4 w-4 rotate-90" />}
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Technical Corrections Chat */}
                              {(() => {
                                const allCorrections = getAllCorrectionsForBreakdown(bd._id);
                                return allCorrections.length > 0 && (
                                  <div className="mt-6 pt-6 border-t border-dashed border-border/50">
                                    <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                                      <Flag className="h-4 w-4" /> Technical Corrections
                                    </h4>
                                    <FeedbackChat
                                      corrections={allCorrections}
                                      currentUser={user}
                                      canMarkFixed={true}
                                      markingId={markingFixId}
                                      onMarkFixed={(correctionId) => {
                                        const corr = allCorrections.find(c => c._id === correctionId);
                                        if (corr) handleMarkCorrectionDone(corr.workId, correctionId);
                                      }}
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-4 py-4 border-t mt-6">
            <div className="flex items-center gap-2">
              {user.role === 'client' && !project.clientApproved && (
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={isApprovingProject}
                  onClick={async () => {
                    const isConfirmed = await confirm({
                      title: 'Approve Project',
                      message: 'Are you sure you want to approve this project?',
                      confirmText: 'Approve Project'
                    });

                    if (isConfirmed) {
                      try {
                        setIsApprovingProject(true);
                        await projectsAPI.clientApprove(project._id);
                        await onUpdate();
                        await showAlert('Project approved successfully!', 'Success');
                      } catch (err) {
                        setError(err.response?.data?.message || 'Failed to approve project');
                      } finally {
                        setIsApprovingProject(false);
                      }
                    }
                  }}
                >
                  {isApprovingProject ? 'Approving...' : 'Approve Project'}
                </Button>
              )}

              {user.role === 'admin' && project.clientApproved && project.adminApproved && Math.round(progress) >= 100 && !project.closed && (
                <Button
                  variant="destructive"
                  disabled={isClosingProject}
                  onClick={async () => {
                    const isConfirmed = await confirm({
                      title: 'Close Project',
                      message: 'Are you sure you want to close this project? It will be hidden after 2 days and deleted after 7 days.',
                      confirmText: 'Close Project',
                      isDanger: true
                    });

                    if (isConfirmed) {
                      try {
                        setIsClosingProject(true);
                        await projectsAPI.closeProject(project._id);
                        await onUpdate();
                        await showAlert('Project closed successfully! Notifications sent to client and editors.', 'Success');
                      } catch (err) {
                        setError(err.response?.data?.message || 'Failed to close project');
                      } finally {
                        setIsClosingProject(false);
                      }
                    }
                  }}
                >
                  {isClosingProject ? 'Closing...' : 'Close Project'}
                </Button>
              )}
            </div>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Corrections Dialog */}
      <Dialog open={showCorrectionsModal && !!selectedSubmission} onOpenChange={(open) => !open && setShowCorrectionsModal(false)}>
        <DialogContent className="max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Request Corrections</DialogTitle>
            <DialogDescription>Provide details for the requested changes.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddCorrection} className="space-y-4">
            <div className="space-y-2">
              <Label>Correction Details</Label>
              <Textarea
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                rows={4}
                placeholder="Describe what needs to be fixed..."
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label>Voice Note</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowVoiceRecorder(true)}
                  className="gap-2"
                >
                  <Mic className="h-4 w-4" />
                  {voiceFile ? 'Record New Voice Note' : 'Record Voice Note'}
                </Button>
                {voiceFile && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><Check className="h-3 w-3" /> Voice recorded</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reference Files (Images, Videos)</Label>
              <Input type="file" multiple onChange={handleMediaChange} />
              {mediaFiles.length > 0 && <p className="text-xs text-muted-foreground">{mediaFiles.length} files selected</p>}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmittingCorrection}
                onClick={() => setShowCorrectionsModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingCorrection}>
                {isSubmittingCorrection ? 'Submitting...' : 'Submit Correction Request'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Voice Recorder Modal (Wrapped) */}
      {
        showVoiceRecorder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background rounded-lg shadow-lg border p-1 max-w-md w-full">
              <VoiceRecorder
                onRecordingComplete={handleVoiceRecordingComplete}
                onCancel={() => setShowVoiceRecorder(false)}
              />
            </div>
          </div>
        )
      }

      {/* Work Type Details Modal */}
      {
        showWorkTypeDetails && selectedWorkTypeForDetails && (
          <WorkTypeDetailsModal
            workBreakdown={selectedWorkTypeForDetails}
            onClose={() => {
              setShowWorkTypeDetails(false);
              setSelectedWorkTypeForDetails(null);
            }}
          />
        )
      }
    </>
  );
};

export default ProjectDetailView;

