import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Briefcase, Check, Mail, AlertCircle } from 'lucide-react';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { AlertBanner } from '../components/common/AlertBanner';
import { UserRole } from '../types';
import { authService, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../lib/api';

interface SignupPageProps {
  onSignupSuccess?: (
    user: { id: string; email: string; role: UserRole; full_name: string },
    token?: string
  ) => void;
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
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // In-flight guard to prevent duplicate API requests (Issue 11)
  const isSubmittingRef = useRef<boolean>(false);

  useEffect(() => {
    const queryRole = searchParams.get('role') as UserRole;
    if (queryRole === 'entrepreneur' || queryRole === 'investor') {
      setRole(queryRole);
    }
  }, [searchParams]);

  // Cooldown countdown timer for 429 rate limit
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading || cooldownSeconds > 0) {
      return;
    }

    setError(null);

    // Client-side validations (Issue 1)
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Full Name is required.');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Full Name must be at least 2 characters long.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      if (isSupabaseConfigured) {
        const sessionUser = await authService.signUp(trimmedEmail, password, role, trimmedName);

        // If email confirmation is required by Supabase, inform user clearly (Issue 8)
        if (sessionUser.needsEmailConfirmation) {
          setEmailSentTo(trimmedEmail);
          return;
        }

        if (sessionUser.token) {
          api.setToken(sessionUser.token);

          // Sync profile to backend database
          try {
            await api.createProfile({ role, full_name: trimmedName });
          } catch (syncErr) {
            console.warn('Backend profile sync note:', syncErr);
          }
        }

        if (onSignupSuccess) {
          onSignupSuccess(sessionUser, sessionUser.token);
        }
        navigate(role === 'entrepreneur' ? '/entrepreneur' : '/investor');
      } else {
        // Fallback demo signup
        const demoUser = {
          id: role === 'entrepreneur' ? '00000000-0000-0000-0000-000000000001' : '00000000-0000-0000-0000-000000000002',
          email: trimmedEmail,
          role,
          full_name: trimmedName,
        };
        const token = `demo-token-${role}`;
        api.setToken(token);
        if (onSignupSuccess) {
          onSignupSuccess(demoUser, token);
        }
        navigate(role === 'entrepreneur' ? '/entrepreneur' : '/investor');
      }
    } catch (err: any) {
      const msg = err.message || '';
      const isRateLimit =
        err.status === 429 ||
        msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('too many') ||
        msg.toLowerCase().includes('over_email_send_rate_limit');

      if (isRateLimit) {
        setCooldownSeconds(60);
        setError('Signup email rate limit exceeded (Supabase security limit). Please wait 60 seconds before trying again, or check your inbox if a confirmation email was already dispatched.');
      } else {
        setError(msg || 'Signup failed. Please review your details and try again.');
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // If email confirmation is required, show confirmation screen (Issue 8)
  if (emailSentTo) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="text-center p-8 space-y-5">
          <div className="w-14 h-14 rounded-full bg-teal-accent/20 text-teal-dark mx-auto flex items-center justify-center">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#101828]">Check Your Email</h2>
            <p className="text-sm text-[#667085] mt-2">
              We have sent a confirmation link to <strong className="text-gray-900">{emailSentTo}</strong>.
            </p>
            <p className="text-xs text-[#667085] mt-2 leading-relaxed">
              Please click the link in the email to activate your account and securely sign in to SharkBridge.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col gap-2.5">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Login Page
            </Button>
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => setEmailSentTo(null)}
            >
              Back to Sign Up
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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

        {cooldownSeconds > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
            <span>
              Rate limit cooldown active. Please wait <strong>{cooldownSeconds}s</strong> before resubmitting.
            </span>
          </div>
        )}

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

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-3"
            isLoading={loading}
            disabled={loading || cooldownSeconds > 0}
          >
            {cooldownSeconds > 0
              ? `Wait ${cooldownSeconds}s to Retry`
              : `Create ${role === 'entrepreneur' ? 'Entrepreneur' : 'Investor'} Account`}
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

export default SignupPage;
