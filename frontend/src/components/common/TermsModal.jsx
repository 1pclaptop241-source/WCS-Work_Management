import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const TermsModal = () => {
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [show, setShow] = useState(true);

    // Only hide if specifically true. If undefined/null/false, SHOW IT.
    if (!user || user.role === 'admin' || user.agreedToTerms === true || !show) {
        return null;
    }

    const agreementFile = user.role === 'client'
        ? '/agreements/Clientagreement.pdf'
        : '/agreements/Editoragreement.pdf';

    const handleAgree = async () => {
        if (!agreed) {
            setError('Please read and check the agreement box.');
            return;
        }

        try {
            setLoading(true);
            const response = await authAPI.agreeTerms();

            // Updating local storage to match new state
            // eslint-disable-next-line no-unused-vars
            const updatedUser = { ...user, ...response.data };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Force reload ensures the entire app (including context) receives the new 'agreedToTerms: true'
            // This prevents the modal from reopening
            window.location.reload();
        } catch (err) {
            console.error('Agreement error:', err);
            setError(err.response?.data?.message || 'Failed to update agreement status.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        // If they close the modal without agreeing, they cannot proceed.
        // We log them out to enforce the requirement.
        logout();
        window.location.href = '/login';
    };

    return (
        <Dialog open={true} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 gap-0" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="text-2xl font-bold">Terms and Conditions</DialogTitle>
                    <DialogDescription>
                        Please read and accept our terms of service to continue using the platform.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 bg-muted/30 relative border-y">
                    <iframe
                        src={agreementFile}
                        title="Terms and Conditions"
                        className="w-full h-full absolute inset-0"
                    />
                </div>

                <div className="p-6 space-y-4 bg-background z-10">
                    <div className="text-center text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        Can't see the document? <a href={agreementFile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">Open in new tab <ExternalLink className="h-3 w-3" /></a>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="terms"
                                checked={agreed}
                                onCheckedChange={(checked) => {
                                    setAgreed(checked);
                                    if (checked) setError('');
                                }}
                            />
                            <Label
                                htmlFor="terms"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                                I have read and agree to the Terms and Conditions
                            </Label>
                        </div>

                        <div className="flex gap-3 w-full sm:w-auto">
                            <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1 sm:flex-none">
                                Decline & Logout
                            </Button>
                            <Button onClick={handleAgree} disabled={loading || !agreed} className="flex-1 sm:flex-none">
                                {loading ? 'Processing...' : 'Accept & Continue'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TermsModal;
