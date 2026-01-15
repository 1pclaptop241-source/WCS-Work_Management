import { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Lock,
  Unlock
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'editor',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      if (selectedUser) {
        // Edit Mode
        const { _id, ...updateData } = { ...userForm };
        if (!updateData.password) delete updateData.password;

        await usersAPI.update(selectedUser._id, updateData);
      } else {
        // Create Mode
        await usersAPI.create(userForm);
      }

      setShowCreateModal(false);
      resetForm();
      await loadUsers();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${selectedUser ? 'update' : 'create'} user`);
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setUserForm({ name: '', email: '', password: '', role: 'editor' });
  };

  const handleDeleteUser = async () => {
    try {
      if (selectedUser) {
        await usersAPI.delete(selectedUser._id);
        setShowDeleteConfirm(false);
        resetForm();
        await loadUsers();
        setError('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleToggleBlock = async (user) => {
    try {
      await usersAPI.toggleBlock(user._id);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle block status');
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin': return 'destructive'; // Or a custom red/purple
      case 'editor': return 'default'; // primary/blue
      case 'client': return 'secondary'; // green-ish usually but secondary works
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="flex h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 pt-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage system access and roles.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <UserPlus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      {error && <div className="p-4 text-destructive bg-destructive/10 rounded-md border border-destructive/20">{error}</div>}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>A list of all registered users including admins, editors, and clients.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <Badge variant="destructive" className="flex w-fit items-center gap-1"><Lock className="h-3 w-3" /> Blocked</Badge>
                        ) : (
                          <Badge variant="outline" className="flex w-fit items-center gap-1 text-green-600 border-green-600"><ShieldCheck className="h-3 w-3" /> Active</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {user.email !== 'admin@wisecutstudios.com' ? (
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>

                            <Button variant="ghost" size="icon" onClick={() => handleToggleBlock(user)}>
                              {user.isBlocked ? <Unlock className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-yellow-500" />}
                            </Button>

                            <Button variant="ghost" size="icon" onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm italic">Protected</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit User Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedUser ? 'Edit User' : 'Create User'}</DialogTitle>
            <DialogDescription>
              {selectedUser ? "Update user details below." : "Add a new user to the system."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                required
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="password">Password {selectedUser && '(Leave blank to keep current)'}</Label>
              <Input
                id="password"
                type="password"
                placeholder={selectedUser ? "Example: ******" : "Secure Password"}
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                minLength={6}
                required={!selectedUser}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Select
                value={userForm.role}
                onValueChange={(val) => setUserForm({ ...userForm, role: val })}
                disabled={selectedUser && selectedUser.role === 'admin' && selectedUser.email === 'admin@wisecutstudios.com'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit">{selectedUser ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Account Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user <strong>{selectedUser?.name}</strong>?
              This action cannot be undone and will permanently remove their access.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
