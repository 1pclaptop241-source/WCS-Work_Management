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

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Sidebar = ({ className, onClose, isCollapsed, toggleCollapse }) => {
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

    const SidebarLink = ({ link }) => (
        <NavLink
            to={link.path}
            onClick={onClose}
            className={({ isActive }) => cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
                isCollapsed && "justify-center px-2"
            )}
        >
            <link.icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
            {!isCollapsed && <span>{link.name}</span>}
        </NavLink>
    );

    return (
        <TooltipProvider>
            <div className={cn("relative pb-12 min-h-screen bg-card border-r shadow-sm flex flex-col", className, isCollapsed ? "w-20" : "w-64")}>
                <div className="space-y-4 py-4 flex-1">
                    <div className="px-3 py-2">
                        {!isCollapsed ? (
                            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-primary transition-opacity duration-300">
                                WiseCut Studios
                            </h2>
                        ) : (
                            <div className="flex justify-center mb-6">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                    WS
                                </div>
                            </div>
                        )}

                        <div className="space-y-1">
                            {links.map((link) => (
                                isCollapsed ? (
                                    <Tooltip key={link.path} delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <div> {/* Div wrapper needed for tooltip trigger sometimes */}
                                                <SidebarLink link={link} />
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">
                                            {link.name}
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <SidebarLink key={link.path} link={link} />
                                )
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="p-4 mt-auto border-t bg-card/50">
                    <div className={cn("flex gap-2 items-center mb-4 transition-all duration-300", isCollapsed && "justify-center flex-col")}>
                        <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                        </div>

                        {!isCollapsed && (
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-medium truncate">{user.name}</span>
                                <span className="text-xs text-muted-foreground capitalize truncate">{user.role}</span>
                            </div>
                        )}
                    </div>

                    {isCollapsed ? (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-full justify-center" onClick={logout}>
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Logout</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Button variant="destructive" className="w-full justify-start" onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </Button>
                    )}
                </div>

                {/* Toggle Button */}
                {toggleCollapse && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent z-50 hidden md:flex"
                        onClick={toggleCollapse}
                    >
                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    </Button>
                )}
            </div>
        </TooltipProvider>
    );
};

export default Sidebar;
