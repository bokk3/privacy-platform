import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { ShieldAlert, Server, Users, Database, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHealth = async () => {
        try {
            const res = await api.get('/admin/health');
            setHealth(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchHealth();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchHealth();
    };

    if (loading) return <div className="p-12 text-center text-slate-500 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <ActivityIcon /> System Health
                    </h2>
                    <p className="mt-2 text-slate-400">Global aggregation of privacy requests and infrastructure state.</p>
                </div>
                <button onClick={handleRefresh} disabled={refreshing} className="btn-primary flex items-center gap-2 text-sm !bg-slate-800 hover:!bg-slate-700 !shadow-none">
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Infra Cards */}
                <div className="card-glass p-6 border-slate-700/50">
                    <div className="flex justify-between items-start mb-4">
                        <Server className={`w-6 h-6 ${health?.databaseStatus === 'connected' ? 'text-rose-400' : 'text-red-500'}`} />
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${health?.databaseStatus === 'connected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {health?.databaseStatus}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-400">PostgreSQL DB</p>
                </div>

                <div className="card-glass p-6 border-slate-700/50">
                    <div className="flex justify-between items-start mb-4">
                        <Database className={`w-6 h-6 ${health?.redisStatus === 'connected' ? 'text-rose-400' : 'text-red-500'}`} />
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${health?.redisStatus === 'connected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {health?.redisStatus}
                        </span>
                    </div>
                    <p className="text-sm font-medium text-slate-400">Redis & BullMQ</p>
                </div>
            </div>

            <h3 className="text-lg font-semibold text-white mt-10 mb-4 border-b border-slate-800 pb-2">Business Metrics</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total Users" value={health?.users} icon={<Users className="w-5 h-5 text-slate-400" />} />
                <MetricCard title="Active Brokers" value={`${health?.activeBrokers} / ${health?.brokers}`} icon={<ShieldAlert className="w-5 h-5 text-slate-400" />} />
                <MetricCard title="In-flight Requests" value={health?.inFlightCount} icon={<RefreshCw className="w-5 h-5 text-blue-400" />} />
                <MetricCard title="Failed Requests" value={health?.failedRequests} icon={<AlertCircle className="w-5 h-5 text-red-400" />} />
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon }) {
    return (
        <div className="card-glass p-6 border-slate-700/50 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
                <h3 className="text-3xl font-bold text-white">{value ?? 0}</h3>
            </div>
            <div className="p-3 bg-surface rounded-lg border border-slate-700/50 shrink-0">
                {icon}
            </div>
        </div>
    );
}

function ActivityIcon() {
    return <ShieldAlert className="text-rose-500" />;
}
