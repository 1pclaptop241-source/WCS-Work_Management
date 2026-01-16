import { useState, useEffect } from 'react';
import { worksAPI, API_BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatDate, formatDateTime } from '../../utils/formatDate';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle2, FileText, Link as LinkIcon, Download, AlertTriangle, ExternalLink, Mic, Paperclip, Upload as UploadIcon, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const UploadWork = ({ project, workBreakdown, onClose }) => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [uploadType, setUploadType] = useState('file');
  const [linkUrl, setLinkUrl] = useState('');
  const [editorMessage, setEditorMessage] = useState('');

  useEffect(() => {
    loadSubmissions();
  }, [workBreakdown]);

  const loadSubmissions = async () => {
    try {
      const response = await worksAPI.getByWorkBreakdown(workBreakdown._id);
      setSubmissions(response.data);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (uploadType === 'file' && !file) {
      setError('Please select a file to upload');
      return;
    }
    if (uploadType === 'link' && !linkUrl.trim()) {
      setError('Please provide a link URL');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await worksAPI.upload(project._id, workBreakdown._id, uploadType === 'file' ? file : null, uploadType === 'link' ? linkUrl : null, editorMessage);
      setSuccess(true);
      loadSubmissions();
      setFile(null);
      setLinkUrl('');
      setEditorMessage('');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload work');
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (path) => {
    if (!path) return '#';
    if (path.match(/^https?:\/\//)) return path;
    if (path.startsWith('/') || path.startsWith('uploads')) return `${API_BASE_URL}${path}`;
    return `https://${path}`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <UploadIcon className="h-5 w-5 text-primary" />
            Upload Work
          </DialogTitle>
          <DialogDescription>
            Submit your work for <strong>{workBreakdown.workType}</strong>.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-2">
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50 text-green-700">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>Work uploaded successfully!</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/40 p-3 rounded-lg border">
              <div>
                <span className="text-muted-foreground">Project:</span>
                <div className="font-medium">{project.title}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Deadline:</span>
                <div className="font-medium">{formatDate(workBreakdown.deadline)}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <div className="font-medium">{workBreakdown.amount} {project.currency || 'INR'}</div>
              </div>
            </div>

            {/* Client Script Section */}
            {project.scriptFile && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">Client Script</span>
                  </div>
                  <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-100" asChild>
                    <a href={getFileUrl(project.scriptFile)} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-2 h-4 w-4" /> Download
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Admin Instructions */}
            {(workBreakdown.shareDetails || (workBreakdown.links && workBreakdown.links.length > 0)) && (
              <Card className="border-emerald-200 bg-emerald-50/30">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Instructions & Resources
                  </div>
                  
                  {workBreakdown.shareDetails && (
                    <div className="bg-white/80 p-3 rounded border border-emerald-100 text-sm whitespace-pre-wrap text-emerald-950">
                      {workBreakdown.shareDetails}
                    </div>
                  )}

                  {workBreakdown.links && workBreakdown.links.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Shared Links:</div>
                      <div className="grid gap-2">
                        {workBreakdown.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-white/60 border border-emerald-100 rounded text-sm text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <LinkIcon className="h-3 w-3" />
                            <span className="flex-1 truncate">{link.title || `Link ${idx + 1}`}</span>
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Submissions History */}
            {submissions.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                  <span className="h-px bg-border flex-1"></span>
                  Map History
                  <span className="h-px bg-border flex-1"></span>
                </h3>
                {submissions.map((sub) => (
                  <div key={sub._id} className="border rounded-lg p-3 space-y-3 bg-card">
                    <div className="flex items-center justify-between">
                      <a 
                        href={sub.submissionType === 'link' ? sub.fileUrl : getFileUrl(sub.fileUrl)}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                         {sub.submissionType === 'link' ? <LinkIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                         {sub.fileName}
                      </a>
                      <div className="flex items-center gap-2">
                         <Badge variant={sub.status === 'approved' ? 'success' : sub.status === 'rejected' ? 'destructive' : 'secondary'}>
                           {sub.status}
                         </Badge>
                         <span className="text-xs text-muted-foreground">{formatDateTime(sub.submittedAt)}</span>
                      </div>
                    </div>

                    {/* Corrections */}
                    {sub.corrections && sub.corrections.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm">
                        <div className="font-semibold text-amber-800 mb-2">Requested Corrections</div>
                        <div className="space-y-3">
                          {sub.corrections.map((corr, idx) => (
                            <div key={idx} className={`pl-3 border-l-2 ${corr.done ? 'border-green-500 opacity-60' : 'border-amber-500'}`}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-amber-900/60">{formatDateTime(corr.addedAt)}</span>
                                {corr.done && <Badge variant="outline" className="text-green-600 border-green-200 h-5">Fixed</Badge>}
                              </div>
                              <p className="text-amber-950 mb-2">{corr.text}</p>
                              
                              {corr.voiceFile && (
                                <div className="flex items-center gap-2 bg-white/50 p-2 rounded mb-2">
                                  <Mic className="h-3 w-3 text-amber-700" />
                                  <audio controls src={getFileUrl(corr.voiceFile)} className="h-6 w-full max-w-[200px]" />
                                </div>
                              )}
                              
                              {corr.mediaFiles && corr.mediaFiles.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {corr.mediaFiles.map((m, midx) => (
                                    <a key={midx} href={getFileUrl(m)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs bg-white/50 px-2 py-1 rounded text-amber-800 hover:bg-white hover:underline border border-amber-100">
                                      <Paperclip className="h-3 w-3" /> File {midx + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {sub.clientFeedback && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-2 rounded text-sm text-blue-900">
                        <strong>Client Feedback:</strong> {sub.clientFeedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-6 pt-4 bg-background z-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Tabs value={uploadType} onValueChange={setUploadType} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">File Upload</TabsTrigger>
                <TabsTrigger value="link">Link URL</TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="space-y-3 mt-4">
                <Label htmlFor="file-upload">Select File</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    id="file-upload" 
                    type="file" 
                    onChange={handleFileChange} 
                    className="cursor-pointer"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="link" className="space-y-3 mt-4">
                <Label htmlFor="link-url">Work URL</Label>
                <Input 
                  id="link-url" 
                  type="url" 
                  placeholder="https://drive.google.com/..." 
                  value={linkUrl} 
                  onChange={(e) => setLinkUrl(e.target.value)} 
                />
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes / Changelog (Optional)</Label>
              <Textarea 
                id="notes" 
                placeholder="Describe your work or changes made..." 
                value={editorMessage} 
                onChange={(e) => setEditorMessage(e.target.value)}
                className="resize-none h-20"
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || (uploadType === 'file' ? !file : !linkUrl)} className="min-w-[100px]">
                {loading ? 'Uploading...' : 'Upload Work'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadWork;

