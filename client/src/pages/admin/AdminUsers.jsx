import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Users, Loader2 } from 'lucide-react';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/admin/users'),
            api.get('/admin/audit-logs?take=20')
        ]).then(([usersRes, logsRes]) => {
            setUsers(usersRes.data.data);
            setLogs(logsRes.data.data);
        }).catch(err => {
            console.error(err);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-12 text-center text-slate-500 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Panes - Users list */}
            <div className="lg:col-span-2 space-y-6">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Users className="text-rose-500" /> Users & Roles
                </h2>

                <div className="card-glass divide-y divide-slate-800">
                    {users.map(u => (
                        <div key={u.id} className="p-5 hover:bg-slate-800/30 transition-colors flex justify-between items-center">
                            <div>
                                <h4 className="font-semibold text-slate-200">{u.email}</h4>
                                <p className="text-xs text-slate-500 mt-1">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {u.mfaEnabled && <span className="px-2.5 py-1 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">MFA</span>}
                                <span className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${u.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                                    {u.role}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Pane - Audit Trail */}
            <div className="space-y-6">
                <h2 className="text-xl font-bold text-white tracking-tight">Security Audit Logs</h2>
                <div className="card-glass p-0 overflow-hidden">
                    <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-800/50">
                        {logs.map(log => (
                            <div key={log.id} className="p-4 bg-surface/30">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-mono text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded">{log.action}</span>
                                    <span className="text-[10px] text-slate-500">{new Date(log.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-slate-300 mt-2 truncate" title={log.user?.email || log.userId}>{log.user?.email || log.userId}</p>
                            </div>
                        ))}
                        {logs.length === 0 && <div className="p-8 text-center text-slate-500">No logs found.</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
