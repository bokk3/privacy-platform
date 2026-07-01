import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { Database, Plus, Search, Loader2 } from 'lucide-react';

export default function AdminBrokers() {
    const [brokers, setBrokers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/admin/brokers')
            .then(res => setBrokers(res.data.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-12 text-center text-slate-500 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Database className="text-rose-500" /> Data Brokers
                    </h2>
                </div>
                <button className="btn-primary !bg-rose-600 hover:!bg-rose-500 !shadow-rose-600/30 flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Broker
                </button>
            </div>

            <div className="card-glass overflow-hidden">
                <div className="p-4 border-b border-slate-700/50 bg-surface/50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" placeholder="Search brokers..." className="input-theme pl-10 bg-slate-900/50" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-400">
                        <thead className="text-xs uppercase bg-slate-900/50 border-b border-slate-700/50">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-300">Name</th>
                                <th className="px-6 py-4 font-semibold text-slate-300">Contact Method</th>
                                <th className="px-6 py-4 font-semibold text-slate-300">Identity Reqs</th>
                                <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {brokers.map(b => (
                                <tr key={b.id} className="hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-200">
                                        {b.name}
                                        <p className="text-xs text-slate-500 mt-1">{b.domain}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">
                                            {b.method}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-1 flex-wrap max-w-[150px]">
                                            {b.identityRequirements.map(req => (
                                                <span key={req} className="px-1.5 py-0.5 bg-brand-500/10 text-brand-400 rounded text-[10px] border border-brand-500/20">{req}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {b.isActive
                                            ? <span className="text-emerald-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Active</span>
                                            : <span className="text-red-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Inactive</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-rose-400 hover:text-rose-300 font-medium">Edit</button>
                                    </td>
                                </tr>
                            ))}
                            {brokers.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center">No brokers found in the database.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
