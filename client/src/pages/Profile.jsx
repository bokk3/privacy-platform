import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../lib/api.js';
import { Shield, KeyRound, Loader2, AlertCircle, Copy, Check } from 'lucide-react';

export default function Profile() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [setupData, setSetupData] = useState(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [copied, setCopied] = useState(false);

    const startMfaSetup = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/auth/mfa/setup');
            setSetupData(res.data);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to start MFA setup');
        } finally {
            setLoading(false);
        }
    };

    const confirmMfa = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/auth/mfa/confirm', { totpCode: verificationCode });
            setSetupData(null);
            setVerificationCode('');
            // In a real app we'd trigger a fetchProfile here so user context updates to reflect mfaEnabled
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Invalid code. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const copySecret = () => {
        if (setupData?.secret) {
            navigator.clipboard.writeText(setupData.secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Shield className="text-brand-500" /> Account Security
                </h2>
                <p className="mt-2 text-slate-400">Manage your credentials and two-factor authentication.</p>
            </div>

            <div className="card-glass border-slate-700/50 p-8 flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-surface border border-slate-700 flex items-center justify-center shrink-0">
                        <KeyRound className="w-8 h-8 text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-white">Two-Factor Authentication</h3>
                        <p className="text-sm text-slate-400 mt-1">Add an extra layer of security to your account.</p>
                    </div>
                </div>

                {!user?.mfaEnabled && !setupData && (
                    <div className="mt-4 border-t border-slate-700/50 pt-6">
                        <button onClick={startMfaSetup} disabled={loading} className="btn-primary w-fit">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set up Authenticator App"}
                        </button>
                    </div>
                )}

                {setupData && (
                    <div className="mt-4 border-t border-slate-700/50 pt-6 animate-fade-in grid md:grid-cols-2 gap-8">
                        <div>
                            <h4 className="text-white font-medium mb-4">1. Scan the QR Code</h4>
                            <div className="p-4 bg-white rounded-xl inline-block">
                                <img src={setupData.qrCodeUrl} alt="MFA QR Code" className="w-48 h-48" />
                            </div>

                            <p className="text-xs text-slate-400 mt-4">Or enter this secret key manually:</p>
                            <div className="flex items-center gap-2 mt-1">
                                <code className="bg-surface px-2 py-1 rounded text-brand-300 tracking-wider text-sm">{setupData.secret}</code>
                                <button onClick={copySecret} className="p-1.5 hover:bg-surface rounded text-slate-400 hover:text-slate-200 transition-colors">
                                    {copied ? <Check className="w-4 h-4 text-brand-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center">
                            <h4 className="text-white font-medium mb-4">2. Verify Setup</h4>
                            <form onSubmit={confirmMfa} className="space-y-4">
                                {error && (
                                    <div className="flex gap-2 items-center p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm text-slate-400 block mb-2">Authenticator Code</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value)}
                                        placeholder="000000"
                                        className="input-theme font-mono tracking-widest text-lg"
                                        required
                                    />
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary w-full">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirm Code"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
