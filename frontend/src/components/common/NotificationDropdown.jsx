import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api'; // Adjust path as needed
import './NotificationDropdown.css'; // We'll need some styles

const NotificationDropdown = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const unreadCountRef = useRef(0); // Ref to track unreadCount for interval closure
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // Sync ref with state
    useEffect(() => {
        unreadCountRef.current = unreadCount;
    }, [unreadCount]);

    const fetchNotifications = async (isPoll = false) => {
        try {
            const res = await api.get('/notifications');
            const newNotifications = res.data;
            const newUnreadCount = newNotifications.filter(n => !n.read).length;

            // Play sound if new unread notification detected and it's not the initial load
            // Use ref to compare against latest state, avoiding stale closure
            if (isPoll && newUnreadCount > unreadCountRef.current) {
                const audio = new Audio('/sounds/notification.mp3');
                audio.currentTime = 0;
                audio.play().catch(e => console.warn('Notification sound blocked (user interaction required):', e));
            }

            setNotifications(newNotifications);
            setUnreadCount(newUnreadCount);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const publicVapidKey = 'BNkFJo9qLIl4SwPzr5UkvVE74joxfzlfvTvdPHTo_GyW8n34uVmbIvInLyvnu3ACDMdOYmEi_7YCXecH3yXJvAg';

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every minute
        const interval = setInterval(() => fetchNotifications(true), 60000);

        // Register Service Worker and Subscribe
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            const registerPush = async () => {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('Service Worker Registered');

                    // Check if already subscribed
                    let subscription = await registration.pushManager.getSubscription();

                    if (!subscription) {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                            subscription = await registration.pushManager.subscribe({
                                userVisibleOnly: true,
                                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                            });
                        }
                    } else {
                        console.log('Already subscribed to push');
                    }

                    if (subscription) {
                        // Send subscription to backend (Upsert logic in backend handles duplicates)
                        await api.post('/notifications/subscribe', subscription);
                        console.log('Push subscription synced with backend');
                    }
                } catch (error) {
                    console.error('Service Worker/Push Error:', error);
                }
            };

            registerPush();
        }

        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Refresh on open
            fetchNotifications();
        }
    };

    const handleMarkAsRead = async (id, relatedProject) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(notifications.map(n =>
                n._id === id ? { ...n, read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));

            if (relatedProject) {
                // Navigate to related project if needed, check role to decide path
                // For simplified navigation, maybe just go to dashboard or specific project page
                // Assuming /projects/:id or /editor/projects/:id logic exists
                // We'll just close for now or try to navigate
                // navigate(`/projects/${relatedProject}`); // Example
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const visibleNotifications = notifications.filter(n => !n.read);

    return (
        <div className="notification-dropdown-container" ref={dropdownRef}>
            <button className="notification-bell-btn" onClick={handleToggle}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown-menu">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} className="mark-all-read-btn">Mark all read</button>
                        )}
                    </div>
                    <div className="notification-list">
                        {visibleNotifications.length === 0 ? (
                            <p className="no-notifications">No new notifications</p>
                        ) : (
                            visibleNotifications.map(notif => (
                                <div key={notif._id} className="notification-item unread" onClick={() => handleMarkAsRead(notif._id, notif.relatedProject)}>
                                    <div className="notification-content">
                                        <p className="notification-title">{notif.title}</p>
                                        <p className="notification-message">{notif.message}</p>
                                        <span className="notification-time">{new Date(notif.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="unread-dot"></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
