import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldAlert, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setStatus('error');
            setErrorMessage('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setErrorMessage('Password must be at least 8 characters');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setStatus('success');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.response?.data?.message || 'Password reset failed. The token may be expired.');
        }
    };

    if (!token) {
        return (
            <div className="w-full max-w-md text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-500/10 text-red-500 mb-4 border border-red-500/20">
                    <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Invalid Request</h2>
                <p className="text-sm text-slate-400 mt-2 mb-6">
                    No secure recovery token was detected in the URL. Ensure you click the exact link provided in your email.
                </p>
                <Link to="/forgot-password" className="inline-flex justify-center w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 transition-colors">
                    Request new token
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 mb-4 border border-brand-500/20">
                    <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Set New Password</h2>
                <p className="text-sm text-slate-400 mt-2">
                    Your new password must be at least 8 characters long.
                </p>
            </div>

            <div className="bg-surface border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                {status === 'success' ? (
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-medium text-white">Vault Secured</h3>
                        <p className="text-sm text-slate-400">
                            Your new password has been applied. Redirecting to login...
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {status === 'error' && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-400">{errorMessage}</p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                New Password
                            </label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-900/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                                Confirm New Password
                            </label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-900/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 focus:ring-offset-background transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Secure My Account
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
