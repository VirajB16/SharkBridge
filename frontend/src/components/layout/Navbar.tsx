import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, User } from 'lucide-react';
import { Button } from '../common/Button';

interface NavbarProps {
  currentUser?: {
    email: string;
    role: 'entrepreneur' | 'investor';
    full_name: string;
  } | null;
  onLogout?: () => void;
  apiHealthy?: boolean | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout, apiHealthy }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E4E7EC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-[#101828] flex items-center justify-center text-[#22C7C9] font-bold text-lg shadow-sm transition-transform group-hover:scale-105">
                SB
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-[#101828] leading-tight">
                  Shark<span className="text-[#22C7C9]">Bridge</span>
                </span>
                <span className="text-[10px] text-[#667085] font-medium tracking-wide">
                  SME FUNDING MATCH
                </span>
              </div>
            </Link>

            {/* Health Pill (Dev/Demo aid) */}
            {apiHealthy !== undefined && (
              <span
                title={apiHealthy ? 'Backend API connected' : 'Backend API disconnected'}
                className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    apiHealthy ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'
                  }`}
                />
                API {apiHealthy ? 'Ready' : 'Offline'}
              </span>
            )}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {!currentUser ? (
              <>
                <a href="#how-it-works" className="text-sm font-medium text-[#667085] hover:text-[#101828]">
                  How It Works
                </a>
                <a href="#principles" className="text-sm font-medium text-[#667085] hover:text-[#101828]">
                  Principles
                </a>
                <div className="h-4 w-px bg-gray-200" />
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button variant="secondary" size="sm" className="shadow-sm">
                    Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to={currentUser.role === 'entrepreneur' ? '/entrepreneur' : '/investor'}
                  className="text-sm font-medium text-[#101828] hover:text-[#22C7C9]"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-[#101828] text-white">
                    <User className="w-3 h-3 text-[#22C7C9]" />
                    {currentUser.role}
                  </span>
                  <span className="text-sm text-[#101828] font-medium max-w-[150px] truncate">
                    {currentUser.full_name || currentUser.email}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-3 pb-6 space-y-3">
          {!currentUser ? (
            <>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-gray-700"
              >
                How It Works
              </a>
              <a
                href="#principles"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-gray-700"
              >
                Principles
              </a>
              <div className="pt-2 flex flex-col gap-2">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
                  <p className="text-xs text-gray-500">{currentUser.email}</p>
                </div>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-[#101828] text-white">
                  {currentUser.role}
                </span>
              </div>
              <Link
                to={currentUser.role === 'entrepreneur' ? '/entrepreneur' : '/investor'}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-gray-900"
              >
                Go to Dashboard
              </Link>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onLogout) onLogout();
                }}
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

