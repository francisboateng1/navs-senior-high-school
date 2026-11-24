import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

export default function AdminLoginPage() {
  useDocumentTitle('Administrator Sign In', 'Secure sign-in for NAVS Senior High School administrators.');
  const { user, needsBootstrap, loading, login, bootstrapAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/admin', { replace: true });
    }
  }, [loading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (needsBootstrap) {
        await bootstrapAdmin(fullName, email, password);
        showToast('First Super Administrator account configured and signed in.', 'success');
      } else {
        await login(email, password);
        showToast('Signed in to NAVS Administration Portal.', 'success');
      }
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0C1E3C] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg border border-slate-200 p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-full bg-[#0C1E3C]/10 text-[#0C1E3C] flex items-center justify-center mx-auto mb-3">
            {needsBootstrap ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <h1 className="text-2xl font-serif font-semibold text-[#0C1E3C]">
            {needsBootstrap ? 'Initial Administrator Setup' : 'NAVS Administrator Portal'}
          </h1>
          <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
            {needsBootstrap
              ? 'No administrator account exists yet. Claim the first Super Administrator account to manage admissions and school content.'
              : 'Sign in with your authorized school administrator credentials.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {needsBootstrap && (
            <div>
              <label htmlFor="admin-name" className="block text-sm font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                id="admin-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Kwame Mensah"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
              />
            </div>
          )}

          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-slate-700 mb-1">
              Administrator Email *
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@navs.edu.gh"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-700 mb-1">
              Password *
            </label>
            <input
              id="admin-password"
              type="password"
              required
              minLength={needsBootstrap ? 8 : 1}
              autoComplete={needsBootstrap ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={needsBootstrap ? 'Minimum 8 characters' : 'Enter your password'}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0C1E3C]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full py-2.5 px-4 bg-[#0C1E3C] hover:bg-[#162B4D] disabled:opacity-60 text-white text-sm font-semibold rounded-md transition-colors"
          >
            {submitting
              ? 'Processing...'
              : needsBootstrap
              ? 'Create Super Administrator Account'
              : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 text-center">
          <Link to="/" className="text-xs font-medium text-slate-600 hover:text-[#0C1E3C]">
            &larr; Return to Public School Website
          </Link>
        </div>
      </div>
    </div>
  );
}
