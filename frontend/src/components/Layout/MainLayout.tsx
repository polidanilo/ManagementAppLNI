import React from 'react';
import BottomNav from './BottomNav.tsx';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <main className="flex-1 pb-16">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default MainLayout;