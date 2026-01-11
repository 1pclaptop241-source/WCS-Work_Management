import { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
        if (!updateData.password) delete updateData.password; // Don't send empty password

        await usersAPI.update(selectedUser._id, updateData);
      } else {
        // Create Mode
        await usersAPI.create(userForm);
      }

      setShowCreateModal(false);
      setSelectedUser(null);
      setUserForm({ name: '', email: '', password: '', role: 'editor' });
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
      password: '', // Leave empty to keep unchanged
      role: user.role,
    });
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setSelectedUser(null);
    setUserForm({ name: '', email: '', password: '', role: 'editor' });
  };

  const handleDeleteUser = async () => {
    try {
      await usersAPI.delete(selectedUser._id);
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      await loadUsers();
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      admin: 'badge-danger',
      editor: 'badge-primary',
      client: 'badge-success',
    };
    return roleMap[role] || 'badge-secondary';
  };

  if (loading) {
    return <div className="spinner"></div>;
  }

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>User Management</h1>
        <button className="btn btn-primary" onClick={() => {
          setSelectedUser(null);
          setUserForm({ name: '', email: '', password: '', role: 'editor' });
          setShowCreateModal(true);
        }}>
          Add User
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Users</h2>
        </div>
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge ${getRoleBadge(user.role)}`} style={user.isBlocked ? { opacity: 0.5, textDecoration: 'line-through' } : {}}>
                        {user.role}
                      </span>
                      {user.isBlocked && <span style={{ marginLeft: '8px', fontSize: '12px', color: '#dc3545', fontWeight: 'bold' }}>BLOCKED</span>}
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          title="Edit User"
                          style={{
                            padding: '6px',
                            backgroundColor: 'rgba(46, 134, 171, 0.1)',
                            color: 'var(--primary-blue)',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--primary-blue)';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(46, 134, 171, 0.1)';
                            e.currentTarget.style.color = 'var(--primary-blue)';
                          }}
                          onClick={() => handleEditClick(user)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4L18.5 2.5z"></path>
                          </svg>
                        </button>
                        {user.email !== 'admin@wisecutstudios.com' && (
                          <>
                            <button
                              title={user.isBlocked ? "Unblock User" : "Block User"}
                              style={{
                                padding: '6px',
                                backgroundColor: user.isBlocked ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
                                color: user.isBlocked ? '#28a745' : '#ffc107',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = user.isBlocked ? '#28a745' : '#ffc107';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = user.isBlocked ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)';
                                e.currentTarget.style.color = user.isBlocked ? '#28a745' : '#ffc107';
                              }}
                              onClick={async () => {
                                try {
                                  await usersAPI.toggleBlock(user._id);
                                  await loadUsers();
                                } catch (err) {
                                  setError(err.response?.data?.message || 'Failed to toggle block status');
                                }
                              }}
                            >
                              {user.isBlocked ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                              )}
                            </button>
                            <button
                              title="Delete User"
                              style={{
                                padding: '6px',
                                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                color: '#dc3545',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#dc3545';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                                e.currentTarget.style.color = '#dc3545';
                              }}
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteConfirm(true);
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </>
                        )}
                        {user.email === 'admin@wisecutstudios.com' && (
                          <span style={{ color: '#999', fontSize: '14px', alignSelf: 'center' }}>Protected</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedUser ? 'Edit User' : 'Create User'}</h2>
              <button className="modal-close" onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password {selectedUser && '(Leave blank to keep current)'}</label>
                <input
                  type="password"
                  className="form-input"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  minLength={6}
                  required={!selectedUser}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  required
                  disabled={selectedUser && selectedUser.role === 'admin'}
                >
                  <option value="editor">Editor</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete user <strong>{selectedUser.name}</strong> ({selectedUser.email})?</p>
              <p style={{ color: '#dc3545', marginTop: '10px' }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteUser}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

