import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { AlertBanner } from '../components/common/AlertBanner';
import { authService, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../lib/api';
import { Building2, Briefcase, Zap } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess?: (user: { id: string; email: string; role: 'entrepreneur' | 'investor'; full_name: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error('Please enter both email and password.');
      }

      if (isSupabaseConfigured) {
        const sessionUser = await authService.signIn(email, password);
        if (sessionUser.token) {
          api.setToken(sessionUser.token);
        }
        if (onLoginSuccess) {
          onLoginSuccess(sessionUser);
        }
        navigate(sessionUser.role === 'entrepreneur' ? '/entrepreneur' : '/investor');
      } else {
        // Fallback demo login
        handleDemoLogin(email.toLowerCase().includes('investor') ? 'investor' : 'entrepreneur');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (role: 'entrepreneur' | 'investor') => {
    const demoToken = `demo-token-${role}`;
    api.setToken(demoToken);

    const user = {
      id: role === 'entrepreneur' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
      email: role === 'entrepreneur' ? 'demo_entrepreneur@sharkbridge.io' : 'demo_investor@sharkbridge.io',
      role,
      full_name: role === 'entrepreneur' ? 'Aarav Patel (Demo)' : 'Priya Sharma (Apex Ventures)',
    };

    if (onLoginSuccess) {
      onLoginSuccess(user);
    }
    navigate(role === 'entrepreneur' ? '/entrepreneur' : '/investor');
  };

  return (
    <div className="max-w-md mx-auto py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#101828]">Welcome Back</h1>
        <p className="text-sm text-[#667085] mt-1">
          Log in to manage funding applications and investor evaluations.
        </p>
      </div>

      <Card>
        {error && <AlertBanner type="error" message={error} className="mb-4" />}

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" variant="primary" className="w-full mt-2" isLoading={loading}>
            Log In
          </Button>
        </form>

        {/* Demo Fast-Login Section for Quick Testing/Review */}
        <div className="mt-6 pt-5 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            <Zap className="w-3.5 h-3.5 text-teal-dark" />
            Quick Demo Accounts (Evaluation)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs w-full justify-center"
              onClick={() => handleDemoLogin('entrepreneur')}
            >
              <Building2 className="w-3.5 h-3.5 mr-1 text-teal-dark" />
              Demo Entrepreneur
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs w-full justify-center"
              onClick={() => handleDemoLogin('investor')}
            >
              <Briefcase className="w-3.5 h-3.5 mr-1 text-[#101828]" />
              Demo Investor
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm text-[#667085]">
          Don't have an account?{' '}
          <Link to="/signup" className="text-[#101828] font-semibold hover:underline">
            Sign up
          </Link>
        </div>
      </Card>
    </div>
  );
};
