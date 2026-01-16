import { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentOrg, setCurrentOrg] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      // Try to get last selected org
      const savedOrgId = localStorage.getItem('currentOrgId');

      if (token) {
        try {
          const response = await authAPI.getMe();
          const userData = response.data;
          setUser(userData);

          // SaaS Logic: Set Initial Organization
          if (userData.memberships && userData.memberships.length > 0) {
            const defaultOrg = userData.memberships.find(m => m.organization._id === savedOrgId)?.organization
              || userData.memberships[0].organization;
            setCurrentOrg(defaultOrg);
            localStorage.setItem('currentOrgId', defaultOrg._id);
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('currentOrgId');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { token, ...userData } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // SaaS: Auto-select first org
      if (userData.memberships && userData.memberships.length > 0) {
        const org = userData.memberships[0].organization;
        setCurrentOrg(org);
        localStorage.setItem('currentOrgId', org._id);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentOrgId');
    setUser(null);
    setCurrentOrg(null);
  };

  const switchOrganization = (orgId) => {
    if (!user) return;
    const membership = user.memberships.find(m => m.organization._id === orgId);
    if (membership) {
      setCurrentOrg(membership.organization);
      localStorage.setItem('currentOrgId', membership.organization._id);
      window.location.reload(); // Reload to refresh data context
    }
  }

  const value = {
    user,
    loading,
    currentOrg,
    switchOrganization,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isEditor: user?.role === 'editor',
    isClient: user?.role === 'client',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

