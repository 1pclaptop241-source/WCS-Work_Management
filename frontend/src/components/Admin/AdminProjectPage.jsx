import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, workBreakdownAPI, worksAPI, usersAPI, API_BASE_URL } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import VoiceRecorder from '../common/VoiceRecorder'; // Legacy component, might need refactor or kept as is
import WorkTypeMenu from '../common/WorkTypeMenu';
import WorkTypeDetailsModal from '../common/WorkTypeDetailsModal';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ArrowLeft,
    Download,
    ExternalLink,
    FileText,
    Pencil,
    MessageSquare,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Clock,
    Upload,
    Mic,
    Paperclip
} from 'lucide-react';

const AdminProjectPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { confirm, showAlert } = useDialog();

    const [project, setProject] = useState(null);
    const [workBreakdown, setWorkBreakdown] = useState([]);
    const [workSubmissions, setWorkSubmissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
    const [correctionText, setCorrectionText] = useState('');
    const [voiceFile, setVoiceFile] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [showWorkTypeDetails, setShowWorkTypeDetails] = useState(false);
    const [selectedWorkTypeForDetails, setSelectedWorkTypeForDetails] = useState(null);
    const [editors, setEditors] = useState([]);
    const [editingWork, setEditingWork] = useState(null);
    const [editFormData, setEditFormData] = useState({ assignedEditor: '', deadline: '', amount: '', shareDetails: '', links: [{ title: '', url: '' }] });
    const [feedbackText, setFeedbackText] = useState({});
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(null);
    const [adminInstructionsInput, setAdminInstructionsInput] = useState({});
    const [isSavingAdminInstructions, setIsSavingAdminInstructions] = useState(null);

    useEffect(() => {
        loadProject();
        loadWorkBreakdown();
        loadEditors();
    }, [projectId]);

    useEffect(() => {
        if (workBreakdown.length > 0) {
            loadWorkSubmissions();
        }
    }, [workBreakdown]);

    const loadProject = async () => {
        try {
            const response = await projectsAPI.getById(projectId);
            setProject(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load project');
        }
    };

    const loadWorkBreakdown = async () => {
        try {
            setLoading(true);
            const response = await workBreakdownAPI.getByProject(projectId);
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

    const loadEditors = async () => {
        try {
            const response = await usersAPI.getEditors();
            setEditors(response.data);
        } catch (err) {
            console.error('Failed to load editors:', err);
        }
    };

    const handleEditClick = (work) => {
        setEditingWork(work);

        // Format date for datetime-local input (YYYY-MM-DDTHH:mm)
        let deadlineStr = '';
        if (work.deadline) {
            const date = new Date(work.deadline);
            const tzoffset = date.getTimezoneOffset() * 60000;
            deadlineStr = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
        }

        setEditFormData({
            assignedEditor: work.assignedEditor?._id || work.assignedEditor,
            deadline: deadlineStr,
            amount: work.amount,
            shareDetails: work.shareDetails || '',
            links: work.links && work.links.length > 0 ? work.links : [{ title: '', url: '' }]
        });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...editFormData,
                deadline: new Date(editFormData.deadline).toISOString()
            };
            await workBreakdownAPI.update(editingWork._id, payload);
            setEditingWork(null);
            loadWorkBreakdown();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update work breakdown');
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
        }
    };

    const handleSaveAdminInstructions = async (workBreakdownId) => {
        const text = adminInstructionsInput[workBreakdownId];
        if (text === undefined) return;

        try {
            setIsSavingAdminInstructions(workBreakdownId);
            await workBreakdownAPI.update(workBreakdownId, { adminInstructions: text });
            await showAlert('Admin instructions saved', 'Success');
            await loadWorkBreakdown();
        } catch (err) {
            console.error(err);
            showAlert('Failed to save instructions', 'Error');
        } finally {
            setIsSavingAdminInstructions(null);
        }
    };

    const handleToggleVisibility = async (workId) => {
        try {
            await worksAPI.toggleWorkFileVisibility(workId);
            await loadWorkSubmissions();
        } catch (err) {
            console.error('Failed to toggle visibility:', err);
            showAlert('Failed to toggle visibility', 'Error');
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

    const handleViewWorkTypeDetails = (workBreakdown) => {
        setSelectedWorkTypeForDetails(workBreakdown);
        setShowWorkTypeDetails(true);
    };

    const getAllCorrectionsForBreakdown = (breakdownId) => {
        const submissions = workSubmissions[breakdownId] || [];
        const sortedSubs = submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        const allCorrections = [];
        sortedSubs.forEach(sub => {
            if (sub.corrections && sub.corrections.length > 0) {
                sub.corrections.forEach(corr => {
                    allCorrections.push({ ...corr, workId: sub._id });
                });
            }
        });
        return allCorrections;
    };

    if (loading || !project) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    const progress = calculateProgress();

    return (
        <div className="container mx-auto p-4 md:p-8 pt-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={() => navigate('/admin/dashboard')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight truncate">{project.title}</h1>
                        <Badge variant="outline" className="uppercase text-xs font-semibold">{project.status.replace('_', ' ')}</Badge>
                    </div>
                </div>
            </div>

            {error && <div className="p-4 text-destructive bg-destructive/10 rounded-lg">{error}</div>}

            <div className="grid gap-6 md:grid-cols-3">
                {/* Left Column: Info & Progress */}
                <div className="space-y-6 md:col-span-1">
                    {/* Project Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="grid gap-1">
                                <span className="font-semibold text-muted-foreground">Client</span>
                                <div>{project.client?.name}</div>
                                <div className="text-xs text-muted-foreground">{project.client?.email}</div>
                            </div>
                            <Separator />
                            <div className="grid gap-1">
                                <span className="font-semibold text-muted-foreground">Description</span>
                                <p className="whitespace-pre-wrap">{project.description}</p>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="font-semibold text-muted-foreground">Amount</span>
                                <span>{project.currency} {project.amount?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold text-muted-foreground">Deadline</span>
                                <span>{formatDateTime(project.deadline)}</span>
                            </div>
                            {project.rawFootageLinks?.length > 0 && (
                                <div className="grid gap-2 pt-2">
                                    <span className="font-semibold text-muted-foreground">Raw Footage</span>
                                    <ul className="list-disc list-inside space-y-1">
                                        {project.rawFootageLinks.map((link, i) => (
                                            <li key={i}>
                                                <a href={link.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate inline-block max-w-[200px] align-bottom">
                                                    {link.title || link.url}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Progress */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm font-medium">
                                <span>Completion</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Work Breakdown & Items */}
                <div className="space-y-6 md:col-span-2">
                    {/* Work Status Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Work Breakdown Status</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Editor</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Deadline</TableHead>
                                        <TableHead className="text-right">Aprvl</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workBreakdown.map((work) => {
                                        const submissions = workSubmissions[work._id] || [];
                                        const hasSubmission = submissions.length > 0;
                                        const adminApproved = work.approvals?.admin || false;
                                        const clientApproved = work.approvals?.client || false;
                                        const bothApproved = adminApproved && clientApproved;

                                        let statusBadge;
                                        if (bothApproved) statusBadge = <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>;
                                        else if (adminApproved) statusBadge = <Badge className="bg-yellow-500 hover:bg-yellow-600">Client Review</Badge>;
                                        else if (hasSubmission) statusBadge = <Badge className="bg-yellow-500 hover:bg-yellow-600">Under Review</Badge>;
                                        else if (work.status === 'declined') statusBadge = <Badge variant="destructive">Declined</Badge>;
                                        else statusBadge = <Badge variant="secondary">Pending</Badge>;

                                        return (
                                            <TableRow key={work._id}>
                                                <TableCell className="font-medium">{work.workType}</TableCell>
                                                <TableCell>{work.assignedEditor?.name || 'Unassigned'}</TableCell>
                                                <TableCell>{statusBadge}</TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">{formatDateTime(work.deadline)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <span title="Admin" className={adminApproved ? "text-green-500" : "text-muted-foreground"}>A</span>
                                                        <span title="Client" className={clientApproved ? "text-green-500" : "text-muted-foreground"}>C</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {workBreakdown.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No work breakdown defined.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Detailed Work Items */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Work Items Management</h3>
                        {workBreakdown.map((bd) => {
                            const submissions = workSubmissions[bd._id] || [];
                            const work = submissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))[0];
                            const hasUpload = !!work;
                            const hasPendingCorrections = getAllCorrectionsForBreakdown(bd._id).some(c => !c.done);
                            const isApproved = bd.approved;

                            return (
                                <Card key={bd._id} className={`border-l-4 ${isApproved ? 'border-l-green-500' : 'border-l-muted'}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-base font-semibold text-primary">{bd.workType}</CardTitle>
                                                <CardDescription className="flex items-center gap-2 mt-1">
                                                    <span>{project.currency} {bd.amount}</span>
                                                    {hasUpload ? (
                                                        <span className="flex items-center gap-1 text-xs">
                                                            <Clock className="h-3 w-3" /> Latest: {formatDate(work.submittedAt)}
                                                        </span>
                                                    ) : (
                                                        <span className="italic text-xs">Waiting for editor...</span>
                                                    )}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isApproved ? (
                                                    <Badge className="bg-green-600 hover:bg-green-700 pointer-events-none">Approved</Badge>
                                                ) : hasPendingCorrections ? (
                                                    <Badge variant="warning">Needs Revision</Badge>
                                                ) : hasUpload ? (
                                                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Pending Review</Badge>
                                                ) : (
                                                    <Badge variant="outline">Pending Upload</Badge>
                                                )}

                                                <div className="flex ml-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(bd)} title="Edit Assignment">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4 pb-4">
                                        {/* Instructions Block */}
                                        <div className="rounded-md bg-muted/50 p-3 border text-sm space-y-3">
                                            <div className="font-semibold flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                                                <FileText className="h-3 w-3" /> Instructions
                                            </div>
                                            {bd.clientInstructions && (
                                                <div className="p-2 bg-background rounded border text-muted-foreground text-xs whitespace-pre-wrap">
                                                    <span className="font-bold block mb-1">Client:</span> {bd.clientInstructions}
                                                </div>
                                            )}
                                            <div className="flex gap-2">
                                                <Textarea
                                                    placeholder="Admin instructions for editor..."
                                                    className="resize-none min-h-[60px] text-xs"
                                                    value={adminInstructionsInput[bd._id] !== undefined ? adminInstructionsInput[bd._id] : (bd.adminInstructions || '')}
                                                    onChange={(e) => setAdminInstructionsInput(prev => ({ ...prev, [bd._id]: e.target.value }))}
                                                />
                                                <Button
                                                    size="sm"
                                                    className="h-auto"
                                                    onClick={() => handleSaveAdminInstructions(bd._id)}
                                                    disabled={isSavingAdminInstructions === bd._id}
                                                >
                                                    Save
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Work File Actions */}
                                        {hasUpload && (
                                            <div className="rounded-md border p-3 bg-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                        {work.workFileUrl?.includes('cloudinary') ? <FileText className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-sm">Source / Work File</div>
                                                        <div className="flex items-center gap-2">
                                                            <Label htmlFor={`notify-client-${bd._id}`} className="text-xs text-muted-foreground mr-2">Client Visibility</Label>
                                                            <Switch
                                                                id={`notify-client-${bd._id}`}
                                                                checked={work.isWorkFileVisibleToClient}
                                                                onCheckedChange={() => handleToggleVisibility(work._id)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    {work.workFileUrl && (
                                                        <Button asChild size="sm" variant="outline">
                                                            <a href={work.workFileUrl} target="_blank" rel="noreferrer">
                                                                {work.workSubmissionType === 'link' ? <ExternalLink className="mr-2 h-3 w-3" /> : <Download className="mr-2 h-3 w-3" />}
                                                                {work.workSubmissionType === 'link' ? 'Open Link' : 'Download'}
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {!isApproved && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => {
                                                                    setSelectedSubmission(work);
                                                                    setShowCorrectionsModal(true);
                                                                }}
                                                            >
                                                                Request Corrections
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="default" // primary
                                                                className="bg-green-600 hover:bg-green-700 text-white"
                                                                onClick={async () => {
                                                                    const isConfirmed = await confirm({
                                                                        title: `Approve ${bd.workType}?`,
                                                                        message: `Approve ${bd.workType}? Both admin and client must approve to mark it done.`,
                                                                        confirmText: 'Approve'
                                                                    });
                                                                    if (isConfirmed) {
                                                                        try {
                                                                            await workBreakdownAPI.approve(bd._id);
                                                                            await loadWorkBreakdown();
                                                                            await loadWorkSubmissions();
                                                                            await loadProject();
                                                                        } catch (e) {
                                                                            setError(e.response?.data?.message || 'Failed to approve');
                                                                        }
                                                                    }
                                                                }}
                                                                disabled={hasPendingCorrections}
                                                            >
                                                                Approve
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={!!editingWork} onOpenChange={(open) => !open && setEditingWork(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Work Assignment</DialogTitle>
                        <DialogDescription>Update details for {editingWork?.workType}</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveEdit} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Assigned Editor</Label>
                            <Select
                                value={editFormData.assignedEditor}
                                onValueChange={(val) => setEditFormData({ ...editFormData, assignedEditor: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Editor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {editors.map(editor => (
                                        <SelectItem key={editor._id} value={editor._id}>{editor.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Deadline</Label>
                            <Input
                                type="datetime-local"
                                value={editFormData.deadline}
                                onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Amount</Label>
                            <Input
                                type="number"
                                value={editFormData.amount}
                                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setEditingWork(null)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Corrections Modal */}
            <Dialog open={showCorrectionsModal} onOpenChange={setShowCorrectionsModal}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Request Corrections</DialogTitle>
                        <DialogDescription>Provide feedback for the editor.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddCorrection} className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label>Correction Details</Label>
                            <Textarea
                                value={correctionText}
                                onChange={(e) => setCorrectionText(e.target.value)}
                                placeholder="Describe what needs to be fixed..."
                                className="min-h-[120px]"
                            />
                        </div>

                        {/* Simplified file/voice inputs for now, ideally specific components */}
                        <div className="grid gap-2">
                            <Label>Attach Files</Label>
                            <Input type="file" multiple onChange={handleMediaChange} />
                        </div>

                        {/* Voice recorder placeholder */}
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}>
                                <Mic className="mr-2 h-4 w-4" />
                                {showVoiceRecorder ? 'Cancel Recording' : 'Record Voice Note'}
                            </Button>
                            {voiceFile && <span className="text-xs text-green-600 flex items-center"><CheckCircle2 className="h-3 w-3 mr-1" /> Recorded</span>}
                        </div>
                        {showVoiceRecorder && (
                            <div className="p-4 border rounded bg-muted/30">
                                <VoiceRecorder onRecordingComplete={handleVoiceRecordingComplete} />
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => setShowCorrectionsModal(false)}>Cancel</Button>
                            <Button type="submit" variant="destructive">Send Corrections</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Work Type Details Modal (Wrapper if component supports passing open/close props directly or we render conditional) */}
            {showWorkTypeDetails && selectedWorkTypeForDetails && (
                <WorkTypeDetailsModal
                    isOpen={showWorkTypeDetails}
                    onClose={() => setShowWorkTypeDetails(false)}
                    workBreakdown={selectedWorkTypeForDetails}
                />
            )}
        </div>
    );
};

export default AdminProjectPage;
