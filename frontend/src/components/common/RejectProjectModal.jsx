import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const RejectProjectModal = ({ isOpen, onClose, onConfirm, isRejecting }) => {
    const [rejectionReason, setRejectionReason] = useState('');

    const handleConfirm = () => {
        onConfirm(rejectionReason);
        setRejectionReason(''); // Reset after confirm
    };

    const handleClose = () => {
        setRejectionReason('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reject Project</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to reject this project? The client will be notified via email.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Rejection Reason (Optional)</Label>
                        <Textarea
                            placeholder="Explain why the project is being rejected..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={isRejecting}
                    >
                        {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RejectProjectModal;
