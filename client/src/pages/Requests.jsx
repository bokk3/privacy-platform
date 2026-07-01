import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { FileText, ChevronRight, Activity, CalendarDays, Loader2 } from 'lucide-react';
import { REQUEST_STATUS } from '@opaca-engine/shared';

export default function Requests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Selected for Timeline View
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    useEffect(() => {
        api.get('/requests?take=50')
            .then(res => setRequests(res.data.data))
            .catch(err => console.error("Could not fetch requests", err))
            .finally(() => setLoading(false));
    }, []);

    const viewTimeline = async (req) => {
        setSelectedRequest(req);
        setLoadingEvents(true);
        try {
            const res = await api.get(`/requests/${req.id}/timeline`);
            setTimelineEvents(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingEvents(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center text-slate-500 animate-pulse"><Loader2 className="animate-spin inline-block mr-2" /> Loading privacy requests...</div>;
    }

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            {/* Left List Pane */}
            <div className="lg:col-span-2 space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <FileText className="text-brand-500" /> Active Requests
                    </h2>
                    <p className="mt-2 text-slate-400">All outbound data-deletion workflows triggered on your behalf.</p>
                </div>

                <div className="card-glass divide-y divide-slate-800">
                    {requests.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">You haven't filed any privacy requests yet.</div>
                    ) : (
                        requests.map(req => (
                            <div
                                key={req.id}
                                onClick={() => viewTimeline(req)}
                                className={`p-6 cursor-pointer flex justify-between items-center transition-colors ${selectedRequest?.id === req.id ? 'bg-brand-500/10 border-l-4 border-l-brand-500' : 'hover:bg-surface border-l-4 border-l-transparent'
                                    }`}
                            >
                                <div>
                                    <h4 className="font-semibold text-white">{req.broker.name}</h4>
                                    <div className="flex items-center gap-3 mt-1.5 text-sm">
                                        <span className="text-slate-400 flex items-center gap-1">
                                            <CalendarDays className="w-3.5 h-3.5" /> {new Date(req.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className="text-slate-600">•</span>
                                        <span className="text-brand-400 uppercase tracking-wide text-xs font-semibold">{req.status}</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-500" />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Timeline Pane */}
            <div className="hidden lg:block relative">
                <div className="sticky top-8">
                    {selectedRequest ? (
                        <div className="card-glass p-6 min-h-[500px]">
                            <h3 className="text-lg font-semibold text-white border-b border-slate-700/50 pb-4 mb-6">
                                {selectedRequest.broker.name} Timeline
                            </h3>

                            {loadingEvents ? (
                                <div className="text-center text-slate-500 py-12"><Activity className="animate-spin inline-block w-6 h-6 text-brand-500 mb-2" /><br />Loading evidence...</div>
                            ) : (
                                <div className="relative border-l border-slate-700 ml-4 space-y-8 pl-6 pb-4">
                                    {timelineEvents.map((evt, idx) => {
                                        const isLatest = idx === timelineEvents.length - 1;
                                        return (
                                            <div key={evt.id} className="relative">
                                                <span className={`absolute -left-[31px] w-4 h-4 rounded-full border-4 border-surface ${isLatest ? 'bg-brand-500' : 'bg-slate-600'}`}></span>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-200">{evt.toStatus.replace(/_/g, ' ')}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{new Date(evt.createdAt).toLocaleString()}</p>
                                                    {evt.note && (
                                                        <p className="mt-2 text-sm text-slate-400 bg-surface/50 p-3 rounded-lg border border-slate-700">
                                                            {evt.note}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card-glass p-12 text-center text-slate-500 h-full flex flex-col items-center justify-center">
                            <Activity className="w-12 h-12 mb-4 opacity-20" />
                            Select a privacy request to view its interactive compliance timeline.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
