const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Load user with memberships
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // SaaS Logic: Determine Context
      const orgId = req.headers['x-organization-id'] || req.user.currentOrganization?.toString();

      if (orgId) {
        const membership = req.user.memberships.find(m => m.organization.toString() === orgId);
        if (membership) {
          req.organizationId = orgId;
          req.memberRole = membership.role;
          req.permissions = membership.permissions;
        }
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // SaaS Check: If we have an org context, check memberRole
    if (req.memberRole) {
      if (!roles.includes(req.memberRole)) {
        return res.status(403).json({ message: `Organization role ${req.memberRole} is not authorized` });
      }
      return next();
    }

    // Legacy Check: Fallback to global user role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};

const { ROLE_PERMISSIONS } = require('../config/permissions');

// ... existing code ...

const checkPermission = (permission) => {
  return (req, res, next) => {
    // 1. Get role from Organization Context (preferred) or Legacy User Role
    const role = req.memberRole || req.user.role;

    // 2. Admin Super-user check (always allow global admin)
    if (req.user.role === 'admin' || role === 'admin') {
      return next();
    }

    // 3. Check if role has permission
    const allowedPermissions = ROLE_PERMISSIONS[role] || [];

    // 4. Check for granular permission overrides in membership
    const granularPermissions = req.permissions || [];

    if (allowedPermissions.includes(permission) || granularPermissions.includes(permission)) {
      return next();
    }

    return res.status(403).json({
      message: `Access denied. Role '${role}' lacks permission '${permission}'.`
    });
  };
};

module.exports = { protect, authorize, checkPermission };

