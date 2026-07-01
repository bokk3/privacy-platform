import React from 'react';

export function DefaultAvatar({ name }) {
    const initial = typeof name === 'string' && name.length > 0 ? name[0].toUpperCase() : '?';

    return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/20">
            {initial}
        </div>
    );
}
