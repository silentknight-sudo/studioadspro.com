import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import {
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Info,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { signInEmail, signInGoogle } = useAuth();
  const { success, error } = useToast();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInGoogle();
      success('Welcome back to StudioAdsPro CRM!');
    } catch (err: any) {
      // A popup the user closed themselves isn't a real error to surface.
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err?.code === 'auth/operation-not-allowed') {
        error('Google sign-in is not enabled in Firebase Console. Please check Firebase Authentication settings.');
        return;
      }
      console.warn('Google sign-in notice:', err?.message || err);
      error(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) {
      error('Please enter your Login ID or Email.');
      return;
    }
    if (!password) {
      error('Please enter your Password.');
      return;
    }

    setLoading(true);
    try {
      await signInEmail(loginId, password);
      success('Welcome back to StudioAdsPro CRM!');
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
        error(
          'Email/Password sign-in is not enabled in Firebase. Please click "Sign in with Google" above with your admin account (playsidgaming@gmail.com).'
        );
      } else {
        error(msg || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const emailInput = loginId.trim().toLowerCase();
    if (!emailInput || !emailInput.includes('@')) {
      error('Enter your account email above first, then click "Forgot password".');
      return;
    }
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailInput);
      success(`If an account exists for ${emailInput}, a reset link has been sent to it.`);
    } catch (err: any) {
      if (err?.code === 'auth/invalid-email') {
        error('Please enter a valid email address.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        error('Email/Password provider is not enabled in Firebase. Please sign in with Google above.');
      } else {
        success(`If an account exists for ${emailInput}, a reset link has been sent to it.`);
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3.5 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-700/80 flex items-center justify-center shadow-xl shadow-blue-500/20 p-1.5 overflow-hidden">
            <img
              src="/studioadspro-logo.png"
              alt="StudioAdsPro Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://www.studioadspro.com/favicon-512x512.png';
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">StudioAdsPro</h1>
            <span className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase block">
              Enterprise CRM Suite
            </span>
          </div>
        </div>
        <p className="text-center text-xs text-slate-400">
          Client Leads, Team Allocation, Project Pipelines & Communication
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/95 backdrop-blur-xl py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-800 space-y-6">
          
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-semibold text-white">Sign In to Your Account</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select your sign-in method to access the CRM portal.
            </p>
          </div>

          {/* Quick Admin Access Hint */}
          <div className="bg-blue-950/40 border border-blue-800/60 rounded-xl p-3 text-xs text-blue-200 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold text-white">Administrator Access: </span>
              Click <span className="font-semibold text-blue-300">"Sign in with Google"</span> below with{' '}
              <span className="font-mono text-blue-200 font-semibold">playsidgaming@gmail.com</span> for one-click admin access.
            </div>
          </div>

          {/* Google Sign-In (Primary Action) */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm shadow-lg shadow-white/5 transition-all cursor-pointer disabled:opacity-50 ring-2 ring-blue-500/30 hover:ring-blue-500/50"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400/40 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1C3.26 21.3 7.3 24 12 24z" />
                  <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.61l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75z" />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              or Corporate Login
            </span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          {/* Simple Login ID and Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="loginId" className="block text-xs font-medium text-slate-300 mb-1.5">
                Login ID / Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="loginId"
                  type="text"
                  required
                  placeholder="e.g. employee@studioadspro.com"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="loginPassword" className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-[11px] font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50 cursor-pointer"
                >
                  {resetLoading ? 'Sending…' : 'Forgot password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="loginPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-start gap-1.5 leading-tight">
              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
              <span>Email & password accounts require Email/Password enabled in Firebase Console.</span>
            </div>

            <button
              type="submit"
              id="submitSignInBtn"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-sm border border-slate-700 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In with Email</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
