import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Briefcase, Check } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { AlertBanner } from '../components/common/AlertBanner';
import { UserRole } from '../types';
import { authService, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../lib/api';

interface SignupPageProps {
  onSignupSuccess?: (user: { id: string; email: string; role: UserRole; full_name: string }) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ onSignupSuccess }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get('role') as UserRole) || 'entrepreneur';

  const [role, setRole] = useState<UserRole>(initialRole);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryRole = searchParams.get('role') as UserRole;
    if (queryRole === 'entrepreneur' || queryRole === 'investor') {
      setRole(queryRole);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!fullName.trim() || !email.trim() || !password) {
        throw new Error('Please fill in all required fields.');
      }
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      if (isSupabaseConfigured) {
        const sessionUser = await authService.signUp(email, password, role, fullName);
        if (sessionUser.token) {
          api.setToken(sessionUser.token);
          // Sync profile to backend
          try {
            await api.createProfile({ role, full_name: fullName });
          } catch (syncErr) {
            console.warn('Backend profile sync note:', syncErr);
          }
        }
        if (onSignupSuccess) {
          onSignupSuccess(sessionUser);
        }
        navigate(role === 'entrepreneur' ? '/entrepreneur' : '/investor');
      } else {
        // Fallback demo signup
        const demoUser = {
          id: '00000000-0000-0000-0000-000000000001',
          email,
          role,
          full_name: fullName,
        };
        api.setToken(`demo-token-${role}`);
        if (onSignupSuccess) {
          onSignupSuccess(demoUser);
        }
        navigate(role === 'entrepreneur' ? '/entrepreneur' : '/investor');
      }
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#101828]">Create Your Account</h1>
        <p className="text-sm text-[#667085] mt-1.5">
          Join SharkBridge to discover funding opportunities or evaluate vetted SMEs.
        </p>
      </div>

      <Card>
        {error && <AlertBanner type="error" message={error} className="mb-4" />}

        {/* Role Selection Required by PRD */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#101828] mb-2.5">
            Select Your Role <span className="text-[#C43232]">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('entrepreneur')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                role === 'entrepreneur'
                  ? 'border-[#101828] bg-gray-50 ring-2 ring-[#101828]/10'
                  : 'border-[#E4E7EC] bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-teal-accent/20 flex items-center justify-center text-teal-dark">
                  <Building2 className="w-4 h-4" />
                </div>
                {role === 'entrepreneur' && (
                  <span className="w-5 h-5 rounded-full bg-[#101828] text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-sm text-[#101828]">Entrepreneur</h4>
              <p className="text-xs text-[#667085] mt-1">
                Looking to present business opportunities and connect with relevant investors.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRole('investor')}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                role === 'investor'
                  ? 'border-[#101828] bg-gray-50 ring-2 ring-[#101828]/10'
                  : 'border-[#E4E7EC] bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#101828]/10 flex items-center justify-center text-[#101828]">
                  <Briefcase className="w-4 h-4" />
                </div>
                {role === 'investor' && (
                  <span className="w-5 h-5 rounded-full bg-[#101828] text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </div>
              <h4 className="font-semibold text-sm text-[#101828]">Investor</h4>
              <p className="text-xs text-[#667085] mt-1">
                Looking to discover high-potential businesses matching your investment thesis.
              </p>
            </button>
          </div>
          <p className="text-xs text-[#667085] mt-2 italic">
            Note: Your account role is set upon registration to safeguard role-based access.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Aarav Patel"
            required
          />

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
            placeholder="Min. 6 characters"
            helperText="Must be at least 6 characters"
            required
          />

          <Button type="submit" variant="primary" className="w-full mt-3" isLoading={loading}>
            Create {role === 'entrepreneur' ? 'Entrepreneur' : 'Investor'} Account
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-sm text-[#667085]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#101828] font-semibold hover:underline">
            Log in
          </Link>
        </div>
      </Card>
    </div>
  );
};
