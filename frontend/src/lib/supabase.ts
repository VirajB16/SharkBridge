import { createClient } from '@supabase/supabase-js';
import { UserRole } from '../types';

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
}

export const authService = {
  async signUp(email: string, password: string, role: UserRole, fullName: string): Promise<AuthSessionUser> {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

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
};
