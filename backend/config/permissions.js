const PERMISSIONS = {
    // Project Permissions
    PROJECT_CREATE: 'project:create',
    PROJECT_READ: 'project:read',
    PROJECT_UPDATE: 'project:update',
    PROJECT_DELETE: 'project:delete',
    PROJECT_ASSIGN: 'project:assign',
    PROJECT_APPROVE: 'project:approve',

    // Finance Permissions
    FINANCE_VIEW_BUDGET: 'finance:view_budget',
    FINANCE_MANAGE_PAYMENTS: 'finance:manage_payments',
    FINANCE_VIEW_OWN: 'finance:view_own',

    // User/Org Permissions
    USER_INVITE: 'user:invite',
    USER_MANAGE_ROLES: 'user:manage_roles',
    ORG_SETTINGS: 'org:settings',
};

const ROLE_PERMISSIONS = {
    admin: Object.values(PERMISSIONS),
    manager: [
        PERMISSIONS.PROJECT_CREATE,
        PERMISSIONS.PROJECT_READ,
        PERMISSIONS.PROJECT_UPDATE,
        PERMISSIONS.PROJECT_ASSIGN,
        PERMISSIONS.PROJECT_APPROVE,
        PERMISSIONS.FINANCE_VIEW_BUDGET,
        PERMISSIONS.USER_INVITE,
    ],
    editor: [
        PERMISSIONS.PROJECT_READ,
        PERMISSIONS.PROJECT_UPDATE, // Only assigned tasks
        PERMISSIONS.FINANCE_VIEW_OWN,
    ],
    client: [
        PERMISSIONS.PROJECT_CREATE,
        PERMISSIONS.PROJECT_READ,
        PERMISSIONS.PROJECT_APPROVE,
        PERMISSIONS.FINANCE_MANAGE_PAYMENTS, // Paying for their own projects
    ],
    viewer: [
        PERMISSIONS.PROJECT_READ,
    ]
};

module.exports = { PERMISSIONS, ROLE_PERMISSIONS };
