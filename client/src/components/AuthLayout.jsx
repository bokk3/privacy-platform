import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Logo from './Logo.jsx';

export default function AuthLayout() {
    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background">
            {/* Visual / Brand Side */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-surface/50 border-r border-slate-800 relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-900/20" />
                <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />

                <div className="relative z-10">
                    <Logo className="mb-12 scale-125 origin-left" />
                    <h1 className="text-5xl font-extrabold text-white leading-tight mt-12">
                        Take back control <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500">
                            of your digital footprint.
                        </span>
                    </h1>
                    <p className="mt-6 text-lg text-slate-400 max-w-md">
                        Automate privacy requests, track data broker responses, and enforce compliance across the web.
                    </p>
                </div>

                <div className="relative z-10 text-sm text-slate-500">
                    © {new Date().getFullYear()} Opaca Engine. Open source implementation.
                </div>
            </div>

            {/* Form Side */}
            <div className="flex items-center justify-center p-8 relative z-10">
                <div className="w-full max-w-md">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
