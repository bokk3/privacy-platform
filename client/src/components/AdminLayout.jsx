import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ShieldCheck, Activity, Users, Database, LogOut, FileText } from 'lucide-react';
import { DefaultAvatar } from './Avatar.jsx';

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
            ? 'bg-rose-500/10 text-rose-400 font-medium'
            : 'text-slate-400 hover:bg-surface hover:text-slate-200'
        }`;

    return (
        <div className="min-h-screen bg-[#090b11] flex text-slate-200">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-[#0d1017] flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-6 border-b border-slate-800">
                    <ShieldCheck className="w-6 h-6 text-rose-500 mr-3" />
                    <span className="font-bold tracking-wide text-white uppercase text-sm">System Admin</span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <NavLink to="/admin/dashboard" className={navClass}>
                        <Activity className="w-5 h-5" />
                        System Health
                    </NavLink>
                    <NavLink to="/admin/brokers" className={navClass}>
                        <Database className="w-5 h-5" />
                        Data Brokers
                    </NavLink>
                    <NavLink to="/admin/users" className={navClass}>
                        <Users className="w-5 h-5" />
                        Users & Logs
                    </NavLink>

                    <div className="pt-8 mb-2">
                        <p className="px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">User Facing</p>
                    </div>
                    <NavLink to="/dashboard" className={navClass}>
                        <LogOut className="w-5 h-5 rotate-180" />
                        Exit to App
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <DefaultAvatar name="Admin" />
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-rose-300 truncate">{user?.email}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">God Mode</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-16 border-b border-slate-800 bg-[#0d1017] flex justify-between items-center px-8 z-10 relative">
                    <h1 className="text-lg font-semibold lg:hidden">Admin Portal</h1>
                    <div className="ml-auto flex items-center gap-4">
                        <span className="px-3 py-1 bg-rose-500/10 text-rose-400 text-xs font-mono rounded-full border border-rose-500/20">Prod Env</span>
                    </div>
                </header>

                {/* Scrollable Page Body */}
                <div className="flex-1 overflow-y-auto w-full relative">
                    {/* subtle dangerous background tint to remind admin roles */}
                    <div className="absolute inset-0 bg-gradient-to-b from-rose-900/5 to-transparent pointer-events-none" />

                    <div className="container mx-auto p-4 lg:p-8 max-w-7xl animate-fade-in relative z-10">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
