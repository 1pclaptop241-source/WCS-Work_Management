import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { workBreakdownAPI } from '../../services/api'; // Ensure this has addDiscussionMessage
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DiscussionChat = ({ workId, initialMessages = [], onClose }) => {
    const { socket } = useSocket();
    const { user } = useAuth();
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef(null);

    const [isConnected, setIsConnected] = useState(false);

    // Sync initialMessages if they update (e.g. from parent re-fetch)
    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    useEffect(() => {
        if (!socket) return;

        // Monitoring connection status
        setIsConnected(socket.connected);
        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        if (workId) {
            // Join the discussion room for this work item
            console.log(`Joining discussion room: work_${workId}`);
            socket.emit('join_work_room', workId);
        }

        // Listen for incoming messages
        const handleReceiveMessage = (message) => {
            console.log('Received socket message:', message);
            // Dedupe strategy: compare timestamp or ID if available. 
            // For now, checks if we already have this exact message object (unlikely if new obj refs)
            // Better: Check if we have a message with same content & sender & approximately same time?
            // Or rely on ID. workBreakdownController returns message with _id? No, it returns subdoc.
            // Let's rely on ID check if available, otherwise just append.
            setMessages((prev) => {
                const exists = prev.some(m =>
                    (m._id && message._id && m._id === message._id) ||
                    (m.timestamp === message.timestamp && m.content === message.content && m.from._id === message.from._id)
                );
                if (exists) return prev;
                return [...prev, message];
            });
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [socket, workId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const tempContent = newMessage;
        setNewMessage(''); // Clear input immediately for UX

        try {
            setIsSending(true);
            // Sending via API
            const response = await workBreakdownAPI.addDiscussionMessage(workId, tempContent);
            const savedMessage = response.data;

            // Immediately append to list (sender UX)
            setMessages((prev) => [...prev, savedMessage]);

        } catch (error) {
            console.error('Failed to send message:', error);
            // Restore message if failed?
            setNewMessage(tempContent);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[400px] border rounded-lg bg-background">
            <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Discussion</h3>
                </div>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
                        <X className="h-3 w-3" />
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-8 opacity-50">
                            No messages yet. Start the conversation!
                        </div>
                    )}
                    {messages.map((msg, index) => {
                        const isMe = msg.from?._id === user._id || msg.from === user._id; // Handle populated vs unpopulated
                        const senderName = msg.from?.name || 'User';

                        return (
                            <div key={index} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {!isMe && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${senderName}`} />
                                        <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${isMe
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                    }`}>
                                    {!isMe && <p className="text-xs font-semibold mb-1 opacity-70">{senderName}</p>}
                                    <p>{msg.content}</p>
                                    <span className="text-[10px] opacity-70 block text-right mt-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            <form onSubmit={handleSendMessage} className="p-3 border-t flex gap-2">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={isSending}
                />
                <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
};

export default DiscussionChat;
