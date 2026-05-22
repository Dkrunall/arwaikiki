'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Cocktail } from '@/types/cocktail';
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// Dynamically load the ARScene with SSR disabled (A-Frame relies on browser-only window/document object)
const ARScene = dynamic(() => import('@/components/ARScene'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0e27] text-white">
      <Loader2 size={32} className="animate-spin text-[#2dd4a4] mb-4" />
      <p className="text-sm font-semibold tracking-wide uppercase text-[#f0ead8]">Loading AR Experience...</p>
    </div>
  ),
});

const BottomBar = dynamic(() => import('@/components/BottomBar'), {
  ssr: false,
});

// Mock/Test cocktail data for database-free testing
const MOCK_COCKTAIL: Cocktail = {
  id: 'mock-uuid',
  name: 'Blue Lagoon',
  slug: 'test',
  category: 'Signature',
  description: 'A vibrant blue tropical cocktail combining vodka, blue curacao, and fresh lemonade. Perfectly refreshing and served ice cold.',
  ingredients: ['Vodka', 'Blue Curacao', 'Lemonade', 'Lemon garnish'],
  price: 650,
  // High quality transparent cocktail PNG placeholder
  image_url: 'https://img.pngimg.com/uploads/cocktail/cocktail_PNG75.png', 
  card_color: '#0a0e27',
  is_active: true,
};

export default function ARViewerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [cocktail, setCocktail] = useState<Cocktail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCocktail() {
      if (!slug) return;

      // Handle mock/test case
      if (slug === 'test' || slug === 'mock') {
        setCocktail(MOCK_COCKTAIL);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch cocktail matching the slug from Supabase
        const { data, error: dbError } = await supabase
          .from('cocktails')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (dbError) {
          throw new Error('Cocktail not found or inactive.');
        }

        setCocktail(data);
      } catch (err: any) {
        console.error('Fetch error:', err);
        setError(err.message || 'Failed to load cocktail details.');
      } finally {
        setLoading(false);
      }
    }

    fetchCocktail();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0e27] text-white">
        <Loader2 size={36} className="animate-spin text-[#2dd4a4] mb-4" />
        <p className="text-sm font-semibold tracking-widest uppercase text-gray-400">Fetching Recipe...</p>
      </div>
    );
  }

  if (error || !cocktail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0e27] text-[#f0ead8] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
          <RefreshCw size={24} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Cocktail Not Found</h2>
        <p className="text-sm text-gray-400 max-w-sm mb-8">
          The requested cocktail is not available on our menu or might have been deactivated.
        </p>
        <div className="flex gap-4">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-white transition-all text-sm font-bold flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back to Menu
          </Link>
          <button
            onClick={() => router.push('/ar/test')}
            className="px-5 py-2.5 rounded-lg bg-[#2dd4a4] text-[#0a0e27] font-bold hover:bg-opacity-80 transition-all text-sm"
          >
            Try Demo Card
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen relative bg-black select-none">
      {/* Back Button overlay */}
      <div className="fixed top-6 left-6 z-50 pointer-events-auto">
        <Link
          href="/"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#080e24]/80 hover:bg-[#080e24] border border-white/5 hover:border-[#2dd4a4] text-white transition-all backdrop-blur-md shadow-lg"
          title="Back to Menu"
        >
          <ArrowLeft size={20} />
        </Link>
      </div>

      {/* Full-screen WebAR A-Frame container */}
      <ARScene cocktail={cocktail} />

      {/* Fixed controls panel on top of the A-Frame viewport */}
      <BottomBar cocktail={cocktail} />
    </div>
  );
}

