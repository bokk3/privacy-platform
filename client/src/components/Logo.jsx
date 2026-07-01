import React from "react";

export default function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center shrink-0 w-10 h-10">
        <img
          src="/logo.png"
          alt="Opaca Engine Logo"
          className="w-full h-full object-contain relative z-10"
        />
      </div>
      <span className="font-bold text-xl tracking-tight text-white select-none whitespace-nowrap">
        Opaca<span className="text-brand-500">Engine</span>
      </span>
    </div>
  );
}
