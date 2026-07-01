import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ArrowRight, Loader2 } from 'lucide-react';

export default function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await register({ email, password });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full animate-slide-up">
            <div className="mb-10 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-white tracking-tight">Create an account</h2>
                <p className="mt-2 text-slate-400">Start taking back your digital footprint today.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

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
                    <label className="block text-sm font-medium text-slate-400 mb-2">Choose Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="input-theme"
                        required
                        minLength={8}
                        placeholder="Minimum 8 characters"
                    />
                </div>

                <div className="flex items-start gap-3 py-2">
                    <input type="checkbox" required className="mt-1 bg-surface border-slate-700 text-brand-500 rounded focus:ring-brand-500/50" />
                    <p className="text-xs text-slate-500">
                        By registering, you agree to our Terms of Service and Privacy Policy, and empower us to act as your authorized privacy agent.
                    </p>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                            Sign up
                            <ArrowRight className="w-5 h-5" />
                        </>
                    )}
                </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
                    Log in
                </Link>
            </p>
        </div>
    );
}
