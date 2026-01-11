import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const API_URL = `${API_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  agreeTerms: () => api.put('/auth/agree-terms'),
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (projectData) => api.post('/projects', projectData),
  createWithFile: (formData) => api.post('/projects', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: (id, projectData) => api.put(`/projects/${id}`, projectData),
  updateWithFile: (id, formData) => api.put(`/projects/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: (id) => api.delete(`/projects/${id}`),
  assignEditor: (id, editorId, baseAmount) => api.put(`/projects/${id}/assign`, { editorId, baseAmount }),
  shareDetails: (id, projectDetails) => api.put(`/projects/${id}/share-details`, { projectDetails }),
  getRoadmap: (id) => api.get(`/projects/${id}/roadmap`),
  updateRoadmap: (id, stage, status, notes) => api.put(`/projects/${id}/roadmap`, { stage, status, notes }),
  approve: (id) => api.put(`/projects/${id}/approve`),
  publish: (id) => api.put(`/projects/${id}/publish`),
  accept: (id, workBreakdown, totalAmount) => api.post(`/projects/${id}/accept`, { workBreakdown, totalAmount }),
  uploadFinalRender: (id, link) => api.put(`/projects/${id}/final-render`, { finalRenderLink: link }),
  clientApprove: (id) => api.put(`/projects/${id}/client-approve`),
  closeProject: (id) => api.put(`/projects/${id}/close`),
  getUnaccepted: () => api.get('/projects?accepted=false'),
  getAccepted: () => api.get('/projects?accepted=true'),
};

// Works API
export const worksAPI = {
  upload: (projectId, workBreakdownId, file, linkUrl, editorMessage) => {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (linkUrl) formData.append('linkUrl', linkUrl);
    if (editorMessage) formData.append('editorMessage', editorMessage);
    formData.append('projectId', projectId);
    formData.append('workBreakdownId', workBreakdownId);
    return api.post('/works', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  getByProject: (projectId) => api.get(`/works/project/${projectId}`),
  getByEditor: (editorId) => api.get(`/works/editor/${editorId}`),
  getAssignedBreakdowns: () => api.get('/works/assigned-breakdowns'),
  getByWorkBreakdown: (workBreakdownId) => api.get(`/works/work-breakdown/${workBreakdownId}`),
  addCorrections: (id, text, voiceFile, mediaFiles = []) => {
    const formData = new FormData();
    formData.append('text', text || '');
    if (voiceFile) {
      formData.append('voiceFile', voiceFile);
    }
    if (mediaFiles && mediaFiles.length > 0) {
      mediaFiles.forEach(file => {
        formData.append('mediaFiles', file);
      });
    }
    return api.post(`/works/${id}/corrections`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  markCorrectionDone: (id, correctionId) => api.put(`/works/${id}/corrections/${correctionId}/done`),
  adminApprove: (id) => api.put(`/works/${id}/admin-approve`),
  clientApprove: (id) => api.put(`/works/${id}/client-approve`),
  updateStatus: (id, status) => api.put(`/works/work-breakdown/${id}/status`, { status }),
  updateDetails: (id, editorNotes, priority) => api.put(`/works/work-breakdown/${id}/details`, { editorNotes, priority }),
};

// Payments API
export const paymentsAPI = {
  getByEditor: (editorId) => api.get(`/payments/editor/${editorId}`),
  getByClient: (clientId) => api.get(`/payments/client/${clientId || ''}`),
  getAllClientPayments: () => api.get('/payments/admin/clients'),
  getByEditorForAdmin: (editorId) => api.get(`/payments/admin/editor/${editorId}`),
  markPaid: (id, screenshot) => {
    const formData = new FormData();
    if (screenshot) {
      formData.append('paymentScreenshot', screenshot);
    }
    return api.put(`/payments/${id}/pay`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  markClientPaid: (id, screenshot) => {
    const formData = new FormData();
    if (screenshot) {
      formData.append('paymentScreenshot', screenshot);
    }
    return api.put(`/payments/${id}/client-pay`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  markReceived: (id) => api.put(`/payments/${id}/received`),
  markClientReceived: (id) => api.put(`/payments/${id}/client-received`),
  markBulkPaid: (paymentIds, screenshot, extras = {}) => {
    const formData = new FormData();
    formData.append('paymentIds', JSON.stringify(paymentIds));
    if (screenshot) {
      formData.append('paymentScreenshot', screenshot);
    }
    if (extras.bonusAmount) formData.append('bonusAmount', extras.bonusAmount);
    if (extras.deductionAmount) formData.append('deductionAmount', extras.deductionAmount);
    if (extras.bonusNote) formData.append('bonusNote', extras.bonusNote);
    if (extras.deductionNote) formData.append('deductionNote', extras.deductionNote);
    if (extras.editorId) formData.append('editorId', extras.editorId);

    return api.put('/payments/pay-bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  markBulkClientPaid: (paymentIds, screenshot) => {
    const formData = new FormData();
    formData.append('paymentIds', JSON.stringify(paymentIds));
    if (screenshot) {
      formData.append('paymentScreenshot', screenshot);
    }
    return api.put('/payments/client-pay-bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  markBulkClientReceived: (paymentIds) => api.put('/payments/client-received-bulk', { paymentIds }),
  markBulkReceived: (paymentIds) => api.put('/payments/received-bulk', { paymentIds }),
  getStats: (month, year) => api.get(`/payments/stats?month=${month || ''}&year=${year || ''}`),
  getHistory: (period = 'all', type = 'all') => api.get(`/payments/history?period=${period}&type=${type}`),
  createManual: (paymentData) => api.post('/payments/manual', paymentData),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (userId) => api.delete(`/users/${userId}`),
  getEditors: () => api.get('/users/editors'),
  getEditorStats: () => api.get('/users/editors/stats'),
  getClients: () => api.get('/users/clients'),
  toggleBlock: (id) => api.put(`/users/${id}/block`),
};

// Reset API
export const resetAPI = {
  resetAll: (deleteUsers) => api.post('/reset/all', { deleteUsers }),
  getReports: () => api.get('/reset/reports'),
  downloadReport: (reportId) => api.get(`/reset/reports/${reportId}/download`, { responseType: 'blob' }),
};

// Work Breakdown API
export const workBreakdownAPI = {
  getByProject: (projectId) => api.get(`/work-breakdown/project/${projectId}`),
  getByEditor: (editorId) => api.get(`/work-breakdown/editor/${editorId}`),
  update: (id, data) => api.put(`/work-breakdown/${id}`, data),
  decline: (id) => api.put(`/work-breakdown/${id}/decline`),
  approve: (id) => api.put(`/work-breakdown/${id}/approve`),
  addFeedback: (id, content) => api.post(`/work-breakdown/${id}/feedback`, { content }),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
};

export default api;

