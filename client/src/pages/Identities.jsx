import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { UserCircle, MapPin, Mail, Phone, Plus, Trash2, Shield, AlertTriangle } from 'lucide-react';

export default function Identities() {
    const [identities, setIdentities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        label: '',
        type: 'PRIMARY',
        firstName: '',
        lastName: '',
        street1: '',
        city: '',
        state: '',
        zip: '',
        emailTarget: '',
        phoneTarget: ''
    });

    const fetchIdentities = async () => {
        try {
            const res = await api.get('/identities');
            setIdentities(res.data);
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to locate identities.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIdentities();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const payload = {
                label: formData.label || `${formData.firstName} ${formData.lastName}`,
                type: formData.type,
                firstName: formData.firstName,
                lastName: formData.lastName,
                addresses: formData.street1 ? [{
                    street1: formData.street1,
                    city: formData.city,
                    state: formData.state,
                    zip: formData.zip
                }] : [],
                emails: formData.emailTarget ? [{ email: formData.emailTarget }] : [],
                phones: formData.phoneTarget ? [{ phone: formData.phoneTarget }] : []
            };

            await api.post('/identities', payload);
            setIsCreating(false);

            // Reset state
            setFormData({
                label: '', type: 'PRIMARY', firstName: '', lastName: '',
                street1: '', city: '', state: '', zip: '',
                emailTarget: '', phoneTarget: ''
            });

            await fetchIdentities();
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Failed to map identity profile.');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you certain you want to destroy this identity parameter? Doing so requires scrubbing dependent tracking requests.')) return;

        try {
            await api.delete(`/identities/${id}`);
            await fetchIdentities();
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Conflict: Identity is locked to an active monitoring schedule.');
        }
    };

    if (loading) {
        return <div className="p-8 text-slate-500 flex items-center justify-center">Loading encrypted targets...</div>;
    }

    return (
        <div className="space-y-8 animate-slide-up">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <UserCircle className="text-brand-500" /> Digital Identities
                    </h2>
                    <p className="mt-2 text-slate-400">
                        Manage the personal data vectors you want Incognito to scrub from underground data brokers.
                    </p>
                </div>
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
                    >
                        <Plus className="w-4 h-4" /> Add Identity Target
                    </button>
                )}
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-3 text-red-400 items-center">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {isCreating && (
                <div className="card-glass p-6 sm:p-8 border-brand-500/30 ring-1 ring-brand-500/20">
                    <h3 className="text-lg font-medium text-white mb-6">Initialize New Identity Node</h3>
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">First Name</label>
                                <input required type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="input-theme" placeholder="John" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Last Name</label>
                                <input required type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="input-theme" placeholder="Smith" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Primary Email Node</label>
                                <input type="email" value={formData.emailTarget} onChange={e => setFormData({ ...formData, emailTarget: e.target.value })} className="input-theme" placeholder="ghost@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Target Phone</label>
                                <input type="tel" value={formData.phoneTarget} onChange={e => setFormData({ ...formData, phoneTarget: e.target.value })} className="input-theme" placeholder="+1 (555) 000-0000" />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-700/50">
                            <h4 className="text-sm font-medium text-slate-300">Home Address <span className="text-slate-500">(Required by many brokers for hard validation)</span></h4>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Street Address</label>
                                <input type="text" value={formData.street1} onChange={e => setFormData({ ...formData, street1: e.target.value })} className="input-theme" placeholder="123 Privacy Ln" />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">City</label>
                                    <input type="text" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} className="input-theme" placeholder="Austin" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">State</label>
                                    <input type="text" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} className="input-theme" placeholder="TX" />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Zip</label>
                                    <input type="text" value={formData.zip} onChange={e => setFormData({ ...formData, zip: e.target.value })} className="input-theme" placeholder="78701" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 justify-end">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary px-6 py-2 text-sm font-medium flex items-center gap-2">
                                <Shield className="w-4 h-4" /> Save Encrypted Identity
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {identities.length === 0 && !isCreating ? (
                    <div className="xl:col-span-2 text-center p-12 card-glass border-dashed border-2 border-slate-700/50">
                        <UserCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No Profiles Detected</h3>
                        <p className="text-slate-400">Initialize an identity node to begin orchestrating privacy requests.</p>
                    </div>
                ) : (
                    identities.map((id) => (
                        <div key={id.id} className="card-glass relative flex flex-col hover:border-brand-500/30 transition-colors">
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold border border-brand-500/20">
                                            {id.firstName[0]}{id.lastName[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">{id.firstName} {id.lastName}</h3>
                                            <span className="text-xs font-medium text-brand-400 uppercase tracking-widest">{id.type} NODE</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(id.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-3 mt-6 border-t border-slate-800 pt-4">
                                    {id.emails?.length > 0 && (
                                        <div className="flex items-center gap-3 text-sm text-slate-400">
                                            <Mail className="w-4 h-4 text-slate-500" />
                                            {id.emails[0].email}
                                        </div>
                                    )}
                                    {id.phones?.length > 0 && (
                                        <div className="flex items-center gap-3 text-sm text-slate-400">
                                            <Phone className="w-4 h-4 text-slate-500" />
                                            {id.phones[0].phone}
                                        </div>
                                    )}
                                    {id.addresses?.length > 0 && (
                                        <div className="flex items-start gap-3 text-sm text-slate-400">
                                            <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                                            <span>
                                                {id.addresses[0].street1}<br />
                                                {id.addresses[0].city}, {id.addresses[0].state} {id.addresses[0].zip}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
