import { useState, useEffect } from 'react';
import { projectsAPI, worksAPI, resetAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { formatDateTime } from '../../utils/formatDate';
import OngoingProjects from './OngoingProjects';
import WorkView from './WorkView';

import CountUp from 'react-countup';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Link as LinkIcon, FileText, Calendar, DollarSign, Video, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ClientDashboard = () => {
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('projects-ongoing');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletionReports, setDeletionReports] = useState([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    projectDetails: '',
    currency: 'INR',
    amount: '',
    rawFootageLinks: [],
    scriptFile: null
  });

  const [editingProject, setEditingProject] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProjects();
    loadDeletionReports();
  }, []);

  const loadProjects = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const response = await projectsAPI.getAll();
      const sortedProjects = response.data.sort((a, b) => {
        if (a.closed && !b.closed) return 1;
        if (!a.closed && b.closed) return -1;

        const isAwaitingAction = (p) => p.status === 'submitted' || p.status === 'under_review';
        const aWaiting = isAwaitingAction(a);
        const bWaiting = isAwaitingAction(b);

        if (aWaiting && !bWaiting) return -1;
        if (!aWaiting && bWaiting) return 1;

        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      setProjects(sortedProjects);
      if (selectedProject) {
        const updated = sortedProjects.find(p => p._id === selectedProject._id);
        if (updated) setSelectedProject(updated);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const loadDeletionReports = async () => {
    try {
      const response = await resetAPI.getReports();
      setDeletionReports(response.data);
    } catch (err) {
      console.error('Failed to load deletion reports:', err);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      const response = await resetAPI.downloadReport(reportId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deletion-report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await showAlert('Failed to download report', 'Error');
    }
  };

  const handleEditProject = (project) => {
    setEditingProject(project);

    let deadlineStr = '';
    if (project.deadline) {
      const date = new Date(project.deadline);
      const tzoffset = date.getTimezoneOffset() * 60000;
      deadlineStr = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    }

    setFormData({
      title: project.title,
      description: project.description,
      deadline: deadlineStr,
      projectDetails: project.projectDetails || '',
      currency: project.currency || 'INR',
      amount: project.clientAmount || project.amount || '',
      rawFootageLinks: project.rawFootageLinks || [],
      scriptFile: null
    });
    setLinkTitle('');
    setLinkUrl('');
    setShowCreateModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setEditingProject(null);
    setFormData({
      title: '',
      description: '',
      deadline: '',
      projectDetails: '',
      currency: 'INR',
      amount: '',
      rawFootageLinks: [],
      scriptFile: null
    });
    setLinkTitle('');
    setLinkUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const submitData = new FormData();
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      const isoDeadline = new Date(formData.deadline).toISOString();
      submitData.append('deadline', isoDeadline);
      submitData.append('projectDetails', formData.projectDetails || '');
      submitData.append('currency', formData.currency);
      submitData.append('amount', formData.amount);
      submitData.append('rawFootageLinks', JSON.stringify(formData.rawFootageLinks));
      if (formData.scriptFile) {
        submitData.append('scriptFile', formData.scriptFile);
      }

      if (!formData.deadline) {
        showAlert('Please select a deadline', 'Error');
        setIsSubmitting(false); // Ensure submitting state is reset
        return;
      }

      // Validation: Deadline must be > 15 mins from now
      const deadlineDate = new Date(formData.deadline);
      const minDeadline = new Date(Date.now() + 15 * 60 * 1000);

      if (deadlineDate < minDeadline) {
        showAlert('Deadline must be at least 15 minutes in the future.', 'Error');
        setIsSubmitting(false);
        return;
      }

      // Validation: Assets are mandatory
      if (formData.rawFootageLinks.length === 0) {
        showAlert('Please add at least one Project Asset/Link.', 'Error');
        setIsSubmitting(false);
        return;
      }

      if (editingProject) {
        await projectsAPI.updateWithFile(editingProject._id, submitData);
        await showAlert('Project updated successfully', 'Success');
      } else {
        await projectsAPI.createWithFile(submitData);

        await showAlert('Project created successfully! Waiting for admin approval.', 'Success');
      }

      handleModalClose();
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save project');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center text-muted-foreground">Loading dashboard...</div>;
  }

  // If viewing a specific project work view, render that
  if (selectedProject) {
    return (
      <div className="container mx-auto p-4 md:p-6 animate-in fade-in duration-300">
        <WorkView
          project={selectedProject}
          onBack={() => setSelectedProject(null)}
          onUpdate={() => loadProjects(true)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}!</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Projects</span>
            <span className="text-2xl font-bold text-primary">
              <CountUp end={projects.filter(p => p.accepted && !p.closed).length} duration={1.5} />
            </span>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" /> Create Project
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Deletion Reports */}
      {deletionReports.length > 0 && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-yellow-800 dark:text-yellow-300">Data Deletion Notifications</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setDeletionReports([])} className="text-yellow-800 hover:text-yellow-900">
              <span className="text-xl">×</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {deletionReports.map((report) => (
              <div key={report._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg gap-4">
                <div>
                  <p className="font-medium">Data Deletion Report</p>
                  <p className="text-sm text-muted-foreground">Deleted on: {formatDateTime(report.deletedAt)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projects: {report.deletedProjects.length} | Payments: {report.deletedPayments.length}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report.reportId)} className="gap-2 border-yellow-200 hover:bg-yellow-100">
                  <FileText className="h-4 w-4" /> Download PDF
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="projects-ongoing">Ongoing Projects</TabsTrigger>
          <TabsTrigger value="projects-created">Created Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="projects-ongoing" className="mt-6 space-y-4">
          <OngoingProjects
            projects={projects.filter(p => p.accepted)}
            onProjectSelect={(project) => {
              setSelectedProject(project);
            }}
            onEdit={handleEditProject}
          />
        </TabsContent>

        <TabsContent value="projects-created" className="mt-6 space-y-4">
          <OngoingProjects
            projects={projects.filter(p => !p.accepted)}
            onProjectSelect={(project) => {
              setSelectedProject(project);
            }}
            onEdit={handleEditProject}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Project Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => !open && handleModalClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Summer Vacation Vlog #1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your vision, style, and requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="amount">Budget Estimate *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        className="pl-9"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                        disabled={editingProject && editingProject.accepted}
                      />
                    </div>
                    <div className="w-[100px]">
                      <select
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        disabled={editingProject && editingProject.accepted}
                      >
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                  {editingProject && editingProject.accepted && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Budget locked after acceptance
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline">Desired Deadline *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-primary" />
                    <Input
                      id="deadline"
                      type="datetime-local"
                      className="pl-9"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                <div className="space-y-1">
                  <Label>Project Assets & Links *</Label>
                  <p className="text-xs text-muted-foreground">Add links to cloud folders (Drive, Dropbox) with your footage.</p>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Link Title (e.g. Raw Footage)"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="URL"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="flex-[2]"
                  />
                  <Button type="button" onClick={() => {
                    if (linkTitle && linkUrl) {
                      setFormData({
                        ...formData,
                        rawFootageLinks: [...formData.rawFootageLinks, { title: linkTitle, url: linkUrl }]
                      });
                      setLinkTitle('');
                      setLinkUrl('');
                    }
                  }}>
                    Add
                  </Button>
                </div>

                {formData.rawFootageLinks.length > 0 && (
                  <div className="space-y-2">
                    {formData.rawFootageLinks.map((link, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background rounded border text-sm">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <LinkIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                          <span className="font-medium">{link.title}:</span>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{link.url}</a>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              rawFootageLinks: formData.rawFootageLinks.filter((_, i) => i !== index)
                            });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="script">Script or Guideline (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="script"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFormData({ ...formData, scriptFile: e.target.files[0] })}
                    className="cursor-pointer"
                  />
                </div>
                {formData.scriptFile && (
                  <p className="text-xs text-muted-foreground">Selected: {formData.scriptFile.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Additional Instructions</Label>
                <Textarea
                  id="details"
                  placeholder="Any final notes..."
                  value={formData.projectDetails}
                  onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })}
                />
              </div>

            </form>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" type="button" onClick={handleModalClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" form="project-form" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : (editingProject ? 'Update Project' : 'Create Project')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientDashboard;

