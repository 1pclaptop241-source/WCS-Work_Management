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
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download, Edit, Check, MessageSquare, FileText, Video, AlertCircle,
  ArrowLeft, Paperclip, Mic, Send, Info, CheckCircle2, Circle
} from 'lucide-react';
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
            <Alert className="bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/10 dark:text-blue-200 dark:border-blue-800">
              <AlertCircle className="h-5 w-5 !text-blue-600 dark:!text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-300 font-semibold">Action Required</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-400">
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
                              statusVariant === 'success' ? 'bg-green-600' :
                                statusVariant === 'warning' ? 'bg-amber-500' :
                                  statusVariant === 'default' ? 'bg-blue-600' : ''
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
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
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

                    let statusBadge;
                    if (!hasUpload) {
                      statusBadge = <Badge variant="secondary">Pending Upload</Badge>;
                    } else if (isApproved) {
                      statusBadge = <Badge className="bg-green-600 hover:bg-green-700">Approved</Badge>;
                    } else if (hasPendingCorrections) {
                      statusBadge = <Badge variant="warning" className="bg-yellow-500 hover:bg-yellow-600 text-white">Needs Revision</Badge>;
                    } else {
                      statusBadge = <Badge className="bg-blue-600 hover:bg-blue-700">Pending Approval</Badge>;
                    }

                    return (
                      <motion.div
                        key={bd._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        layout
                      >
                        <Card className={`overflow-hidden border-l-4 ${isApproved ? 'border-l-green-500' : hasPendingCorrections ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
                          <div className={`h-1 w-full ${isApproved ? 'bg-green-500' : hasPendingCorrections ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                          <CardHeader className="pb-3 pt-5">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <CardTitle className="text-xl">{bd.workType}</CardTitle>
                                <CardDescription className="mt-1">
                                  {hasUpload ? (
                                    <>Latest Submission: <span className="font-medium text-foreground">{formatDate(work.submittedAt)}</span></>
                                  ) : 'Waiting for submission...'}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                {statusBadge}
                                <WorkTypeMenu workBreakdown={bd} onViewDetails={handleViewWorkTypeDetails} />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Instructions */}
                            <div className="space-y-2">
                              <Label className="text-muted-foreground font-semibold">Instructions for Editor:</Label>
                              <div className="flex gap-2 items-start">
                                <Textarea
                                  className="min-h-[80px] resize-y"
                                  placeholder="Add specific instructions for this work item... (visible to Editor and Admin)"
                                  value={instructionsInput[bd._id] !== undefined ? instructionsInput[bd._id] : (bd.clientInstructions || '')}
                                  onChange={(e) => setInstructionsInput(prev => ({ ...prev, [bd._id]: e.target.value }))}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveInstructions(bd._id)}
                                  disabled={isSavingInstructions === bd._id}
                                >
                                  {isSavingInstructions === bd._id ? 'Saving...' : 'Save'}
                                </Button>
                              </div>
                            </div>

                            {/* Approval Status Steps */}
                            {hasUpload && (
                              <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-lg text-sm border">
                                <div className={`flex items-center gap-2 ${adminApproved ? 'text-green-600 font-semibold' : 'text-muted-foreground'}`}>
                                  {adminApproved ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                  <span>Admin Review</span>
                                </div>
                                <div className="h-4 w-[1px] bg-border" />
                                <div className={`flex items-center gap-2 ${clientApproved ? 'text-green-600 font-semibold' : 'text-muted-foreground'}`}>
                                  {clientApproved ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                                  <span>Client Review</span>
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            {hasUpload ? (
                              <div className="space-y-4">
                                <div className="flex flex-wrap gap-3">
                                  <Button className="flex-1 gap-2" variant="outline" onClick={() => handleDownload(work)}>
                                    <Download className="h-4 w-4" />
                                    {work.submissionType === 'link' ? 'View Link' : 'Download File'}
                                  </Button>

                                  <Button
                                    className={`flex-1 gap-2 ${isApproved ? 'bg-muted text-muted-foreground hover:bg-muted' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                                    disabled={isApproved}
                                    onClick={() => {
                                      if (isApproved) return;
                                      setSelectedWork(work);
                                      setCorrectionText('');
                                      setVoiceFile(null);
                                      setMediaFiles([]);
                                      setShowCorrectionsModal(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" /> Request Changes
                                  </Button>
                                </div>

                                {!isApproved && !clientApproved && (
                                  <Button
                                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={async () => {
                                      const isConfirmed = await confirm({
                                        title: `Approve ${bd.workType}?`,
                                        message: `This will mark ${bd.workType} as complete. Are you ready to finalize?`,
                                        confirmText: 'Approve & Finalize'
                                      });

                                      if (isConfirmed) {
                                        try {
                                          setApprovingKey(bd._id);
                                          await workBreakdownAPI.approve(bd._id);
                                          await loadData();
                                          if (onUpdate) onUpdate();
                                        } catch (e) {
                                          setError(e.response?.data?.message || 'Failed to approve');
                                        } finally {
                                          setApprovingKey(null);
                                        }
                                      }
                                    }}
                                    disabled={approvingKey === bd._id || hasPendingCorrections}
                                  >
                                    {approvingKey === bd._id ? 'Finalizing...' : <><Check className="h-4 w-4" /> Approve Work</>}
                                  </Button>
                                )}

                                {work.workFileUrl && work.isWorkFileVisibleToClient && (
                                  <div className="text-center">
                                    <a
                                      href={work.workFileUrl.match(/^https?:\/\//) ? work.workFileUrl : (work.workFileUrl.startsWith('/') ? `${API_BASE_URL}${work.workFileUrl}` : `https://${work.workFileUrl}`)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors underline"
                                    >
                                      {work.workSubmissionType === 'link' || !work.workFileUrl.includes('cloudinary') ? '🔗 Open Source Link' : '📦 Download Source File'}
                                    </a>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-8 text-center bg-muted/30 border border-dashed rounded-lg text-muted-foreground">
                                Editor is working on this task.
                              </div>
                            )}

                            {/* Editor Note */}
                            {hasUpload && work.editorMessage && (
                              <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex gap-3">
                                <span className="text-xl">📝</span>
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Note from Editor:</p>
                                  <p className="text-sm text-foreground">{work.editorMessage}</p>
                                </div>
                              </div>
                            )}

                            {/* Corrections / Chat */}
                            {(() => {
                              const allCorrections = getAllCorrections(bd._id);
                              return (
                                <div className="pt-4 border-t">
                                  <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Technical Corrections & Requests</h4>
                                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
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
                                </div>
                              );
                            })()}

                            {/* Feedback / Discussion */}
                            <div className="pt-4 border-t">
                              <div
                                className="flex items-center gap-2 mb-3 cursor-pointer text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => focusFeedback(bd._id)}
                              >
                                <MessageSquare className="h-4 w-4" />
                                <h4 className="text-sm font-semibold">Discussion</h4>
                                {(!bd.feedback || bd.feedback.length === 0) && <span className="text-xs text-blue-500 font-normal">Add comment</span>}
                              </div>

                              {(bd.feedback && bd.feedback.length > 0) && (
                                <ScrollArea className="h-[200px] w-full rounded-md border p-4 mb-3 bg-muted/20">
                                  {bd.feedback.map((f, i) => (
                                    <div
                                      key={i}
                                      className={`mb-3 p-3 rounded-lg max-w-[85%] text-sm ${f.from?._id === user._id
                                        ? 'ml-auto bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground'
                                        }`}
                                    >
                                      <div className="flex justify-between items-center gap-4 mb-1 text-xs opacity-70">
                                        <span className="font-semibold">{f.from?.name || 'User'}{f.from?._id === user._id && ' (You)'}</span>
                                        <span>{formatDateTime(f.timestamp)}</span>
                                      </div>
                                      <p className="whitespace-pre-wrap">{f.content}</p>
                                    </div>
                                  ))}
                                </ScrollArea>
                              )}

                              <div className="flex gap-2">
                                <Input
                                  id={`feedback-input-${bd._id}`}
                                  placeholder="Write a comment..."
                                  value={feedbackText[bd._id] || ''}
                                  onChange={(e) => setFeedbackText(prev => ({ ...prev, [bd._id]: e.target.value }))}
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddFeedback(bd._id)}
                                  className="rounded-full"
                                />
                                <Button
                                  size="icon"
                                  className="rounded-full shrink-0"
                                  onClick={() => handleAddFeedback(bd._id)}
                                  disabled={isSubmittingFeedback === bd._id || !feedbackText[bd._id]?.trim()}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Corrections Modal */}
      <Dialog open={showCorrectionsModal} onOpenChange={setShowCorrectionsModal}>
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
      </Dialog>

      {/* Voice Recorder Modal */}
      <Dialog open={showVoiceRecorder} onOpenChange={setShowVoiceRecorder}>
        <DialogContent className="sm:max-w-md">
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Work Type Details Modal */}
      {showWorkTypeDetails && selectedWorkTypeForDetails && (
        <WorkTypeDetailsModal
          workBreakdown={selectedWorkTypeForDetails}
          onClose={() => {
            setShowWorkTypeDetails(false);
            setSelectedWorkTypeForDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkView;
