import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Activity, MailCheck, ShieldAlert, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { REQUEST_STATUS } from '@privacy-platform/shared';

// Helper to translate statuses elegantly
const StatusBadge = ({ status }) => {
    const map = {
        [REQUEST_STATUS.PENDING]: { style: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: RefreshCw },
        [REQUEST_STATUS.SENT]: { style: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: MailCheck },
        [REQUEST_STATUS.COMPLETED]: { style: 'bg-brand-500/10 text-brand-400 border-brand-500/20', icon: CheckCircle },
        [REQUEST_STATUS.WAITING]: { style: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Activity },
        [REQUEST_STATUS.FAILED]: { style: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertTriangle },
    };

    const config = map[status] || { style: 'bg-slate-800 text-slate-300', icon: Activity };
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${config.style}`}>
            <Icon className="w-3.5 h-3.5" />
            {status}
        </span>
    );
};

export default function Dashboard() {
    const [metrics, setMetrics] = useState(null);
    const [recentRequests, setRecentRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Initial fetch
    useEffect(() => {
        const fetchDashboardState = async () => {
            try {
                const { data } = await api.get('/requests?take=5');

                // Local derivation of metrics from standard listing endpoint (could be its own DB analytics API later)
                const total = data.count || 0;
                const complete = data.data.filter(r => r.status === REQUEST_STATUS.COMPLETED).length;
                const failed = data.data.filter(r => r.status === REQUEST_STATUS.FAILED || r.status === REQUEST_STATUS.REJECTED).length;
                const inFlight = total - complete - failed;

                setMetrics({ total, complete, failed, inFlight });
                setRecentRequests(data.data);
            } catch (err) {
                // ignore for initial POC iteration
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardState();
    }, []);

    return (
        <div className="space-y-8">
            {/* Header section */}
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <ShieldAlert className="text-brand-500" /> Executive summary
                </h2>
                <p className="mt-2 text-slate-400">An overview of your privacy coverage footprint.</p>
            </div>

            {loading ? (
                <div className="card-glass p-12 flex justify-center text-slate-500">Loading metrics...</div>
            ) : (
                <>
                    {/* Quick Metrics Grid */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="card-glass p-6">
                            <p className="text-sm font-medium text-slate-400 mb-1">Active coverage</p>
                            <h3 className="text-3xl font-bold text-white">{metrics?.total || 0}</h3>
                            <p className="text-xs text-slate-500 mt-2">Total brokers tracked</p>
                        </div>

                        <div className="card-glass p-6">
                            <p className="text-sm font-medium text-brand-400 mb-1">Cleaned records</p>
                            <h3 className="text-3xl font-bold text-white">{metrics?.complete || 0}</h3>
                            <p className="text-xs text-slate-500 mt-2">Verified deletions</p>
                        </div>

                        <div className="card-glass p-6 border-slate-700/50">
                            <p className="text-sm font-medium text-yellow-400 mb-1">In progress updates</p>
                            <h3 className="text-3xl font-bold text-white">{metrics?.inFlight || 0}</h3>
                            <p className="text-xs text-slate-500 mt-2">Awaiting broker response</p>
                        </div>

                        <div className="card-glass p-6 border-slate-700/50">
                            <p className="text-sm font-medium text-red-400 mb-1">Escalations needed</p>
                            <h3 className="text-3xl font-bold text-white">{metrics?.failed || 0}</h3>
                            <p className="text-xs text-slate-500 mt-2">Blocked requests</p>
                        </div>
                    </div>

                    {/* Core lists */}
                    <div className="card-glass overflow-hidden mt-8">
                        <div className="px-6 py-5 border-b border-slate-700/50 flex justify-between items-center bg-surface/50">
                            <h3 className="text-lg text-white font-medium">Recent Activity</h3>
                            <button className="text-sm text-brand-400 hover:text-brand-300">View all</button>
                        </div>

                        <div className="divide-y divide-slate-800">
                            {recentRequests.length === 0 ? (
                                <div className="p-8 text-center text-slate-500">No requests filed currently.</div>
                            ) : (
                                recentRequests.map(req => (
                                    <div key={req.id} className="p-6 hover:bg-slate-800/30 transition-colors flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-slate-200">{req.broker?.name || "Unknown Broker"}</p>
                                            <p className="text-sm text-slate-500 mt-1">Requested {new Date(req.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <StatusBadge status={req.status} />
                                            <span className="text-xs text-slate-500 capitalize">{req.method.toLowerCase()} automation</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
