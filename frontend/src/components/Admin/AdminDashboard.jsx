import { useState, useEffect } from 'react';
import { projectsAPI, usersAPI, worksAPI } from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import { useNavigate } from 'react-router-dom';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, BarChart3, Activity } from 'lucide-react';

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
          <Button variant="secondary" onClick={() => navigate('/admin/activity-logs')}>
            <Activity className="mr-2 h-4 w-4" /> Activity
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {showStats && (
        <DashboardStats
          projects={acceptedProjects}
          clients={clients}
          editors={editors}
        />
      )}

      <Tabs defaultValue="accepted" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="unaccepted">Unaccepted</TabsTrigger>
          <TabsTrigger value="performance">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <ProjectPipeline projects={[...unacceptedProjects, ...acceptedProjects]} />
        </TabsContent>

        <TabsContent value="accepted" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                🚀 Active Projects
                <Badge variant="secondary">{activeOnes.length}</Badge>
              </h3>
            </div>
            {activeOnes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed text-sm">
                No active projects
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeOnes.map(project => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onViewDetails={(proj) => navigate(`/admin/project/${proj._id}`)}
                    onDelete={handleDeleteProject}
                    onUpdate={loadData}
                  />
                ))}
              </div>
            )}
          </div>

          {closedOnes.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                  🔒 Closed Projects
                  <Badge variant="outline">{closedOnes.length}</Badge>
                </h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 opacity-75">
                {closedOnes.map(project => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onViewDetails={(proj) => navigate(`/admin/project/${proj._id}`)}
                    onDelete={handleDeleteProject}
                    onUpdate={loadData}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="unaccepted">
          <Card>
            <CardHeader>
              <CardTitle>Unaccepted Projects</CardTitle>
              <CardDescription>Projects waiting for review and acceptance.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unacceptedProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                        No unaccepted projects found
                      </TableCell>
                    </TableRow>
                  ) : (
                    unacceptedProjects.map((project) => (
                      <TableRow key={project._id}>
                        <TableCell className="font-medium">{project.title}</TableCell>
                        <TableCell>{project.client?.name || 'N/A'}</TableCell>
                        <TableCell>{project.amount ? `${project.currency} ${project.amount.toLocaleString()}` : 'N/A'}</TableCell>
                        <TableCell>{formatDate(project.deadline)}</TableCell>
                        <TableCell>{formatDate(project.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button

                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => navigate(`/admin/accept-project/${project._id}`)}
                          >
                            Accept Project
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <EditorPerformanceView />
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
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
            <div className="grid gap-2">
              <Label htmlFor="clientAmount">Client Amount</Label>
              <Input type="number" id="clientAmount" value={formData.clientAmount} onChange={(e) => setFormData({ ...formData, clientAmount: e.target.value })} required placeholder="Amount" />
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
