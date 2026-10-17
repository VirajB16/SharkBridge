import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { SharkAssistant } from '../common/SharkAssistant';

interface AppLayoutProps {
  children: React.ReactNode;
  currentUser?: {
    email: string;
    role: 'entrepreneur' | 'investor';
    full_name: string;
  } | null;
  onLogout?: () => void;
  apiHealthy?: boolean | null;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentUser,
  onLogout,
  apiHealthy,
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-[#172033]">
      <Navbar currentUser={currentUser} onLogout={onLogout} apiHealthy={apiHealthy} />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <Footer />
      {/* 24/7 Platform Personal Assistant Guide (Issue 4) */}
      <SharkAssistant userRole={currentUser?.role} />
    </div>
  );
};

