import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Paperclip, Check, Play } from 'lucide-react';
import { formatDateTime } from '../../utils/formatDate';
import { motion, AnimatePresence } from 'framer-motion';

const FeedbackChat = ({ corrections, currentUser, onMarkFixed, canMarkFixed, markingId, onClose }) => {

    if (!corrections || corrections.length === 0) {
        return (
            <Card className="w-full h-full flex items-center justify-center p-6 border-dashed">
                <div className="text-center text-muted-foreground">
                    <p>No feedback or corrections yet.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="flex flex-col h-[500px] w-full shadow-md border-border/50">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b">
                <CardTitle className="text-base font-medium">Feedback & Corrections</CardTitle>
                {onClose && (
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </CardHeader>

            <ScrollArea className="flex-1 p-4">
                <div className="flex flex-col gap-4">
                    {corrections.map((msg, index) => {
                        const isMe = msg.addedBy?._id === currentUser?._id;
                        const isMarking = markingId === msg._id;

                        return (
                            <div key={index} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback className={isMe ? "bg-primary text-primary-foreground" : "bg-muted"}>
                                        {(msg.addedBy?.name || 'U').charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className={`flex flex-col gap-1 max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                        <span className="font-medium text-foreground">{msg.addedBy?.name || 'Unknown'}</span>
                                        <span>{formatDateTime(msg.addedAt)}</span>
                                    </div>

                                    <div
                                        className={`p-3 rounded-lg text-sm shadow-sm ${isMe
                                                ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                : 'bg-card border rounded-tl-none'
                                            }`}
                                    >
                                        <p className="whitespace-pre-wrap leading-relaxed">
                                            {msg.text || <span className="italic opacity-80">Shared files</span>}
                                        </p>

                                        {/* Attachments */}
                                        {(msg.voiceFile || (msg.mediaFiles && msg.mediaFiles.length > 0)) && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {msg.voiceFile && (
                                                    <div className="bg-background/20 rounded p-1">
                                                        <audio controls src={msg.voiceFile} className="h-8 w-full max-w-[200px]" />
                                                    </div>
                                                )}

                                                {msg.mediaFiles && msg.mediaFiles.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {msg.mediaFiles.map((file, i) => (
                                                            <a
                                                                key={i}
                                                                href={file}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${isMe
                                                                        ? 'bg-primary-foreground/10 border-white/20 hover:bg-white/20'
                                                                        : 'bg-muted hover:bg-muted/80'
                                                                    }`}
                                                            >
                                                                <Paperclip className="h-3 w-3" />
                                                                Attachment {i + 1}
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-1">
                                        {msg.done ? (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 gap-1">
                                                <Check className="h-3 w-3" /> Fixed
                                            </Badge>
                                        ) : (
                                            canMarkFixed ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs gap-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                                                    onClick={() => !isMarking && onMarkFixed(msg._id)}
                                                    disabled={isMarking}
                                                >
                                                    {isMarking ? 'Marking...' : 'Mark as Fixed'}
                                                </Button>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs text-yellow-700 bg-yellow-50 border-yellow-200">
                                                    Pending Fix
                                                </Badge>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </Card>
    );
};

export default FeedbackChat;
