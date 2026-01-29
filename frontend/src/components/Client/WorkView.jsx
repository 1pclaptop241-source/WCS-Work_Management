import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { worksAPI, workBreakdownAPI, API_BASE_URL } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import ProjectDetails from './ProjectDetails';
import VoiceRecorder from '../common/VoiceRecorder';
import WorkTypeMenu from '../common/WorkTypeMenu';
import WorkTypeDetailsModal from '../common/WorkTypeDetailsModal';
import FeedbackChat from '../common/FeedbackChat';
import DiscussionChat from '../common/DiscussionChat';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Edit, Check, MessageSquare, FileText, Video, AlertCircle,
  ArrowLeft, Paperclip, Mic, Send, Info, MoreVertical,
  MessageCircle,
  AlertTriangle, Clock, CheckCircle2, Circle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const WorkView = ({ project, onBack, onUpdate }) => {
  const { user } = useAuth();
  const { confirm, showAlert } = useDialog();
  const [breakdowns, setBreakdowns] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWork, setSelectedWork] = useState(null);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
  const [approvingKey, setApprovingKey] = useState(null);
  const [showWorkTypeDetails, setShowWorkTypeDetails] = useState(false);
  const [selectedWorkTypeForDetails, setSelectedWorkTypeForDetails] = useState(null);
  const [feedbackText, setFeedbackText] = useState({});
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(null);

  // New state for corrections
  const [correctionText, setCorrectionText] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);

  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [instructionsInput, setInstructionsInput] = useState({});
  const [isSavingInstructions, setIsSavingInstructions] = useState(null);

  // Redesign state
  const [expandedSection, setExpandedSection] = useState({ workId: null, section: null });

  // Discussion state (placeholder)
  const [discussionText, setDiscussionText] = useState('');

  useEffect(() => {
    loadData();
  }, [project]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [bdResponse, worksResponse] = await Promise.all([
        workBreakdownAPI.getByProject(project._id),
        worksAPI.getByProject(project._id)
      ]);
      setBreakdowns(bdResponse.data);
      setSubmissions(worksResponse.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (workId, sectionName) => {
    if (expandedSection.workId === workId && expandedSection.section === sectionName) {
      setExpandedSection({ workId: null, section: null });
    } else {
      setExpandedSection({ workId, section: sectionName });
    }
  };

  const handleDownload = (work) => {
    if (!work || !work.fileUrl) return;
    let fileUrl = work.fileUrl;

    if (work.submissionType === 'link') {
      if (!fileUrl.match(/^https?:\/\//) && !fileUrl.match(/^\/\//)) {
        fileUrl = 'https://' + fileUrl;
      }
    } else {
      if (!fileUrl.startsWith('http') && !fileUrl.startsWith('//')) {
        fileUrl = `${API_BASE_URL}${work.fileUrl}`;
      }
    }
    window.open(fileUrl, '_blank');
  };

  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [markingFixId, setMarkingFixId] = useState(null);

  const handleSubmitCorrections = async (e) => {
    e.preventDefault();
    if (!selectedWork) return;

    if (!correctionText.trim() && !voiceFile && mediaFiles.length === 0) {
      await showAlert("Please provide some correction details (text, voice, or media).", "Validation Error");
      return;
    }

    try {
      setSubmittingCorrection(true);
      setError('');
      await worksAPI.addCorrections(selectedWork._id, correctionText, voiceFile, mediaFiles);
      setShowCorrectionsModal(false);
      setSelectedWork(null);
      setCorrectionText('');
      setVoiceFile(null);
      setMediaFiles([]);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit corrections');
      showAlert(err.response?.data?.message || 'Failed to submit corrections', 'Error');
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleVoiceRecordingComplete = (audioBlob) => {
    setVoiceFile(audioBlob);
    setShowVoiceRecorder(false);
  };

  const handleMediaChange = (e) => {
    setMediaFiles(Array.from(e.target.files));
  };

  const handleMarkCorrectionDone = async (workId, correctionId) => {
    try {
      setMarkingFixId(correctionId);
      setError('');
      await worksAPI.markCorrectionDone(workId, correctionId);
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to mark correction as done');
      showAlert(err.response?.data?.message || 'Failed to mark correction as done', 'Error');
    } finally {
      setMarkingFixId(null);
    }
  };

  const handleEditCorrection = async (workId, correctionId, newText) => {
    try {
      await worksAPI.editCorrection(workId, correctionId, newText);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to edit correction');
      showAlert(err.response?.data?.message || 'Failed to edit correction', 'Error');
    }
  };

  const handleAddFeedback = async (workBreakdownId) => {
    const text = feedbackText[workBreakdownId];
    if (!text || !text.trim()) return;

    try {
      setIsSubmittingFeedback(workBreakdownId);
      await workBreakdownAPI.addFeedback(workBreakdownId, text);
      setFeedbackText(prev => ({ ...prev, [workBreakdownId]: '' }));
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add feedback');
      showAlert(err.response?.data?.message || 'Failed to add feedback', 'Error');
    } finally {
      setIsSubmittingFeedback(null);
    }
  };

  const handleSaveInstructions = async (workBreakdownId) => {
    const text = instructionsInput[workBreakdownId];
    if (text === undefined) return;

    try {
      setIsSavingInstructions(workBreakdownId);
      await workBreakdownAPI.update(workBreakdownId, { clientInstructions: text });
      await loadData();
      await showAlert('Instructions saved', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save instructions');
    } finally {
      setIsSavingInstructions(null);
    }
  };

  const focusFeedback = (bdId) => {
    const input = document.getElementById(`feedback-input-${bdId}`);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  const getLatestSubmission = (breakdownId) => {
    return submissions.filter(s => s.workBreakdown === breakdownId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
  };

  const getAllSubmissions = (breakdownId) => {
    return submissions.filter(s => s.workBreakdown === breakdownId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  };

  const getAllCorrections = (breakdownId) => {
    const allSubs = getAllSubmissions(breakdownId);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onBack} title="Back to Projects" className="shrink-0 rounded-full h-10 w-10">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold truncate flex-1 text-primary">{project.title}</h2>
      </div>

      {/* Action Banner */}
      {(() => {
        const needsReview = breakdowns.some(bd => {
          const work = getLatestSubmission(bd._id);
          return work && !bd.approvals?.client;
        });

        if (needsReview) {
          return (
            <Alert className="bg-blue-50/50 border-blue-200 text-primary dark:bg-primary/10 dark:text-primary-foreground dark:border-primary/20">
              <AlertCircle className="h-5 w-5 text-primary" />
              <AlertTitle className="text-primary font-semibold">Action Required</AlertTitle>
              <AlertDescription className="text-foreground/80">
                You have items ready for review. Please check the "Pending Approval" items below.
              </AlertDescription>
            </Alert>
          );
        }
        return null;
      })()}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {/* Progress Section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium">Work Completion</CardTitle>
              <span className="text-sm font-bold text-primary">
                {(() => {
                  const totalPct = breakdowns.reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
                  const donePct = breakdowns
                    .filter(w => w.approvals?.admin && w.approvals?.client)
                    .reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
                  const progress = totalPct > 0 ? (donePct / totalPct) * 100 : 0;
                  return Math.round(progress);
                })()}%
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={(() => {
              const totalPct = breakdowns.reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
              const donePct = breakdowns
                .filter(w => w.approvals?.admin && w.approvals?.client)
                .reduce((sum, w) => sum + (parseFloat(w.percentage) || 0), 0);
              return totalPct > 0 ? (donePct / totalPct) * 100 : 0;
            })()} className="h-3" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="board" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="board">Task Board</TabsTrigger>
          <TabsTrigger value="list">Task List</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <ProjectDetails project={project} onUpdate={onUpdate} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-6 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <FileText className="h-5 w-5" /> Work Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Work Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latest Update</TableHead>
                    <TableHead>Approved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdowns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No work breakdown defined
                      </TableCell>
                    </TableRow>
                  ) : (
                    breakdowns.map((bd) => {
                      const work = getLatestSubmission(bd._id);
                      const hasUpload = !!work;
                      const hasPendingCorrections = getAllCorrections(bd._id).some(c => !c.done);
                      const adminApproved = bd.approvals?.admin || false;
                      const clientApproved = bd.approvals?.client || false;
                      const isApproved = adminApproved && clientApproved;

                      let statusText, statusVariant;
                      if (isApproved) {
                        statusText = 'Completed';
                        statusVariant = 'success';
                      } else if (hasPendingCorrections) {
                        statusText = 'Needs Revision';
                        statusVariant = 'warning';
                      } else if (hasUpload) {
                        statusText = 'Under Review';
                        statusVariant = 'default';
                      } else {
                        statusText = 'Pending';
                        statusVariant = 'secondary';
                      }

                      return (
                        <TableRow key={bd._id}>
                          <TableCell className="font-medium">{bd.workType}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant} className={
                              statusVariant === 'success' ? 'bg-success hover:bg-success/90' :
                                statusVariant === 'warning' ? 'bg-warning hover:bg-warning/90 text-warning-foreground' :
                                  statusVariant === 'default' ? 'bg-primary hover:bg-primary/90' : ''
                            }>
                              {statusText}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {hasUpload ? formatDate(work.submittedAt) : <span className="text-muted-foreground italic">Waiting...</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 opacity-90">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground w-10">Client</span>
                              {clientApproved ? (
                                <CheckCircle2 className="h-3 w-3 text-success" />
                              ) : (
                                <Circle className="h-3 w-3 text-muted-foreground/50" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Project Work Items</h3>
              </div>

              {loading ? (
                <div className="flex justify-center p-8 text-muted-foreground">Loading work items...</div>
              ) : breakdowns.length === 0 ? (
                <Card><CardContent className="p-6 text-center text-muted-foreground">No work breakdown defined.</CardContent></Card>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence>
                    {breakdowns.map((bd, index) => {
                      const work = getLatestSubmission(bd._id);
                      const hasUpload = !!work;

                      const hasPendingCorrections = getAllCorrections(bd._id).some(c => !c.done);
                      const adminApproved = bd.approvals?.admin || false;
                      const clientApproved = bd.approvals?.client || false;
                      const isApproved = adminApproved && clientApproved;
                      const isExpanded = expandedSection.workId === bd._id;
                      const activeSection = isExpanded ? expandedSection.section : null;

                      let statusBadge;
                      if (!hasUpload) {
                        statusBadge = <Badge variant="secondary">Pending Upload</Badge>;
                      } else if (isApproved) {
                        statusBadge = <Badge className="bg-success hover:bg-success/90">Approved</Badge>;
                      } else if (hasPendingCorrections) {
                        statusBadge = <Badge variant="warning" className="bg-warning hover:bg-warning/90 text-warning-foreground">Needs Revision</Badge>;
                      } else {
                        statusBadge = <Badge className="bg-primary hover:bg-primary/90">Pending Approval</Badge>;
                      }

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          key={bd._id}
                          className="mb-4"
                        >
                          <Card>
                            <CardContent className="p-6">
                              <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-lg">{bd.workType}</h4>
                                  <div className="flex items-center gap-2">
                                    {statusBadge}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => toggleSection(bd._id, 'corrections')}>
                                          <AlertTriangle className="h-4 w-4 mr-2" /> Corrections
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toggleSection(bd._id, 'discussion')}>
                                          <MessageCircle className="h-4 w-4 mr-2" /> Discussion
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <span className="font-medium text-foreground">Deadline:</span> {new Date(bd.deadline).toLocaleDateString()}
                                </div>

                                {/* Expandable Sections */}
                                {isExpanded && (
                                  <div className="mt-4 border-t pt-4 animate-accordion-down">
                                    {/* SECTION: CORRECTIONS */}
                                    {activeSection === 'corrections' && (
                                      <div className="mb-4">
                                        {(() => {
                                          const allCorrections = getAllCorrections(bd._id);
                                          return (
                                            <FeedbackChat
                                              corrections={allCorrections}
                                              currentUser={user}
                                              canMarkFixed={false}
                                              onClose={() => setExpandedSection({ workId: null, section: null })}
                                              workId={work?._id}
                                              onAddCorrection={async (text, voice, media) => {
                                                if (!work) return;
                                                await worksAPI.addCorrections(work._id, text, voice, media);
                                                await loadData();
                                              }}
                                            />
                                          );
                                        })()}
                                      </div>
                                    )}

                                    {/* SECTION: DISCUSSION */}
                                    {activeSection === 'discussion' && (
                                      <div className="mb-4">
                                        <DiscussionChat
                                          workId={bd._id}
                                          initialMessages={bd.discussion || []}
                                          onClose={() => setExpandedSection({ workId: null, section: null })}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div >
              )}
            </div >
          </div >
        </TabsContent >
      </Tabs >

      {/* Corrections Modal */}
      < Dialog open={showCorrectionsModal} onOpenChange={setShowCorrectionsModal} >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Request Changes / Feedback</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitCorrections} id="corrections-form" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="correction-text">What would you like to change?</Label>
              <Textarea
                id="correction-text"
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                rows={5}
                placeholder="E.g., Please adjust the timing of the transition..."
              />
            </div>

            <div className="space-y-2">
              <Label>Voice Note</Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="secondary" onClick={() => setShowVoiceRecorder(true)} className="gap-2">
                  <Mic className="h-4 w-4" />
                  {voiceFile ? 'Record New Voice Note' : 'Record Voice Note'}
                </Button>
                {voiceFile && <span className="text-sm text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Voice recorded</span>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="media-files">Reference Files (Images, Videos)</Label>
              <Input
                id="media-files"
                type="file"
                multiple
                onChange={handleMediaChange}
                className="cursor-pointer"
              />
              {mediaFiles.length > 0 && <p className="text-xs text-muted-foreground">{mediaFiles.length} files selected</p>}
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCorrectionsModal(false)} disabled={submittingCorrection}>Cancel</Button>
            <Button type="submit" form="corrections-form" disabled={submittingCorrection}>
              {submittingCorrection ? 'Sending...' : 'Send Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Voice Recorder Modal */}
      < Dialog open={showVoiceRecorder} onOpenChange={setShowVoiceRecorder} >
        <DialogContent className="sm:max-w-md">
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </DialogContent>
      </Dialog >

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
    </div >
  );
};

export default WorkView;
