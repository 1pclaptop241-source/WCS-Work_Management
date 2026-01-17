import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background font-sans antialiased">
      {/* Sidebar for Desktop */}
      <div
        className={`hidden md:block fixed inset-y-0 z-50 h-full border-r bg-card transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        <Sidebar
          className="h-full"
          isCollapsed={isCollapsed}
          toggleCollapse={() => setIsCollapsed(!isCollapsed)}
        />
      </div>

      {/* Main Content Area */}
      <div
        className={`flex flex-col w-full transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}
      >
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
