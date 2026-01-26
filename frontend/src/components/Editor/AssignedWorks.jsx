import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../../utils/formatDate';
import { projectsAPI, worksAPI, workBreakdownAPI } from '../../services/api';
import WorkTypeMenu from '../common/WorkTypeMenu';
import WorkTypeDetailsModal from '../common/WorkTypeDetailsModal';
import EditorNotesModal from './EditorNotesModal';
import VersionHistoryModal from '../common/VersionHistoryModal';
import { useDialog } from '../../context/DialogContext';

import {
  Clock, CheckCircle, Upload, MoreVertical,
  Flag, Calculator, CalendarDays, Ban, Play, StickyNote, FileText,
  AlertCircle, History, MessageSquare, Loader2
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// Deadline Countdown Component
const DeadlineCountdown = ({ deadline, createdAt, deadlineInfo }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const difference = deadlineDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const getDisplayText = () => {
    if (deadlineInfo.status === 'overdue' || (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0)) {
      return "Deadline crossed";
    }

    if (timeLeft.days > 0) {
      return `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;
    } else if (timeLeft.hours > 0) {
      return `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`;
    } else if (timeLeft.minutes > 0) {
      return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
    } else {
      return `${timeLeft.seconds}s`;
    }
  };

  const getTimeLeftPercentage = () => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const createdDate = new Date(createdAt);

    if (now >= deadlineDate) return 0;
    if (now <= createdDate) return 100;

    const totalDuration = deadlineDate - createdDate;
    const remaining = deadlineDate - now;

    return Math.min(100, Math.max(0, (remaining / totalDuration) * 100));
  };

  const isOverdue = deadlineInfo.status === 'overdue' || (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0);
  const timeLeftPercentage = getTimeLeftPercentage();

  // Map custom colors to Tailwind classes approx
  let colorClass = "bg-primary";
  if (isOverdue) colorClass = "bg-destructive";
  else if (deadlineInfo.status === "urgent") colorClass = "bg-amber-500";
  else colorClass = "bg-emerald-500";

  // Custom Styles for Progress color as shadcn Progress doesn't support color prop directly easily without class override
  // But we can use style for dynamic width and className for color

  return (
    <div className="bg-muted/50 p-3 rounded-lg border">
      <div className="flex justify-between items-center mb-2">
        <span className={`font-mono font-bold text-sm tracking-widest ${isOverdue ? 'text-destructive' : (deadlineInfo.status === 'urgent' ? 'text-amber-600' : 'text-emerald-600')}`}>
          {getDisplayText()}
        </span>
      </div>

      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase">Time Left</span>
        <span className={`text-[10px] font-bold ${isOverdue ? 'text-destructive' : (deadlineInfo.status === 'urgent' ? 'text-amber-600' : 'text-emerald-600')}`}>
          {Math.round(timeLeftPercentage)}%
        </span>
      </div>
      <Progress value={isOverdue ? 100 : timeLeftPercentage} className={`h-2 [&>div]:${colorClass}`} />
    </div>
  );
};

// Priority Star Component
const PriorityStar = ({ priority, onClick }) => {
  const getStarColor = () => {
    switch (priority) {
      case 'high': return 'text-amber-400 fill-amber-400';
      case 'medium': return 'text-muted-foreground/40 fill-muted-foreground/40';
      case 'low': return 'text-muted-foreground/20 fill-muted-foreground/20';
      default: return 'text-muted-foreground/40 fill-muted-foreground/40';
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:bg-transparent"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`Priority: ${priority}`}
    >
      <Flag className={`h-5 w-5 ${getStarColor()} transition-colors`} />
    </Button>
  );
};

const AssignedWorks = ({ onUpdate }) => {
  const navigate = useNavigate();
  const { confirm, showAlert } = useDialog();
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('pending'); // all, pending, completed
  const [showWorkTypeDetails, setShowWorkTypeDetails] = useState(false);
  const [selectedWorkTypeForDetails, setSelectedWorkTypeForDetails] = useState(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedWorkForNotes, setSelectedWorkForNotes] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedWorkForHistory, setSelectedWorkForHistory] = useState(null);


  const handleWorkSelect = (workBreakdown) => {
    navigate(`/editor/upload-work/${workBreakdown._id}`);
  };

  const getDeadlineStatus = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;
    const daysUntil = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (diff <= 0) {
      return { status: 'overdue', days: Math.abs(daysUntil), className: 'text-destructive', color: '#dc3545' };
    } else if (daysUntil <= 3) {
      return { status: 'urgent', days: daysUntil, className: 'text-amber-600', color: '#ffc107' };
    } else {
      return { status: 'normal', days: daysUntil, className: 'text-emerald-600', color: '#28a745' };
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await worksAPI.getAssignedBreakdowns();
      setWorks(response.data);
    } catch (error) {
      console.error('Failed to load works:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [onUpdate]);

  // Check for approved works to trigger celebration
  useEffect(() => {
    const approvedWorks = works.filter(w =>
      w.approvals?.admin && w.approvals?.client
    );

    if (approvedWorks.length > 0) {
      // Small celebration on load if there are approved works
    }
  }, [works]);


  const [processingId, setProcessingId] = useState(null);

  const handlePriorityToggle = async (work) => {
    const priorities = ['low', 'medium', 'high'];
    const currentIdx = priorities.indexOf(work.priority || 'medium');
    const newPriority = priorities[(currentIdx + 1) % priorities.length];

    try {
      setProcessingId(work._id + '-priority');
      await worksAPI.updateDetails(work._id, undefined, newPriority);
      loadData(); // Reload to reflect changes and re-sort
    } catch (err) {
      console.error('Failed to update priority', err);
      showAlert(err.response?.data?.message || 'Failed to update priority', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleStartWorking = async (work) => {
    try {
      setProcessingId(work._id + '-status');
      await worksAPI.updateStatus(work._id, 'in_progress');
      loadData();
    } catch (err) {
      console.error('Failed to start working', err);
      showAlert(err.response?.data?.message || 'Failed to start working', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenNotes = (work) => {
    setSelectedWorkForNotes(work);
    setShowNotesModal(true);
  };

  const handleSaveNotes = async (workId, notes) => {
    try {
      setProcessingId(workId + '-notes');
      await worksAPI.updateDetails(workId, notes, undefined);
      loadData();
    } catch (err) {
      console.error('Failed to save notes', err);
      showAlert(err.response?.data?.message || 'Failed to save notes', 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenHistory = (work) => {
    setSelectedWorkForHistory(work);
    setShowHistoryModal(true);
  };

  const handleDeclineWork = async (work) => {
    // Calculate if decline is allowed
    const canDecline = () => {
      if (!work.createdAt || !work.deadline) return true; // Fallback

      const created = new Date(work.createdAt).getTime();
      const deadline = new Date(work.deadline).getTime();
      const now = Date.now();
      const totalDuration = deadline - created;
      const timeRemaining = deadline - now;

      if (timeRemaining <= 0) return false; // Overdue
      if (totalDuration <= 0) return true; // Weird case

      // Check if more than 80% time remains
      const percentageRemaining = timeRemaining / totalDuration;
      return percentageRemaining >= 0.8;
    };

    if (!canDecline()) {
      showAlert("Cannot decline when less than 80% of time remains.", "Warning");
      return;
    }

    const isConfirmed = await confirm({
      title: 'Decline Work',
      message: `Are you sure you want to decline "${work.workType}" for project "${work.project?.title}"? This action cannot be undone.`,
      confirmText: 'Decline',
      isDanger: true
    });

    if (isConfirmed) {
      try {
        await workBreakdownAPI.decline(work._id);
        await showAlert('Work declined successfully.', 'Success');
        loadData(); // Refresh list
      } catch (err) {
        console.error('Failed to decline work:', err);
        await showAlert(err.response?.data?.message || 'Failed to decline work', 'Error');
      }
    }
  };

  const filteredWorks = works.filter(work => {
    // Basic filter: Don't show work that is already paid/settled
    if (work.isPaid) return false;

    const matchesStatus = filterStatus === 'all' ? true : (filterStatus === 'pending' ? !work.approved : work.approved);
    return matchesStatus;
  })
    // Sort by priority (high > medium > low) then deadline
    .sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      const pA = priorityMap[a.priority || 'medium'];
      const pB = priorityMap[b.priority || 'medium'];
      if (pA !== pB) return pB - pA;
      return new Date(a.deadline) - new Date(b.deadline);
    });

  const handleViewWorkTypeDetails = (workBreakdown) => {
    setSelectedWorkTypeForDetails(workBreakdown);
    setShowWorkTypeDetails(true);
  };

  const stats = {
    total: works.filter(w => !w.isPaid).length,
    pending: works.filter(w => !w.isPaid && !w.approved).length, // Tasks not approved by both client and admin
    completed: works.filter(w => !w.isPaid && w.approved).length, // Tasks approved but not yet paid
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${filterStatus === 'pending' ? 'border-primary ring-1 ring-primary' : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Pending</div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${filterStatus === 'completed' ? 'border-primary ring-1 ring-primary' : ''}`}
          onClick={() => setFilterStatus('completed')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{stats.completed}</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Completed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Works Grid */}
      {filteredWorks.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <CardContent className="flex flex-col items-center gap-4">
            <Upload className="h-16 w-16 opacity-20" />
            <h3 className="text-xl font-semibold text-foreground">No {filterStatus !== 'all' ? filterStatus.replace('_', ' ') : ''} works found</h3>
            <p>{filterStatus === 'all' ? 'You don\'t have any assigned works yet.' : `You don't have any ${filterStatus.replace('_', ' ')} works.`}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredWorks.map((work) => {
            const deadlineInfo = getDeadlineStatus(work.deadline);
            const isDeclined = work.status === 'declined';

            return (
              <Card
                key={work._id}
                className={`flex flex-col overflow-hidden transition-all hover:shadow-lg ${isDeclined ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1 hover:border-primary/50'}`}
                onClick={() => !isDeclined && handleWorkSelect(work)}
              >
                <CardHeader className="p-5 pb-3 bg-muted/20 border-b relative">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg leading-tight line-clamp-1" title={work.project?.title}>{work.project?.title}</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="default" className="bg-primary/90 hover:bg-primary text-[10px]">{work.workType}</Badge>

                        {/* Notes Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); handleOpenNotes(work); }}
                          title="My Notes"
                        >
                          {work.editorNotes ? <StickyNote className="h-4 w-4 text-amber-500 fill-amber-500" /> : <StickyNote className="h-4 w-4" />}
                        </Button>

                        {/* Version Badge */}
                        {work.submissionStats?.latestVersion > 0 && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1 bg-background">v{work.submissionStats.latestVersion}</Badge>
                        )}

                        {/* History Button */}
                        {work.submissionStats?.submissionCount > 0 && (
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6 text-blue-500 hover:text-blue-600"
                            onClick={(e) => { e.stopPropagation(); handleOpenHistory(work); }}
                            title="View History"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {!isDeclined && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewWorkTypeDetails(work); }}>
                            <FileText className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); handleDeclineWork(work); }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Ban className="mr-2 h-4 w-4" /> Decline Work
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-5 flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PriorityStar priority={work.priority || 'medium'} onClick={() => !isDeclined && handlePriorityToggle(work)} />
                      <span className="text-xs font-medium text-muted-foreground uppercase">{work.priority || 'medium'}</span>
                    </div>
                    {/* Status Badge */}
                    {(() => {
                      const stats = work.submissionStats;
                      let label = work.status;
                      let variant = "secondary";
                      let icon = null;

                      if (work.status === 'declined') { label = 'Declined'; variant = "destructive"; }
                      else if (work.approved) { label = 'Approved'; variant = "default"; icon = <CheckCircle className="h-3 w-3 mr-1" />; } // Use default/success style
                      else if (stats?.needsResubmission && stats?.pendingCorrections > 0) { label = 'Needs Revision'; variant = "warning"; icon = <AlertCircle className="h-3 w-3 mr-1" />; }
                      else if (stats?.hasSubmission) { label = 'Under Review'; variant = "secondary"; icon = <Clock className="h-3 w-3 mr-1" />; }
                      else if (work.status === 'in_progress') { label = 'In Progress'; variant = "outline"; icon = <Loader2 className="h-3 w-3 mr-1 animate-spin" />; }
                      else if (work.status === 'pending') { label = 'Assigned'; variant = "secondary"; }

                      return <Badge variant={variant} className={`flex items-center ${work.status === 'in_progress' ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200' : ''} ${work.approved ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' : ''}`}>
                        {icon} {label}
                      </Badge>;
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/40 rounded-lg border flex flex-col items-center justify-center text-center gap-1">
                      <span className="text-emerald-500"><Calculator className="h-5 w-5" /></span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Payment</span>
                      <span className="text-sm font-bold">{work.project?.currency || 'INR'} {work.amount?.toFixed(2)}</span>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-lg border flex flex-col items-center justify-center text-center gap-1">
                      <span className="text-destructive"><CalendarDays className="h-5 w-5" /></span>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deadline</span>
                      <span className="text-sm font-bold">{formatDateTime(work.deadline)}</span>
                    </div>
                  </div>

                  {!work.approved && (
                    <DeadlineCountdown
                      deadline={work.deadline}
                      createdAt={work.createdAt}
                      deadlineInfo={deadlineInfo}
                    />
                  )}

                </CardContent>

                {!isDeclined && (
                  <CardFooter className="p-4 bg-muted/20 border-t gap-3">
                    {work.status !== 'in_progress' && work.status !== 'completed' && !work.approved && (
                      <Button
                        className="flex-1" // Use standard button
                        disabled={processingId === work._id + '-status'}
                        onClick={(e) => { e.stopPropagation(); handleStartWorking(work); }}
                      >
                        {processingId === work._id + '-status' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                        Start
                      </Button>
                    )}
                    <Button
                      variant={work.status === 'in_progress' ? "default" : "secondary"}
                      className="flex-1"
                      onClick={(e) => { e.stopPropagation(); handleWorkSelect(work); }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {work.submissionStats?.hasSubmission ? 'View Work' : 'Upload'}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )
      }

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

      {
        showNotesModal && selectedWorkForNotes && (
          <EditorNotesModal
            workBreakdown={selectedWorkForNotes}
            onClose={() => {
              setShowNotesModal(false);
              setSelectedWorkForNotes(null);
            }}
            onSave={handleSaveNotes}
          />
        )
      }

      {
        showHistoryModal && selectedWorkForHistory && (
          <VersionHistoryModal
            workBreakdown={selectedWorkForHistory}
            onClose={() => {
              setShowHistoryModal(false);
              setSelectedWorkForHistory(null);
            }}
          />
        )
      }
    </div >
  );
};

export default AssignedWorks;
