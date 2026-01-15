import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import SupportPage from './SupportPage';
import { motion, AnimatePresence } from 'framer-motion';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAdmin, isEditor, isClient } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSupport, setShowSupport] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getDashboardPath = () => {
    if (isAdmin) return '/admin/dashboard';
    if (isEditor) return '/editor/dashboard';
    if (isClient) return '/client/dashboard';
    return '/';
  };

  const getUserRole = () => {
    if (isAdmin) return 'admin';
    if (isEditor) return 'editor';
    if (isClient) return 'client';
    return '';
  };

  const navLinks = [
    { name: 'Dashboard', path: getDashboardPath() },
    ...(isAdmin ? [
      { name: 'Users', path: '/admin/users' },
      { name: 'Payments', path: '/admin/payments' }
    ] : []),
    ...(isEditor ? [
      { name: 'Payments', path: '/editor/payments' }
    ] : []),
    ...(isClient ? [
      { name: 'Payments', path: '/client/payments' }
    ] : [])
  ];

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-left">
            <Link to={getDashboardPath()} className="navbar-brand">
              WiseCut Studios
            </Link>

            {/* Desktop Navigation */}
            {user && (
              <div className="navbar-menu-desktop">
                {navLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="navbar-actions">
            {user && (
              <>
                <div className="navbar-user-desktop">
                  <NotificationDropdown />
                  <div className="user-profile">
                    <div className="user-avatar">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <span className="user-name">{user.name}</span>
                      <span className="user-role-badge">{user.role}</span>
                    </div>
                  </div>
                  <button
                    className="nav-action-btn support-btn"
                    onClick={() => setShowSupport(true)}
                    title="Support"
                  >
                    <span className="icon">💬</span>
                    <span>Support</span>
                  </button>
                  <button onClick={handleLogout} className="nav-logout-btn">
                    Logout
                  </button>
                </div>

                <button
                  className={`mobile-toggle ${isMobileMenuOpen ? 'active' : ''}`}
                  onClick={toggleMobileMenu}
                >
                  <div className="hamburger"></div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              className="navbar-mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="mobile-menu-content">
                {navLinks.map(link => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="mobile-link"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                <div className="mobile-user-section">
                  <div className="mobile-user-info">
                    <p className="name">{user.name}</p>
                    <p className="role">{user.role}</p>
                  </div>
                  <div className="mobile-actions">
                    <button
                      className="mobile-action-btn"
                      onClick={() => {
                        setShowSupport(true);
                        setIsMobileMenuOpen(false);
                      }}
                    >
                      💬 Support
                    </button>
                    <button onClick={handleLogout} className="mobile-logout-btn">
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Support Modal */}
      {showSupport && (
        <SupportPage
          onClose={() => setShowSupport(false)}
          userRole={getUserRole()}
        />
      )}
    </>
  );
};

export default Navbar;

