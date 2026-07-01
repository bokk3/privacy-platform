import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('user@example.com');
    const [password, setPassword] = useState('yourpassword');
    const [mfaCode, setMfaCode] = useState('');
    const [isMfaFlow, setIsMfaFlow] = useState(false);
    const [mfaToken, setMfaToken] = useState(null);

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login, loginMfa } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isMfaFlow) {
                await loginMfa({ challengeToken: mfaToken, totpCode: mfaCode });
                navigate('/dashboard');
            } else {
                const response = await login({ email, password });
                if (response.mfaRequired) {
                    setIsMfaFlow(true);
                    setMfaToken(response.mfaChallengeToken);
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full animate-slide-up">
            <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-white tracking-tight">
                    {isMfaFlow ? "Two-Factor Auth" : "Welcome back"}
                </h2>
                <p className="mt-2 text-slate-400">
                    {isMfaFlow ? "Enter the 6-digit code from your authenticator app." : "Sign in to manage your privacy requests."}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {!isMfaFlow ? (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="input-theme"
                                placeholder="you@company.com"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-400">Password</label>
                                <a href="#" className="text-sm text-brand-400 hover:text-brand-300">Forgot password?</a>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="input-theme"
                                required
                            />
                        </div>
                    </>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Authentication Code</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={mfaCode}
                            onChange={e => setMfaCode(e.target.value)}
                            className="input-theme text-center tracking-widest text-lg font-mono"
                            placeholder="000000"
                            required
                        />
                    </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            {isMfaFlow ? "Verify" : "Sign in"}
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>

            {!isMfaFlow && (
                <p className="mt-8 text-center text-sm text-slate-400">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                        Sign up
                    </Link>
                </p>
            )}
        </div>
    );
}
