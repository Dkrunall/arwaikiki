'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Cocktail } from '@/types/cocktail';
import CocktailCard from '@/components/CocktailCard';
import { Camera, Compass, ArrowRight, Download, Loader2, Sparkles, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = ['All', 'Signature', 'Classic', 'Mocktail', 'Special'];

export default function LandingPage() {
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchActiveCocktails() {
      try {
        setLoading(true);
        setErrorMsg('');
        const { data, error } = await supabase
          .from('cocktails')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCocktails(data || []);
      } catch (err: any) {
        console.error('Error fetching cocktails:', err);
        setErrorMsg(err.message || JSON.stringify(err) || 'Failed to fetch cocktails');
      } finally {
        setLoading(false);
      }
    }

    fetchActiveCocktails();
  }, []);

  const filteredCocktails = selectedCategory === 'All'
    ? cocktails
    : cocktails.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col relative overflow-hidden font-sans">
      {/* Background ambient decorative warm candle glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#510909]/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[60%] h-[60%] bg-[#c29a53]/6 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-[#510909]/4 rounded-full blur-[150px] pointer-events-none" />

      {/* Brand Header */}
      <header className="border-b border-[var(--brand-maroon)]/10 bg-[#fcefd4]/60 backdrop-blur-xl sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-bounce duration-[3000ms]">🍹</span>
            <div>
              <h1 className="text-xl font-display font-black text-[var(--brand-maroon)] tracking-widest leading-none">WAIKIKI</h1>
              <p className="text-[9px] text-[var(--brand-maroon)]/85 font-black uppercase tracking-[0.25em] mt-1">WebAR Interactive Menu</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="px-5 py-2 text-xs font-black uppercase tracking-wider border border-[var(--brand-maroon)]/15 hover:border-[var(--brand-maroon)] hover:text-[#fcefd4] hover:bg-[var(--brand-maroon)] rounded-xl transition-all duration-300 bg-white/20 backdrop-blur-sm shadow-sm text-[var(--brand-maroon)]"
          >
            Admin Panel
          </Link>
        </div>
      </header>

      {/* Stunning Hero Section */}
      <section className="relative py-20 px-6 border-b border-[var(--brand-maroon)]/10 flex flex-col items-center">
        <div className="max-w-4xl mx-auto text-center relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--brand-maroon)]/5 border border-[var(--brand-maroon)]/10 text-[var(--brand-maroon)] text-[10px] font-black tracking-widest uppercase mb-6 shadow-inner animate-pulse">
            <Sparkles size={12} className="text-[var(--brand-maroon)]" />
            <span>Interactive Dining Experience</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-display font-black text-[var(--brand-maroon)] tracking-tight uppercase mb-6 leading-[1.05]">
            BRING YOUR DRINK <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#510909] via-[#c29a53] to-[#510909] drop-shadow-sm">
              TO LIFE IN 3D
            </span>
          </h2>
          
          <p className="text-[var(--brand-maroon)]/80 max-w-xl text-sm md:text-base leading-relaxed mb-10 font-medium">
            Scan your cocktail card's QR code with any mobile device, point the camera at the Hiro table coaster, and watch your selection float in front of you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md">
            <Link
              href="/ar/test"
              className="px-8 py-4 bg-[var(--brand-maroon)] text-[#fcefd4] font-black uppercase tracking-wider rounded-2xl hover:bg-[#6c1010] hover:shadow-lg hover:shadow-[var(--brand-maroon)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3.5 shadow-md"
            >
              <Camera size={20} className="stroke-[2.5]" />
              <span>Launch Demo AR</span>
            </Link>
            <a
              href="#coaster-setup"
              className="px-8 py-4 bg-white/40 border border-[var(--brand-maroon)]/15 hover:border-[var(--brand-maroon)]/35 text-[var(--brand-maroon)] font-black uppercase tracking-wider rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 hover:bg-white/60"
            >
              <span>Setup Guide</span>
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* Main Layout Grid */}
      <main className="max-w-7xl mx-auto px-6 py-16 flex-1 w-full grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Menu Cards */}
        <section className="lg:col-span-2 flex flex-col gap-8">
          {/* Menu Header with Filters */}
          <div className="flex flex-col gap-6 pb-4 border-b border-[var(--brand-maroon)]/10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-black text-[var(--brand-maroon)] tracking-wider uppercase flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-[var(--brand-maroon)]" />
                <span>The Cocktail Gallery</span>
              </h2>
              <span className="text-xs text-[var(--brand-maroon)]/60 font-mono font-semibold">
                {filteredCocktails.length} item{filteredCocktails.length !== 1 ? 's' : ''} listed
              </span>
            </div>

            {/* Premium Category Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 shrink-0 cursor-pointer ${
                    selectedCategory === category
                      ? 'bg-[var(--brand-maroon)] text-[#fcefd4] shadow-md shadow-[var(--brand-maroon)]/15'
                      : 'bg-white/40 border border-[var(--brand-maroon)]/10 text-[var(--brand-maroon)] hover:bg-white/75 hover:border-[var(--brand-maroon)]/30'
                  }`}
                >
                  {category}s
                </button>
              ))}
            </div>
          </div>

          {/* List display */}
          {errorMsg ? (
            <div className="p-10 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-800 text-center font-sans z-10 relative">
              <p className="font-bold text-sm mb-1 uppercase tracking-wider">Error Connecting to Catalog</p>
              <p className="text-xs font-mono break-all opacity-85">{errorMsg}</p>
            </div>
          ) : loading ? (
            <div className="py-24 text-center flex flex-col items-center gap-4">
              <Loader2 size={36} className="animate-spin text-[var(--brand-maroon)]" />
              <p className="text-xs font-black tracking-widest text-[var(--brand-maroon)]/60 uppercase">Mixing visual assets...</p>
            </div>
          ) : filteredCocktails.length === 0 ? (
            <div className="p-16 rounded-3xl glass text-center border border-[var(--brand-maroon)]/10">
              <p className="text-[var(--brand-maroon)]/80 mb-6 font-medium">No cocktails found under "{selectedCategory}". Add new selections via Admin dashboard!</p>
              <Link
                href="/admin"
                className="inline-flex px-6 py-3 bg-[var(--brand-maroon)] text-[#fcefd4] hover:bg-[#6c1010] font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-md"
              >
                Go to Admin Panel
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 animate-[fadeIn_0.5s_ease-out]">
              {filteredCocktails.map((cocktail) => (
                <CocktailCard key={cocktail.id} cocktail={cocktail} />
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Setup Instructions */}
        <section id="coaster-setup" className="flex flex-col gap-8 scroll-mt-28">
          <div className="pb-4 border-b border-[var(--brand-maroon)]/10">
            <h2 className="text-xl font-display font-black text-[var(--brand-maroon)] tracking-wider uppercase">Interactive Setup</h2>
          </div>

          <div className="rounded-3xl glass-premium p-8 flex flex-col items-center text-center">
            {/* Hiro Coaster Mockup Container */}
            <div className="relative w-48 h-48 bg-white p-4 rounded-2xl shadow-xl mb-8 border border-[var(--brand-maroon)]/15 animate-floating flex items-center justify-center">
              <div className="absolute inset-[-4px] rounded-2xl bg-gradient-to-tr from-[#510909] to-[#c29a53] opacity-20 blur-md -z-10" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/markers/ar-menu-marker.svg"
                alt="AR Menu Marker"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            <h3 className="text-xl font-display font-black text-[var(--brand-maroon)] mb-2.5 uppercase tracking-wide">AR Menu Table Coaster</h3>
            <p className="text-xs text-[var(--brand-maroon)]/70 leading-relaxed mb-8 max-w-sm">
              The camera tracks this marker to place the virtual 3D cards directly on top of it. Print this and place it on your bar tables.
            </p>

            <a
              href="/print-marker.html"
              target="_blank"
              className="w-full py-4 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/15 hover:border-[var(--brand-maroon)] hover:bg-white/60 text-[var(--brand-maroon)] hover:text-[#510909] font-black uppercase text-xs tracking-wider transition-all duration-300 flex items-center justify-center gap-2.5 mb-6"
            >
              <Download size={15} className="stroke-[2.5]" />
              <span>Print AR Menu Marker</span>
            </a>

            <div className="w-full text-left bg-white/30 border border-[var(--brand-maroon)]/10 p-5 rounded-2xl flex flex-col gap-4">
              <p className="text-xs font-black text-[var(--brand-maroon)] uppercase tracking-wider border-b border-[var(--brand-maroon)]/10 pb-2.5 flex items-center gap-2">
                <Compass size={16} className="text-[var(--brand-maroon)]" />
                <span>On-Table Assembly Guide</span>
              </p>
              <ol className="list-decimal pl-4 text-xs text-[var(--brand-maroon)]/80 flex flex-col gap-3">
                <li>
                  <span className="text-[var(--brand-maroon)] font-bold">Print the Coaster:</span> Print the AR Menu marker onto cards or table coasters.
                </li>
                <li>
                  <span className="text-[var(--brand-maroon)] font-bold">Provide QR Codes:</span> Stand the print cards or menu lists beside the coasters.
                </li>
                <li>
                  <span className="text-[var(--brand-maroon)] font-bold">Scan and Enjoy:</span> Point camera at the coaster, watch the cocktails float, and view active recipe details!
                </li>
              </ol>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--brand-maroon)]/10 bg-[#510909]/5 py-10 text-center text-xs text-[var(--brand-maroon)]/65 backdrop-blur-sm mt-12">
        <p className="uppercase tracking-[0.2em] font-display font-black text-[var(--brand-maroon)]">Waikiki Bar & Lounge © 2026</p>
        <p className="mt-2 text-[10px] text-[var(--brand-maroon)]/50 font-medium">Powered by AR.js tracking & Next.js App Router</p>
      </footer>
    </div>
  );
}
