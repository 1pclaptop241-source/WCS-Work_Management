import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmDialog, AlertDialog } from '../components/common/ConfirmDialog';

const DialogContext = createContext();

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

export const DialogProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        onCancel: () => { },
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        isDanger: false,
    });

    const [alertState, setAlertState] = useState({
        isOpen: false,
        title: '',
        message: '',
        onOk: () => { },
        okText: 'OK',
    });

    const confirm = useCallback(({ title = 'Confirmation', message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                isDanger,
                onConfirm: () => {
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmState(prev => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    }, []);

    const alert = useCallback(({ title = 'Alert', message, okText = 'OK' }) => {
        return new Promise((resolve) => {
            setAlertState({
                isOpen: true,
                title,
                message,
                okText,
                onOk: () => {
                    setAlertState(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                }
            });
        });
    }, []);

    // Helper alias for simpler usage similar to window.alert
    const showAlert = useCallback((message, title = 'Alert') => {
        return alert({ title, message });
    }, [alert]);

    return (
        <DialogContext.Provider value={{ confirm, alert, showAlert }}>
            {children}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={confirmState.onCancel}
                confirmText={confirmState.confirmText}
                cancelText={confirmState.cancelText}
                isDanger={confirmState.isDanger}
            />
            <AlertDialog
                isOpen={alertState.isOpen}
                title={alertState.title}
                message={alertState.message}
                onOk={alertState.onOk}
                okText={alertState.okText}
            />
        </DialogContext.Provider>
    );
};
