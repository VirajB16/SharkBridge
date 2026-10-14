import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { EntrepreneurDashboard } from './pages/EntrepreneurDashboard';
import { InvestorDashboard } from './pages/InvestorDashboard';
import { api } from './lib/api';
import { UserRole } from './types';

interface CurrentUser {
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
    // Check API health status on boot
    api
      .getHealth()
      .then((res) => {
        setApiHealthy(res.status === 'healthy');
      })
      .catch((err) => {
        console.warn('API health check error:', err);
        setApiHealthy(false);
      });
  }, []);

  const handleLoginSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    localStorage.setItem('sharkbridge_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sharkbridge_user');
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

