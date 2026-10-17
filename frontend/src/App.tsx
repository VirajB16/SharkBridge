import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { EntrepreneurDashboard } from './pages/EntrepreneurDashboard';
import { InvestorDashboard } from './pages/InvestorDashboard';
import { api } from './lib/api';
import { authService } from './lib/supabase';
import { UserRole } from './types';

interface CurrentUser {
  id?: string;
  email: string;
  role: UserRole;
  full_name: string;
}

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const saved = localStorage.getItem('sharkbridge_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Initialize API token from local storage if available
    const savedToken = localStorage.getItem('sharkbridge_token');
    if (savedToken) {
      api.setToken(savedToken);
    }

    // 2. Check API health status on boot
    api
      .getHealth()
      .then((res) => {
        setApiHealthy(res.status === 'healthy');
      })
      .catch((err) => {
        console.warn('API health check error:', err);
        setApiHealthy(false);
      });

    // 3. Multi-tab synchronization (Issue 8)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sharkbridge_user') {
        if (e.newValue) {
          try {
            setCurrentUser(JSON.parse(e.newValue));
          } catch {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      }
      if (e.key === 'sharkbridge_token') {
        api.setToken(e.newValue || null);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 4. Supabase auth state change subscription (handles email verification callbacks, multi-account, token refresh)
    const subscription = authService.onAuthStateChange((user) => {
      if (user && user.token) {
        const updatedUser: CurrentUser = {
          id: user.id,
          email: user.email,
          role: user.role,
          full_name: user.full_name,
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('sharkbridge_user', JSON.stringify(updatedUser));
        localStorage.setItem('sharkbridge_token', user.token);
        api.setToken(user.token);
      }
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      subscription.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (user: CurrentUser, token?: string) => {
    setCurrentUser(user);
    localStorage.setItem('sharkbridge_user', JSON.stringify(user));
    if (token) {
      localStorage.setItem('sharkbridge_token', token);
      api.setToken(token);
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('sharkbridge_user');
    localStorage.removeItem('sharkbridge_token');
    api.setToken(null);
    try {
      await authService.signOut();
    } catch (e) {
      console.warn('Signout note:', e);
    }
  };

  return (
    <BrowserRouter>
      <AppLayout
        currentUser={currentUser}
        onLogout={handleLogout}
        apiHealthy={apiHealthy}
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={<LoginPage onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/signup"
            element={<SignupPage onSignupSuccess={handleLoginSuccess} />}
          />

          {/* Protected Entrepreneur Route */}
          <Route
            path="/entrepreneur"
            element={
              currentUser && currentUser.role === 'entrepreneur' ? (
                <EntrepreneurDashboard user={currentUser} />
              ) : currentUser ? (
                <Navigate to="/investor" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Protected Investor Route */}
          <Route
            path="/investor"
            element={
              currentUser && currentUser.role === 'investor' ? (
                <InvestorDashboard user={currentUser} />
              ) : currentUser ? (
                <Navigate to="/entrepreneur" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default App;

