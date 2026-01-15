import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/utils/cn';

const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const unreadCountRef = useRef(0);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        unreadCountRef.current = unreadCount;
    }, [unreadCount]);

    const fetchNotifications = async (isPoll = false) => {
        try {
            const res = await api.get('/notifications');
            const newNotifications = res.data;
            const newUnreadCount = newNotifications.filter(n => !n.read).length;

            if (isPoll && newUnreadCount > unreadCountRef.current) {
                const audio = new Audio('/sounds/notification.mp3');
                audio.currentTime = 0;
                audio.play().catch(e => console.warn('Notification sound blocked:', e));
            }

            setNotifications(newNotifications);
            setUnreadCount(newUnreadCount);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(() => fetchNotifications(true), 60000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (id, relatedProject) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n =>
                n._id === id ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
            // Navigation logic here if needed
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllRead = async (e) => {
        e.preventDefault();
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const visibleNotifications = notifications; // Show all, maybe filter?

    return (
        <DropdownMenu open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (open) fetchNotifications();
        }}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-600 ring-2 ring-background" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex justify-between items-center">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleMarkAllRead}>
                            Mark all read
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-80">
                    {visibleNotifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        visibleNotifications.map(notif => (
                            <DropdownMenuItem
                                key={notif._id}
                                className="cursor-pointer flex flex-col items-start gap-1 p-3"
                                onClick={() => handleMarkAsRead(notif._id, notif.relatedProject)}
                            >
                                <div className="flex w-full justify-between items-start">
                                    <span className={cn("font-medium text-sm", !notif.read && "text-primary")}>
                                        {notif.title}
                                    </span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                        {new Date(notif.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {notif.message}
                                </p>
                                {!notif.read && (
                                    <span className="h-2 w-2 rounded-full bg-blue-500 mt-1 self-end" />
                                )}
                            </DropdownMenuItem>
                        ))
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default NotificationDropdown;
