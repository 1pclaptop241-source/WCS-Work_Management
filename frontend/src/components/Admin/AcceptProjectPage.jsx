import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, usersAPI, API_BASE_URL } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import { useDialog } from '../../context/DialogContext';
import confetti from 'canvas-confetti';
import { ArrowLeft, Trash2, Plus, ExternalLink, Download } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const AcceptProjectPage = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { confirm, showAlert } = useDialog();
    const [project, setProject] = useState(null);
    const [editors, setEditors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [workMode, setWorkMode] = useState('default');
    const [totalAmount, setTotalAmount] = useState('');
    const [workBreakdown, setWorkBreakdown] = useState([]);

    const [isAccepting, setIsAccepting] = useState(false);

    // Reject State
    const [isRejecting, setIsRejecting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [projectRes, editorsRes] = await Promise.all([
                projectsAPI.getById(projectId),
                usersAPI.getEditors(),
            ]);
            setProject(projectRes.data);
            setEditors(editorsRes.data);
            initializeAcceptModal(projectRes.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const initializeAcceptModal = (proj) => {
        setWorkMode('default');
        setTotalAmount(proj.amount?.toString() || '');

        const defaultWorkTypes = [
            { workType: 'Color Correction', percentage: 5 },
            { workType: 'Rough Cut', percentage: 20 },
            { workType: 'Essential Edit', percentage: 25 },
            { workType: 'Memes', percentage: 15 },
            { workType: 'Motion Graphics & CG/VFX', percentage: 20 },
            { workType: 'Music & SFX', percentage: 10 },
            { workType: 'Final Render', percentage: 5 },
        ];

        const initialBreakdown = defaultWorkTypes.map(work => ({
            workType: work.workType,
            assignedEditor: '',
            deadline: '',
            percentage: work.percentage,
            amount: 0,
            shareDetails: '',
            links: [],
        }));

        setWorkBreakdown(initialBreakdown);
    };

    const handleWorkBreakdownChange = (index, field, value) => {
        const updated = [...workBreakdown];
        updated[index][field] = value;

        if (field === 'percentage' || field === 'totalAmount') {
            const total = parseFloat(totalAmount) || 0;
            updated.forEach((work, i) => {
                if (i === index && field === 'percentage') {
                    work.amount = (total * parseFloat(value)) / 100;
                } else if (field === 'totalAmount') {
                    work.amount = (parseFloat(value) * parseFloat(work.percentage)) / 100;
                }
            });
        }

        setWorkBreakdown(updated);
    };

    const addCustomWorkType = () => {
        setWorkBreakdown([...workBreakdown, {
            workType: '',
            assignedEditor: '',
            deadline: '',
            percentage: 0,
            amount: 0,
            shareDetails: '',
            links: [],
        }]);
    };

    const removeWorkType = async (index) => {
        if (workBreakdown[index].workType === 'Final Render') {
            await showAlert('Final Render cannot be removed', 'Warning');
            return;
        }
        setWorkBreakdown(workBreakdown.filter((_, i) => i !== index));
    };

    const handleAcceptProject = async (e) => {
        e.preventDefault();
        try {
            const totalPercentage = workBreakdown.reduce((sum, w) => sum + parseFloat(w.percentage || 0), 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                await showAlert(`Total percentage must equal 100%. Current: ${totalPercentage.toFixed(2)}%`, 'Validation Error');
                return;
            }

            const confirmed = await confirm({
                title: 'Accept Project',
                message: `Are you sure you want to accept this project?\nAllocated Budget: ${project.currency} ${parseFloat(totalAmount).toLocaleString()}`,
                confirmText: 'Accept Project'
            });

            if (!confirmed) return;

            setIsAccepting(true);
            setError('');
            await projectsAPI.accept(projectId,
                workBreakdown.map(w => ({
                    ...w,
                    amount: parseFloat(w.amount),
                    percentage: parseFloat(w.percentage),
                    deadline: w.deadline ? new Date(w.deadline).toISOString() : w.deadline
                })),
                parseFloat(totalAmount)
            );

            confetti({
                particleCount: 200,
                spread: 120,
                origin: { y: 0.6 },
                colors: ['#28a745', '#007bff', '#ffc107'],
                startVelocity: 45
            });

            await showAlert('Project accepted successfully!', 'Success');
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to accept project');
            showAlert(err.response?.data?.message || 'Failed to accept project', 'Error');
        } finally {
            setIsAccepting(false);
        }
    };

    const handleRejectProject = async () => {
        if (!rejectionReason.trim()) {
            await showAlert('Please provide a reason for rejection', 'Validation Error');
            return;
        }

        try {
            setIsRejecting(true);
            await projectsAPI.reject(projectId, rejectionReason);
            setShowRejectModal(false);
            await showAlert('Project rejected successfully', 'Success');
            navigate('/admin/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reject project');
            await showAlert(err.response?.data?.message || 'Failed to reject project', 'Error');
        } finally {
            setIsRejecting(false);
        }
    };

    if (loading) return <div className="flex h-[80vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
    if (!project) return <div className="container p-8"><div className="p-4 rounded bg-destructive/10 text-destructive">Project not found</div></div>;

    return (
        <div className="container mx-auto p-4 md:p-8 pt-6 max-w-7xl">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => navigate('/admin/dashboard')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Accept Project: {project.title}</h1>
                </div>
                <Button
                    variant="destructive"
                    onClick={() => setShowRejectModal(true)}
                    className="bg-red-600 hover:bg-red-700"
                >
                    Reject Project
                </Button>
            </div>

            {error && <div className="mb-6 p-4 rounded bg-destructive/10 text-destructive border border-destructive/20">{error}</div>}

            <form onSubmit={handleAcceptProject} className="space-y-8">
                {/* Project Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <div>
                                <Label className="text-muted-foreground">Client</Label>
                                <div className="font-medium">{project.client?.name}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Deadline</Label>
                                <div className="font-medium">{formatDateTime(project.deadline)}</div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Description</Label>
                                <p className="text-sm mt-1">{project.description}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {project.rawFootageLinks?.length > 0 && (
                                <div>
                                    <Label className="text-muted-foreground mb-2 block">Raw Footage</Label>
                                    <ul className="text-sm space-y-1">
                                        {project.rawFootageLinks.map((link, idx) => (
                                            <li key={idx}>
                                                <a href={link.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                                    {link.title || link.url} <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {project.scriptFile && (
                                <div>
                                    <Label className="text-muted-foreground mb-2 block">Script</Label>
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={project.scriptFile} target="_blank" rel="noreferrer">
                                            <Download className="mr-2 h-4 w-4" /> Download Script
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Financials Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Financials & Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Work Mode</Label>
                            <Select value={workMode} onValueChange={(val) => {
                                setWorkMode(val);
                                if (val === 'default') initializeAcceptModal(project);
                            }}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Default Template</SelectItem>
                                    <SelectItem value="custom">Custom Breakdown</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Client Amount ({project.currency})</Label>
                            <Input value={project.clientAmount || project.amount || ''} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label>Allocated Budget ({project.currency})</Label>
                            <Input
                                type="number"
                                value={totalAmount}
                                onChange={(e) => {
                                    setTotalAmount(e.target.value);
                                    const total = parseFloat(e.target.value) || 0;
                                    setWorkBreakdown(workBreakdown.map(work => ({
                                        ...work,
                                        amount: (total * parseFloat(work.percentage)) / 100,
                                    })));
                                }}
                                required
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Work Breakdown Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Work Breakdown Analysis</CardTitle>
                        {workMode === 'custom' && (
                            <Button type="button" size="sm" onClick={addCustomWorkType}>
                                <Plus className="mr-2 h-4 w-4" /> Add Work Type
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Work Type</TableHead>
                                        <TableHead className="w-[200px]">Assign Editor</TableHead>
                                        <TableHead className="w-[180px]">Deadline</TableHead>
                                        <TableHead className="w-[100px]">%</TableHead>
                                        <TableHead className="w-[120px]">Amount</TableHead>
                                        <TableHead>Details / Links</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workBreakdown.map((work, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                {workMode === 'default' ? (
                                                    <span className="font-medium">{work.workType}</span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            value={work.workType}
                                                            onChange={(e) => handleWorkBreakdownChange(index, 'workType', e.target.value)}
                                                            disabled={work.workType === 'Final Render'}
                                                            className="h-8"
                                                        />
                                                        {work.workType !== 'Final Render' && (
                                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeWorkType(index)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Select value={work.assignedEditor} onValueChange={(val) => handleWorkBreakdownChange(index, 'assignedEditor', val)}>
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="Select..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {editors.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="datetime-local"
                                                    value={work.deadline}
                                                    onChange={(e) => handleWorkBreakdownChange(index, 'deadline', e.target.value)}
                                                    className="h-8 text-xs"
                                                    required
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        value={work.percentage}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            handleWorkBreakdownChange(index, 'percentage', val);
                                                        }}
                                                        className="h-8 pr-6"
                                                        min="0" max="100"
                                                    />
                                                    <span className="absolute right-2 top-2 text-xs text-muted-foreground">%</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {project.currency} {work.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-2">
                                                    <Textarea
                                                        placeholder="Instructions..."
                                                        value={work.shareDetails || ''}
                                                        onChange={(e) => handleWorkBreakdownChange(index, 'shareDetails', e.target.value)}
                                                        className="h-14 text-xs resize-none"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Link Title"
                                                            value={work.links?.[0]?.title || ''}
                                                            onChange={(e) => {
                                                                const title = e.target.value;
                                                                const url = work.links?.[0]?.url || '';
                                                                handleWorkBreakdownChange(index, 'links', [{ title, url }]);
                                                            }}
                                                            className="h-8 text-xs flex-1"
                                                        />
                                                        <Input
                                                            placeholder="Link URL"
                                                            value={work.links?.[0]?.url || ''}
                                                            onChange={(e) => {
                                                                const url = e.target.value;
                                                                const title = work.links?.[0]?.title || '';
                                                                handleWorkBreakdownChange(index, 'links', [{ title, url }]);
                                                            }}
                                                            className="h-8 text-xs flex-[2]"
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <div className="text-lg font-bold">
                                Total: {workBreakdown.reduce((sum, w) => sum + parseFloat(w.percentage || 0), 0).toFixed(0)}%
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 border-t pt-6">
                        <Button type="button" variant="secondary" onClick={() => navigate('/admin/dashboard')}>Cancel</Button>
                        <Button type="submit" className="bg-green-600 hover:bg-green-700 w-40" disabled={isAccepting}>
                            {isAccepting ? 'Processing...' : 'Accept Project'}
                        </Button>
                    </CardFooter>
                </Card>
            </form>

            <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Project</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to reject this project? The client will be notified via email.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Rejection Reason</Label>
                            <Textarea
                                placeholder="Explain why the project is being rejected..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleRejectProject}
                            disabled={isRejecting || !rejectionReason.trim()}
                        >
                            {isRejecting ? 'Rejecting...' : 'Reject Project'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AcceptProjectPage;
