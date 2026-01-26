import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/use-toast'; // Assuming we have a toast hook

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user, isAuthenticated } = useAuth();

    useEffect(() => {
        let newSocket;

        if (isAuthenticated && user) {
            // Initialize socket connection
            // Use env or default to localhost:5000
            const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

            newSocket = io(SOCKET_URL);

            newSocket.on('connect', () => {
                console.log('Socket connected:', newSocket.id);
                // Join user room
                newSocket.emit('join', user._id || user.id);
            });

            newSocket.on('notification', (notification) => {
                try {
                    // Show toast
                    toast({
                        title: notification.title || 'Notification',
                        description: notification.message || '',
                        variant: "default",
                    });
                } catch (err) {
                    console.error('Notification toast error:', err);
                }

                // Play sound? (Optional)
            });

            setSocket(newSocket);
        }

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [isAuthenticated, user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
