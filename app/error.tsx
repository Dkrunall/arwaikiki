'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fcefd4] text-[#510909] flex flex-col items-center justify-center px-6 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#510909]/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#c29a53]/6 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        <span className="text-6xl mb-6">⚠️</span>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#510909]/50 mb-3">Error 500</p>
        <h1 className="text-5xl font-display font-black uppercase tracking-tight text-[#510909] mb-4 leading-tight">
          Something Went Wrong
        </h1>
        <p className="text-sm text-[#510909]/70 leading-relaxed mb-10 font-medium">
          An unexpected error occurred. Try refreshing the page — if the problem persists, contact the bar manager.
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-[#510909]/35 mb-8">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={reset}
            className="flex-1 py-4 bg-[#510909] text-[#fcefd4] font-black uppercase tracking-wider rounded-2xl hover:bg-[#6c1010] transition-all text-xs shadow-md cursor-pointer"
          >
            Try Again
          </button>
          <a
            href="/"
            className="flex-1 py-4 bg-white/40 border border-[#510909]/15 hover:border-[#510909]/40 text-[#510909] font-black uppercase tracking-wider rounded-2xl transition-all text-xs text-center"
          >
            Back to Menu
          </a>
        </div>
      </div>
    </div>
  );
}
