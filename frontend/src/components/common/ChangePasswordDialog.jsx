import React, { useState } from 'react';
import { useDialog } from '../../context/DialogContext';
import { authAPI } from '../../services/api';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const ChangePasswordDialog = ({ open, onOpenChange }) => {
    const { showAlert } = useDialog();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        if (formData.newPassword !== formData.confirmPassword) {
            await showAlert("New passwords don't match", 'Error');
            return;
        }

        if (formData.newPassword.length < 6) {
            await showAlert("Password must be at least 6 characters", 'Error');
            return;
        }

        try {
            setLoading(true);
            await authAPI.changePassword({
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });

            await showAlert('Password updated successfully', 'Success');
            onOpenChange(false);
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            await showAlert(err.response?.data?.message || 'Failed to update password', 'Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="current">Current Password</Label>
                        <PasswordInput
                            id="current"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="new">New Password</Label>
                        <PasswordInput
                            id="new"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="confirm">Confirm New Password</Label>
                        <PasswordInput
                            id="confirm"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default ChangePasswordDialog;
