import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    CheckSquare,
    FolderKanban,
    Activity,
    Upload,
    LogOut,
    Menu
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';

const Sidebar = ({ className, onClose }) => {
    const { user, logout, isAdmin, isEditor, isClient } = useAuth();

    if (!user) return null;

    const getLinks = () => {
        const links = [{ name: 'Dashboard', path: getDashboardPath(), icon: LayoutDashboard }];

        if (isAdmin) {
            links.push(
                { name: 'Users', path: '/admin/users', icon: Users },
                { name: 'Payments', path: '/admin/payments', icon: CreditCard },
                { name: 'Activity', path: '/admin/activity-logs', icon: Activity }
            );
        }

        if (isEditor) {
            links.push(
                { name: 'Payments', path: '/editor/payments', icon: CreditCard }
            );
        }

        if (isClient) {
            links.push(
                { name: 'Payments', path: '/client/payments', icon: CreditCard }
            );
        }

        return links;
    };

    const getDashboardPath = () => {
        if (isAdmin) return '/admin/dashboard';
        if (isEditor) return '/editor/dashboard';
        if (isClient) return '/client/dashboard';
        return '/';
    };

    const links = getLinks();

    return (
        <div className={cn("pb-12 min-h-screen w-64 bg-card border-r shadow-sm", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-primary">
                        WiseCut Studios
                    </h2>
                    <div className="space-y-1">
                        {links.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                onClick={onClose}
                                className={({ isActive }) => cn(
                                    "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                                )}
                            >
                                <link.icon className="mr-2 h-4 w-4" />
                                {link.name}
                            </NavLink>
                        ))}
                    </div>
                </div>
            </div>
            <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 mb-4 px-2">
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                    </div>
                </div>
                <Button variant="destructive" className="w-full justify-start" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    );
};

export default Sidebar;
