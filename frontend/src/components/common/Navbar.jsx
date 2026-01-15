import React from 'react';
import { Link } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Sidebar from './Sidebar';
import NotificationDropdown from './NotificationDropdown';
import { UserNav } from './UserNav';
import SupportPage from './SupportPage';
import { useAuth } from '@/context/AuthContext';

const Navbar = ({ onMenuClick }) => {
    const [showSupport, setShowSupport] = React.useState(false);
    const { user, isAdmin, isEditor, isClient } = useAuth();

    const getUserRole = () => {
        if (isAdmin) return 'admin';
        if (isEditor) return 'editor';
        if (isClient) return 'client';
        return '';
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center gap-4 bg-background/95 border-b px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                    <Sidebar />
                </SheetContent>
            </Sheet>

            <div className="flex-1">
                <h1 className="text-lg font-semibold md:text-xl text-primary">WiseCut Studios</h1>
            </div>

            <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setShowSupport(true)}>
                    Support
                </Button>
                <NotificationDropdown />
                <UserNav />
            </div>

            {/* Support Modal - kept as is but styled? SupportPage likely needs refactor too but one step at a time */}
            {showSupport && (
                <SupportPage
                    onClose={() => setShowSupport(false)}
                    userRole={getUserRole()}
                />
            )}
        </header>
    );
};

export default Navbar;
