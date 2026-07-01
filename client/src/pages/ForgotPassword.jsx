import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ShieldAlert, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setErrorMessage('');

        try {
            await api.post('/auth/forgot-password', { email: email.toLowerCase() });
            setStatus('success');
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.response?.data?.message || 'Failed to send recovery email. Please try again.');
        }
    };

    return (
        <div className="w-full max-w-md">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-500/10 text-brand-500 mb-4 border border-brand-500/20">
                    <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Password Recovery</h2>
                <p className="text-sm text-slate-400 mt-2">
                    Enter your email address to receive a secure password reset link.
                </p>
            </div>

            <div className="bg-surface border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                {status === 'success' ? (
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-medium text-white">Check your encryption keys</h3>
                        <p className="text-sm text-slate-400">
                            We've dispatched a recovery link to <span className="font-medium text-white">{email}</span>. Please check your inbox and spam folder.
                        </p>
                        <div className="pt-4">
                            <Link to="/login" className="inline-flex justify-center w-full py-2.5 px-4 rounded-lg bg-slate-800 text-sm font-medium text-white hover:bg-slate-700 focus:outline-none transition-colors border border-slate-700">
                                Return to Login
                            </Link>
                        </div>
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
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                                Email Address
                            </label>
                            <div className="mt-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg bg-slate-900/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors sm:text-sm"
                                    placeholder="admin@opaca.local"
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
                                    Send Recovery Link
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>

            <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                    Remembered your vault?{' '}
                    <Link to="/login" className="font-medium text-brand-400 hover:text-brand-300 transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
