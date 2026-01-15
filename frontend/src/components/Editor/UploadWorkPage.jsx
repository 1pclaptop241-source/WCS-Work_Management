import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { worksAPI, workBreakdownAPI, API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import ProjectRoadmap from '../common/ProjectRoadmap';
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ArrowLeft, Upload, FileText, Link as LinkIcon, Download,
    MessageSquare, Send, Paperclip, Mic, FileIcon,
    AlertCircle, CheckCircle2, Clock, Info
} from 'lucide-react';

const UploadWorkPage = () => {
    const { workBreakdownId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [workBreakdown, setWorkBreakdown] = useState(null);
    const [uploadType, setUploadType] = useState('output'); // 'output' or 'source'
    const [linkUrl, setLinkUrl] = useState('');
    const [workLinkUrl, setWorkLinkUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    const handleAddFeedback = async () => {
        if (!feedbackText.trim()) return;

        try {
            setIsSubmittingFeedback(true);
            await workBreakdownAPI.addFeedback(workBreakdownId, feedbackText);
            setFeedbackText('');
            loadWorkBreakdown(); // Reload to show new feedback
        } catch (err) {
            console.error('Failed to add feedback:', err);
            setError('Failed to add feedback');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    useEffect(() => {
        loadWorkBreakdown();
        loadSubmissions();
    }, [workBreakdownId]);

    const loadWorkBreakdown = async () => {
        try {
            setLoading(true);
            const response = await workBreakdownAPI.getByEditor(user._id);
            const work = response.data.find(w => w._id === workBreakdownId);
            if (!work) {
                setError('Work breakdown not found');
                return;
            }
            setWorkBreakdown(work);
        } catch (err) {
            setError('Failed to load work details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadSubmissions = async () => {
        try {
            const response = await worksAPI.getByWorkBreakdown(workBreakdownId);
            setSubmissions(response.data);
        } catch (err) {
            console.error('Failed to load submissions:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (uploadType === 'output' && !linkUrl.trim()) {
            setError('Please provide a Final Output URL');
            return;
        }
        if (uploadType === 'source' && !workLinkUrl.trim()) {
            setError('Please provide a Source File URL');
            return;
        }

        try {
            setUploading(true);
            setError('');
            setSuccess(false);

            const submitLinkUrl = uploadType === 'output' ? linkUrl : '';
            const submitWorkLinkUrl = uploadType === 'source' ? workLinkUrl : '';

            await worksAPI.upload(
                workBreakdown.project._id,
                workBreakdownId,
                null, // No file
                submitLinkUrl,
                '', // No editor message
                null, // No work file (upload)
                submitWorkLinkUrl
            );

            setSuccess(true);
            setLinkUrl('');
            setWorkLinkUrl('');
            loadSubmissions();

            setTimeout(() => {
                navigate('/editor/dashboard');
            }, 2000);
        } catch (err) {
            console.error('Upload error:', err);
            setSuccess(false); // Clear success if error
            setError(err.response?.data?.message || err.message || 'Failed to upload work');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!workBreakdown) {
        return (
            <div className="container max-w-4xl py-10">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error || 'Work not found'}</AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => navigate('/editor/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
            </div>
        );
    }

    if (workBreakdown.status === 'declined') {
        return (
            <div className="container max-w-4xl py-10">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Work Declined</AlertTitle>
                    <AlertDescription>You have declined this work. You cannot upload files or view details for declined tasks.</AlertDescription>
                </Alert>
                <Button className="mt-4" variant="outline" onClick={() => navigate('/editor/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="container max-w-[1400px] py-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/editor/dashboard')}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Upload Work: {workBreakdown.workType}</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Work Details */}
                <div className="lg:col-span-2 space-y-6">
                    <ProjectRoadmap
                        projectId={workBreakdown.project?._id}
                        currentWorkType={workBreakdown.workType}
                        projectTitle={workBreakdown.project?.title}
                    />

                    <Card>
                        <CardHeader>
                            <CardTitle>Work Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Project</Label>
                                    <div className="font-medium">{workBreakdown.project?.title}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Work Type</Label>
                                    <div className="font-medium">{workBreakdown.workType}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Deadline</Label>
                                    <div className="font-medium">{formatDate(workBreakdown.deadline)}</div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground">Amount</Label>
                                    <div className="font-medium">
                                        {workBreakdown.project?.currency === 'INR' ? '₹' :
                                            workBreakdown.project?.currency === 'USD' ? '$' :
                                                workBreakdown.project?.currency === 'EUR' ? '€' : ''}
                                        {workBreakdown.amount} {workBreakdown.project?.currency || 'INR'}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Client Script Section */}
                    {workBreakdown.project?.scriptFile && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Client Script</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" asChild className="w-full justify-start">
                                    <a
                                        href={workBreakdown.project.scriptFile.match(/^https?:\/\//) ? workBreakdown.project.scriptFile : (workBreakdown.project.scriptFile.startsWith('/') || workBreakdown.project.scriptFile.startsWith('uploads') ? `${API_BASE_URL}${workBreakdown.project.scriptFile}` : `https://${workBreakdown.project.scriptFile}`)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Download className="mr-2 h-4 w-4" />
                                        Download Script File
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* Work Instructions */}
                    {(workBreakdown.clientInstructions || workBreakdown.adminInstructions || workBreakdown.shareDetails || (workBreakdown.links && workBreakdown.links.length > 0)) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Info className="h-5 w-5" /> Instructions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Client Instructions */}
                                {workBreakdown.clientInstructions && (
                                    <div className="bg-blue-50 p-4 rounded-md border-l-4 border-blue-500">
                                        <Label className="text-blue-700 font-semibold mb-1 block">Client Instructions</Label>
                                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{workBreakdown.clientInstructions}</p>
                                    </div>
                                )}

                                {/* Admin Instructions */}
                                {(workBreakdown.adminInstructions || workBreakdown.shareDetails) && (
                                    <div className="space-y-2">
                                        {workBreakdown.adminInstructions && (
                                            <div>
                                                <Label className="font-semibold">Admin Instructions</Label>
                                                <p className="text-sm text-foreground whitespace-pre-wrap mt-1">{workBreakdown.adminInstructions}</p>
                                            </div>
                                        )}
                                        {workBreakdown.shareDetails && (
                                            <div className="bg-muted p-3 rounded-md">
                                                <Label className="font-semibold">Details</Label>
                                                <p className="text-sm text-muted-foreground mt-1">{workBreakdown.shareDetails}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {workBreakdown.links && workBreakdown.links.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="font-semibold">Shared Links</Label>
                                        <div className="grid gap-2">
                                            {workBreakdown.links.map((link, idx) => (
                                                <a
                                                    key={idx}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted/50 p-2 rounded-md transition-colors hover:bg-muted"
                                                >
                                                    <LinkIcon className="h-4 w-4" />
                                                    {link.title || `Link ${idx + 1}`}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Work Feedback & Discussion */}
                    {workBreakdown.feedback && workBreakdown.feedback.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Discussion</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                                    <div className="space-y-4">
                                        {workBreakdown.feedback.map((f, i) => (
                                            <div
                                                key={i}
                                                className={`flex flex-col max-w-[85%] ${f.from?._id === user._id ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                                            >
                                                <div className={`p-3 rounded-lg text-sm ${f.from?._id === user._id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                    <p className="whitespace-pre-wrap">{f.content}</p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 px-1">
                                                    <span className="text-xs font-semibold text-muted-foreground">{f.from?.name || 'User'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{formatDateTime(f.timestamp)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>

                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Type your message..."
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddFeedback()}
                                    />
                                    <Button onClick={handleAddFeedback} disabled={isSubmittingFeedback || !feedbackText.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Previous Submissions */}
                    {submissions.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> History & Corrections</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {submissions.map((sub) => (
                                    <div key={sub._id} className="border rounded-lg p-4 space-y-3 bg-muted/10">
                                        <div className="flex flex-wrapjustify-between items-start gap-2">
                                            <div className="flex items-center gap-2">
                                                {sub.submissionType === 'link' ? (
                                                    <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline font-medium">
                                                        <LinkIcon className="h-4 w-4" /> {sub.fileName}
                                                    </a>
                                                ) : (
                                                    <a href={sub.fileUrl.match(/^https?:\/\//) ? sub.fileUrl : (sub.fileUrl.startsWith('/') || sub.fileUrl.startsWith('uploads') ? `${API_BASE_URL}${sub.fileUrl}` : `https://${sub.fileUrl}`)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline font-medium">
                                                        <FileIcon className="h-4 w-4" /> {sub.fileName}
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={sub.status === 'approved' ? 'default' : 'secondary'} className={sub.status === 'approved' ? 'bg-green-500 hover:bg-green-600' : ''}>
                                                    {sub.status}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">{formatDateTime(sub.submittedAt)}</span>
                                            </div>
                                        </div>

                                        {sub.editorMessage && (
                                            <div className="bg-blue-50/50 p-3 rounded-md text-sm border border-blue-100">
                                                <strong className="text-blue-700 block mb-1">Your Message:</strong>
                                                <p className="text-foreground">{sub.editorMessage}</p>
                                            </div>
                                        )}

                                        {sub.corrections && sub.corrections.length > 0 && (
                                            <div className="bg-amber-50/50 mt-4 p-4 rounded-md border border-amber-100">
                                                <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4" />
                                                    Corrections ({sub.corrections.filter(c => !c.done).length} pending)
                                                </h4>
                                                <div className="space-y-3">
                                                    {sub.corrections.map((corr, idx) => (
                                                        <div key={idx} className={`p-3 rounded-md border ${corr.done ? 'bg-green-50/50 border-green-200' : 'bg-white border-amber-200 shadow-sm'}`}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="text-xs text-muted-foreground">{formatDateTime(corr.addedAt)}</span>
                                                                <Badge variant={corr.done ? 'outline' : 'warning'} className={corr.done ? 'text-green-600 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                                                                    {corr.done ? <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Fixed</span> : 'Needs Fix'}
                                                                </Badge>
                                                            </div>
                                                            {corr.text && <p className="text-sm text-foreground mb-2">{corr.text}</p>}

                                                            {corr.voiceFile && (
                                                                <div className="mt-2 text-sm">
                                                                    <div className="flex items-center gap-1 font-medium text-muted-foreground mb-1"><Mic className="h-3 w-3" /> Voice Note</div>
                                                                    <audio controls src={corr.voiceFile.match(/^https?:\/\//) ? corr.voiceFile : (corr.voiceFile.startsWith('/') || corr.voiceFile.startsWith('uploads') ? `${API_BASE_URL}${corr.voiceFile}` : `https://${corr.voiceFile}`)} className="w-full h-8" />
                                                                </div>
                                                            )}

                                                            {corr.mediaFiles && corr.mediaFiles.length > 0 && (
                                                                <div className="mt-2">
                                                                    <div className="flex items-center gap-1 font-medium text-muted-foreground mb-1"><Paperclip className="h-3 w-3" /> Attachments</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {corr.mediaFiles.map((m, i) => (
                                                                            <a
                                                                                key={i}
                                                                                href={m.match(/^https?:\/\//) ? m : (m.startsWith('/') || m.startsWith('uploads') ? `${API_BASE_URL}${m}` : `https://${m}`)}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded border flex items-center gap-1 transition-colors"
                                                                            >
                                                                                <FileIcon className="h-3 w-3" /> File {i + 1}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Column - Upload Form */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <Card className="border-2 border-primary/10 shadow-lg">
                            <CardHeader className="bg-muted/30 pb-4">
                                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary" /> Upload Work</CardTitle>
                                <CardDescription>Submit your work for review</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {error && (
                                    <Alert variant="destructive" className="mb-4">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}
                                {success && (
                                    <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <AlertTitle>Success</AlertTitle>
                                        <AlertDescription>Work uploaded successfully! Redirecting...</AlertDescription>
                                    </Alert>
                                )}

                                <Tabs defaultValue="output" value={uploadType} onValueChange={setUploadType} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="output">Final Output</TabsTrigger>
                                        <TabsTrigger value="source">Source File</TabsTrigger>
                                    </TabsList>

                                    <form onSubmit={handleSubmit}>
                                        <TabsContent value="output" className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="output-url">Final Output URL</Label>
                                                <Input
                                                    id="output-url"
                                                    placeholder="https://example.com/your-work"
                                                    value={linkUrl}
                                                    onChange={(e) => setLinkUrl(e.target.value)}
                                                    required={uploadType === 'output'}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Provide the link to the final rendered output (e.g. Frame.io, Vimeo, Drive).
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="source" className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="source-url">Source File URL</Label>
                                                <Input
                                                    id="source-url"
                                                    placeholder="https://drive.google.com/..."
                                                    value={workLinkUrl}
                                                    onChange={(e) => setWorkLinkUrl(e.target.value)}
                                                    required={uploadType === 'source'}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Provide the link to the source project files for the next editor.
                                                </p>
                                            </div>
                                        </TabsContent>

                                        <Button type="submit" className="w-full mt-6" disabled={uploading}>
                                            {uploading ? (
                                                <>
                                                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                uploadType === 'output' ? 'Submit Final Output' : 'Submit Source File'
                                            )}
                                        </Button>
                                    </form>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadWorkPage;
