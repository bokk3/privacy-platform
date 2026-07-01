import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, AlertCircle, Shield, Zap, ExternalLink } from 'lucide-react';
import { api } from '../lib/api';

export default function Billing() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const successMessage = searchParams.get('success');
    const canceledMessage = searchParams.get('canceled');

    const fetchStatus = async () => {
        try {
            setIsLoading(true);
            const res = await api.get('/billing/status');
            setStatus(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load billing status');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const handleCheckout = async () => {
        try {
            setIsProcessing(true);
            const res = await api.post('/billing/checkout');
            window.location.href = res.data.url;
        } catch (err) {
            setError(err.response?.data?.message || 'Checkout failed');
            setIsProcessing(false);
        }
    };

    const handlePortal = async () => {
        try {
            setIsProcessing(true);
            const res = await api.post('/billing/portal');
            window.location.href = res.data.url;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to open billing portal');
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const { active, subscription } = status || {};

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
                    <p className="text-slate-400 mt-1">Manage your active subscription and payment methods.</p>
                </div>
            </div>

            {successMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3 text-emerald-400">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-emerald-300">Subscription Activated</h3>
                        <p className="text-sm mt-1 opacity-90">Thank you for subscribing! Your automated privacy requests will begin processing immediately.</p>
                    </div>
                </div>
            )}

            {canceledMessage && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3 text-amber-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-amber-300">Checkout Canceled</h3>
                        <p className="text-sm mt-1 opacity-90">Your subscription was not completed. You won't be charged.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-3 text-rose-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-medium text-rose-300">Billing Error</h3>
                        <p className="text-sm mt-1 opacity-90">{error}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Plan Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg">
                            <CreditCard className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">Current Plan</h2>
                    </div>

                    <div className="p-6">
                        {active ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Status</span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        {subscription.status}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Next Billing Date</span>
                                    <span className="text-white font-medium">
                                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                    </span>
                                </div>

                                {subscription.cancelAtPeriodEnd && (
                                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm flex gap-2 mt-4">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>Your subscription will cancel at the end of the billing period.</span>
                                    </div>
                                )}

                                <div className="pt-4 mt-6 border-t border-slate-800">
                                    <button
                                        onClick={handlePortal}
                                        disabled={isProcessing}
                                        className="w-full h-11 px-6 rounded-lg font-medium bg-slate-800 text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        Manage in Stripe Portal <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <p className="text-slate-400">
                                    You do not currently have an active subscription. Upgrade to Personal Pro to automate your privacy requests and continuously remove your data from tracking brokers.
                                </p>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-brand-400" />
                                        Automated opt-out dispatch to 300+ brokers
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-brand-400" />
                                        Recurring quarterly sweeps to prevent reappearance
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-300">
                                        <CheckCircle className="w-4 h-4 text-brand-400" />
                                        Advanced CAPTCHA bypassing & email threading
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-800">
                                    <button
                                        onClick={handleCheckout}
                                        disabled={isProcessing}
                                        className="w-full h-11 px-6 rounded-lg font-medium bg-brand-500 text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors disabled:opacity-50"
                                    >
                                        Subscribe Now
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Security / Privacy guarantee box */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-6 space-y-6">
                    <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30 flex items-center justify-center">
                        <Shield className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Your Privacy First</h3>
                        <p className="text-sm text-slate-400 mt-2">
                            All payment processing is handled exclusively by Stripe. We do not store, process, or
                            intersect your credit card numbers anywhere on our own servers. This ensures your financial
                            footprint is secured through world-class PCI compliance.
                        </p>
                    </div>

                    <div className="w-12 h-12 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 flex items-center justify-center mt-6">
                        <Zap className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Cancel Anytime</h3>
                        <p className="text-sm text-slate-400 mt-2">
                            If you decide to pause your subscription, we will simply stop executing new automated removal requests.
                            The deletion confirmations we've already secured on your behalf remain permanent.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
