import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { DefaultAvatar } from './Avatar.jsx';
import Logo from './Logo.jsx';
import { LayoutDashboard, LogOut, ShieldAlert, FileText, Settings, CreditCard, UserCircle } from 'lucide-react';

export default function AppLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navClass = ({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
            ? 'bg-brand-500/10 text-brand-400 font-medium'
            : 'text-slate-400 hover:bg-surface hover:text-slate-200'
        }`;

    return (
        <div className="min-h-screen bg-background flex text-slate-200">
            {/* Sidebar */}
            <aside className="w-64 border-r border-slate-800 bg-surface/50 flex flex-col hidden md:flex">
                <div className="h-16 flex items-center px-4 border-b border-slate-800">
                    <Logo className="scale-90 origin-left" />
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    <NavLink to="/dashboard" className={navClass}>
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </NavLink>
                    <NavLink to="/identities" className={navClass}>
                        <UserCircle className="w-5 h-5" />
                        Digital Identities
                    </NavLink>
                    <NavLink to="/requests" className={navClass}>
                        <FileText className="w-5 h-5" />
                        Privacy Requests
                    </NavLink>
                    <NavLink to="/billing" className={navClass}>
                        <CreditCard className="w-5 h-5" />
                        Subscription & Billing
                    </NavLink>
                    <NavLink to="/profile" className={navClass}>
                        <Settings className="w-5 h-5" />
                        Security & Profile
                    </NavLink>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <DefaultAvatar name={user?.email || '?'} />
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-slate-200 truncate">{user?.email}</p>
                            <p className="text-xs text-brand-400 font-mono mt-0.5 capitalize">{user?.role?.toLowerCase() || 'User'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Header */}
                <header className="h-16 border-b border-slate-800 bg-surface/50 backdrop-blur flex justify-between items-center px-8 z-10 relative">
                    <h1 className="text-lg font-semibold lg:hidden">Opaca Engine</h1>
                    <div className="ml-auto flex items-center gap-4">
                        <button className="p-2 rounded-full hover:bg-surface text-slate-400 hover:text-slate-200 transition-colors">
                            <Bell className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Scrollable Page Body */}
                <div className="flex-1 overflow-y-auto w-full">
                    <div className="container mx-auto p-4 lg:p-8 max-w-6xl animate-fade-in">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
}
