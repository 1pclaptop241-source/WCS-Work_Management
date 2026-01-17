import { useState, useEffect } from 'react';
import { projectsAPI, usersAPI, worksAPI } from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import ProjectCard from './ProjectCard';
import DashboardStats from './DashboardStats';
import ProjectPipeline from './ProjectPipeline';
import EditorPerformanceView from './EditorPerformanceView';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, LayoutGrid, Plus, BarChart3, Activity, User, IndianRupee, DollarSign, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { showAlert } = useDialog();
  const [unacceptedProjects, setUnacceptedProjects] = useState([]);
  const [acceptedProjects, setAcceptedProjects] = useState([]);
  const [editors, setEditors] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStats, setShowStats] = useState(true);

  // Dashboard UI State
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'pending', 'active', 'completed'
  const [searchQuery, setSearchQuery] = useState('');
  const [showInsights, setShowInsights] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Forms state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client: '',
    assignedEditor: '',
    deadline: '',
    projectDetails: '',
    baseAmount: '',
    clientAmount: ''
  });

  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor',
  });

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isAssigningEditor, setIsAssigningEditor] = useState(false);
  const [isSharingDetails, setIsSharingDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [unacceptedRes, acceptedRes, editorsRes, clientsRes] = await Promise.all([
        projectsAPI.getUnaccepted(),
        projectsAPI.getAccepted(),
        usersAPI.getEditors(),
        usersAPI.getClients(),
      ]);
      setUnacceptedProjects(unacceptedRes.data);
      setAcceptedProjects(acceptedRes.data);
      setEditors(editorsRes.data);
      setClients(clientsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setIsCreatingUser(true);
      setError('');
      await usersAPI.create(userForm);
      setShowCreateUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'editor' });
      await loadData();
      await showAlert('User created successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
      showAlert(err.response?.data?.message || 'Failed to create user', 'Error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      setIsCreatingProject(true);
      setError('');

      // Validation: Deadline must be > 15 mins from now
      const deadlineDate = new Date(formData.deadline);
      const minDeadline = new Date(Date.now() + 15 * 60 * 1000);

      if (deadlineDate < minDeadline) {
        showAlert('Deadline must be at least 15 minutes in the future.', 'Error');
        setIsCreatingProject(false);
        return;
      }

      await projectsAPI.create(formData);
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        client: '',
        assignedEditor: '',
        deadline: '',
        projectDetails: '',
        baseAmount: '',
        clientAmount: '',
      });
      await loadData();
      await showAlert('Project created successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
      showAlert(err.response?.data?.message || 'Failed to create project', 'Error');
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Helper to open assign modal
  useEffect(() => {
    if (showAssignModal && !selectedProject) {
      // Should not happen if logic is correct
      setShowAssignModal(false);
    }
  }, [showAssignModal, selectedProject]);


  const handleDeleteProject = async (projectId) => {
    try {
      setError('');
      await projectsAPI.delete(projectId);
      await loadData();
      await showAlert('Project deleted successfully', 'Success');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
      showAlert(err.response?.data?.message || 'Failed to delete project', 'Error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Filter projects for the accepted view
  const activeOnes = acceptedProjects.filter(p => !p.closed).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const closedOnes = acceptedProjects.filter(p => p.closed).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Unified Filter Logic
  const allProjects = [...unacceptedProjects, ...acceptedProjects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const filteredProjects = allProjects.filter(project => {
    // 1. Search Filter
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Tab Filter
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return !project.accepted; // Unaccepted
    if (activeTab === 'active') return project.accepted && !project.closed;
    if (activeTab === 'completed') return project.closed || project.status === 'completed';

    return true;
  });

  return (
    <div className="space-y-6 container mx-auto p-4 md:p-8 pt-6">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground">Manage projects, users, and overall performance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setShowStats(!showStats)} title="Toggle Stats">
            <BarChart3 className="h-4 w-4" />
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
          <Button variant={showInsights ? "secondary" : "outline"} onClick={() => setShowInsights(!showInsights)}>
            <BarChart3 className="mr-2 h-4 w-4" /> {showInsights ? 'Hide Insights' : 'Insights'}
          </Button>
          <Button variant="outline" onClick={() => navigate('/admin/activity-logs')}>
            <Activity className="mr-2 h-4 w-4" /> Activity
          </Button>
        </div>
      </div>

      {showStats && (
        <DashboardStats
          projects={acceptedProjects}
          clients={clients}
          editors={editors}
        />
      )}

      {showInsights ? (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Performance Insights</h3>
            <Button variant="outline" size="sm" onClick={() => setShowInsights(false)}>
              &larr; Back to Dashboard
            </Button>
          </div>
          <EditorPerformanceView />
        </div>
      ) : (
        <>
          {/* Unified Project View */}
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-muted/30 p-4 rounded-lg border">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={activeTab === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('all')}
                  className="rounded-full"
                >
                  All Projects
                </Button>
                <Button
                  variant={activeTab === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('pending')}
                  className={activeTab === 'pending' ? "bg-amber-600 hover:bg-amber-700 rounded-full" : "text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50 rounded-full dark:hover:bg-amber-900/20"}
                >
                  <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                  Pending ({unacceptedProjects.length})
                </Button>
                <Button
                  variant={activeTab === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('active')}
                  className="rounded-full"
                >
                  <Clock className="mr-2 h-3.5 w-3.5" />
                  In Progress
                </Button>
                <Button
                  variant={activeTab === 'completed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('completed')}
                  className="rounded-full"
                >
                  <CheckCircle className="mr-2 h-3.5 w-3.5" />
                  Completed
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Project Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {
                filteredProjects.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                    <div className="bg-muted rounded-full p-4 mb-3">
                      <LayoutGrid className="h-8 w-8 opacity-50" />
                    </div>
                    <h3 className="text-lg font-medium">No projects found</h3>
                    <p className="text-sm max-w-sm mt-1 mb-4">
                      {searchQuery ? `No matches for "${searchQuery}"` : 'Get started by creating a new project.'}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => setShowCreateModal(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create Project
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <Card
                      key={project._id}
                      className={`flex flex-col justify-between hover:shadow-lg transition-all duration-200 group border-l-4 ${!project.accepted ? 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/10' :
                        project.closed ? 'border-l-green-500 opacity-90' : 'border-l-blue-500'
                        }`}
                    >
                      <CardHeader className="p-4 pb-2">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-base font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors" title={project.title}>
                            {project.title}
                          </CardTitle>
                          {!project.accepted && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600 bg-amber-100 dark:bg-amber-950/30 whitespace-nowrap">
                              New
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs pt-1 flex items-center justify-between">
                          <span>{formatDate(project.createdAt)}</span>
                          {project.closed && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Closed</Badge>}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="p-4 py-2 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="bg-primary/10 p-1 rounded-full shrink-0"><User className="h-3 w-3" /></span>
                          <span className="truncate font-medium text-foreground">{project.client?.name || 'Unknown Client'}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="bg-primary/10 p-1 rounded-full shrink-0">{project.currency === 'USD' ? <DollarSign className="h-3 w-3" /> : <IndianRupee className="h-3 w-3" />}</span>
                          <span className="font-medium text-foreground">
                            {project.clientAmount ? project.clientAmount.toLocaleString() : (project.amount ? project.amount.toLocaleString() : 'N/A')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className={`p-1 rounded-full shrink-0 ${new Date(project.deadline) < new Date() && !project.closed ? 'bg-red-100 text-red-600' : 'bg-primary/10'
                            }`}>
                            <Clock className="h-3 w-3" />
                          </span>
                          <span className={`font-medium ${new Date(project.deadline) < new Date() && !project.closed ? 'text-red-600' : 'text-foreground'
                            }`}>
                            {formatDate(project.deadline)}
                          </span>
                        </div>
                      </CardContent>

                      <div className="p-4 pt-2 mt-auto">
                        {!project.accepted ? (
                          <Button
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
                            size="sm"
                            onClick={() => navigate(`/admin/accept-project/${project._id}`)}
                          >
                            Review & Accept
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            className="w-full hover:bg-primary hover:text-primary-foreground shadow-sm group-hover:border-primary/20"
                            size="sm"
                            onClick={() => navigate(`/admin/project/${project._id}`)}
                          >
                            Manage Project
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                )
              }
            </div >
          </div >
        </>
      )}

      {/* Create Project Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Enter project details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required placeholder="Project Title" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} required placeholder="Short description" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="client">Client</Label>
              <Select value={formData.client} onValueChange={(val) => setFormData({ ...formData, client: val })} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select Client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client._id} value={client._id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input type="datetime-local" id="deadline" value={formData.deadline} onChange={(e) => setFormData({ ...formData, deadline: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency || 'INR'} onValueChange={(val) => setFormData({ ...formData, currency: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="INR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="baseAmount">Base Amount</Label>
                <Input type="number" id="baseAmount" value={formData.baseAmount} onChange={(e) => setFormData({ ...formData, baseAmount: e.target.value })} required placeholder="0.00" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="clientAmount">Client Amount (Optional)</Label>
              <Input type="number" id="clientAmount" value={formData.clientAmount} onChange={(e) => setFormData({ ...formData, clientAmount: e.target.value })} placeholder="Same as Base Amount if empty" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="details">Project Details</Label>
              <Textarea id="details" value={formData.projectDetails} onChange={(e) => setFormData({ ...formData, projectDetails: e.target.value })} placeholder="Additional requirements..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreatingProject}>{isCreatingProject ? 'Creating...' : 'Create Project'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
