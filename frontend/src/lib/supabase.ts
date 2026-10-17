import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../types';
import { api } from './api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface AuthSessionUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  token?: string;
  needsEmailConfirmation?: boolean;
}

export const authService = {
  async signUp(email: string, password: string, role: UserRole, fullName: string): Promise<AuthSessionUser> {
    // 1. Attempt backend registration endpoint first
    // This creates the user in Supabase with email_confirm=True, bypassing the 3/hour email rate limit (429)
    // and avoiding redirect_to URL whitelist restrictions (400)
    try {
      const regProfile = await api.register({ email, password, role, full_name: fullName });
      if (supabase) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!signInError && signInData?.user && signInData?.session) {
          return {
            id: signInData.user.id,
            email: signInData.user.email || email,
            role,
            full_name: fullName,
            token: signInData.session.access_token,
            needsEmailConfirmation: false,
          };
        }
      }
      return {
        id: regProfile.id,
        email,
        role,
        full_name: fullName,
        needsEmailConfirmation: false,
      };
    } catch (regErr: any) {
      const msg = regErr.message || '';
      if (msg.includes('already exists') || msg.includes('already registered')) {
        throw new Error('An account with this email address already exists. Please log in.');
      }
      if (!supabase) {
        throw regErr;
      }
    }

    // 2. Direct client-side Supabase signUp fallback
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          full_name: fullName,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Signup failed: user record not created.');
    }

    const sessionUser: AuthSessionUser = {
      id: data.user.id,
      email: data.user.email || email,
      role: (data.user.user_metadata?.role as UserRole) || role,
      full_name: data.user.user_metadata?.full_name || fullName,
      token: data.session?.access_token,
      needsEmailConfirmation: !data.session,
    };

    return sessionUser;
  },

  async signIn(email: string, password: string): Promise<AuthSessionUser> {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('Login failed: user not found.');
    }

    const role = (data.user.user_metadata?.role as UserRole) || 'entrepreneur';
    const fullName = data.user.user_metadata?.full_name || (data.user.email?.split('@')[0] || 'User');

    return {
      id: data.user.id,
      email: data.user.email || email,
      role,
      full_name: fullName,
      token: data.session?.access_token,
    };
  },

  async signOut(): Promise<void> {
    if (supabase) {
      await supabase.auth.signOut();
    }
  },

  async getSession(): Promise<AuthSessionUser | null> {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;

    const user = data.session.user;
    return {
      id: user.id,
      email: user.email || '',
      role: (user.user_metadata?.role as UserRole) || 'entrepreneur',
      full_name: user.user_metadata?.full_name || 'User',
      token: data.session.access_token,
    };
  },

  onAuthStateChange(callback: (user: AuthSessionUser | null) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user: AuthSessionUser = {
          id: session.user.id,
          email: session.user.email || '',
          role: (session.user.user_metadata?.role as UserRole) || 'entrepreneur',
          full_name: session.user.user_metadata?.full_name || (session.user.email?.split('@')[0] || 'User'),
          token: session.access_token,
        };
        callback(user);
      } else {
        callback(null);
      }
    });
    return subscription;
  },
};

