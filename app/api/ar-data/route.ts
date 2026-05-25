import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getIp } from '@/lib/rate-limit';

interface Cocktail {
  id: string; name: string; slug: string; category: string;
  description: string; ingredients: string[] | string;
  price: number; image_url: string; video_url?: string; card_color: string;
  is_active: boolean; scan_count?: number; is_daily_special?: boolean;
}

const MOCK: Cocktail[] = [
  {
    id: 'mock1', name: 'Blue Lagoon', slug: 'test', category: 'Signature',
    description: 'A vibrant blue tropical cocktail with vodka, blue curaçao, and fresh lemonade.',
    ingredients: ['Vodka', 'Blue Curaçao', 'Lemonade', 'Lemon'],
    price: 650, image_url: 'https://picsum.photos/seed/bluelagoon/400/400',
    video_url: '/videos/c11.mp4', card_color: '#0a4a7a', is_active: true,
  },
  {
    id: 'mock2', name: 'Waikiki Sunset', slug: 'test2', category: 'Tropical',
    description: 'A stunning sunset-inspired blend of tequila, orange juice, and grenadine.',
    ingredients: ['Tequila', 'Orange Juice', 'Grenadine', 'Lime'],
    price: 750, image_url: 'https://picsum.photos/seed/waikiki/400/400',
    video_url: '/videos/c12.mp4', card_color: '#7a1a0a', is_active: true,
  },
];

export async function GET(request: NextRequest) {
  if (!rateLimit(getIp(request), 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const slug = new URL(request.url).searchParams.get('slug') || '';

  let cocktails: Cocktail[] = [];

  let scanCounts: Record<string, number> = {};

  if (slug === 'test' || slug === 'mock') {
    cocktails = MOCK;
  } else {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [cocktailRes, scanRes] = await Promise.all([
      sb.from('cocktails').select('*').eq('is_active', true)
        .order('created_at', { ascending: false }),
      sb.from('cocktail_scans').select('cocktail_slug')
        .gte('scanned_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    cocktails = cocktailRes.data || [];
    (scanRes.data || []).forEach((r: { cocktail_slug: string }) => {
      scanCounts[r.cocktail_slug] = (scanCounts[r.cocktail_slug] || 0) + 1;
    });
  }

  // Normalise ingredients to array
  const normalised = cocktails.map(c => ({
    name:        c.name,
    slug:        c.slug,
    category:    c.category,
    description: c.description || '',
    ingredients: Array.isArray(c.ingredients)
      ? c.ingredients
      : String(c.ingredients).split(',').map(s => s.trim()),
    price:      c.price,
    image_url:  c.image_url || '',
    video_url:  c.video_url || '',
    card_color: c.card_color || '#0c0918',
    scan_count:       scanCounts[c.slug] || 0,
    is_daily_special: c.is_daily_special || false,
  }));

  let startIndex = normalised.findIndex(c => c.slug === slug);
  if (startIndex < 0) startIndex = 0;

  return NextResponse.json({ cocktails: normalised, startIndex });
}
