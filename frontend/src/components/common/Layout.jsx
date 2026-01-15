import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  return (
    <div className="flex min-h-screen w-full bg-background font-sans antialiased">
      {/* Sidebar for Desktop */}
      <div className="hidden md:block fixed inset-y-0 z-50 h-full w-64 border-r bg-card">
        <Sidebar className="h-full" />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col w-full md:pl-64 transition-all duration-300">
        <Navbar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-100">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
