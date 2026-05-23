import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface Cocktail {
  id: string; name: string; slug: string; category: string;
  description: string; ingredients: string[] | string;
  price: number; image_url: string; card_color: string; is_active: boolean;
}

const MOCK: Cocktail[] = [{
  id: 'mock', name: 'Blue Lagoon', slug: 'test', category: 'Signature',
  description: 'A vibrant blue tropical cocktail combining vodka, blue curaçao, and fresh lemonade.',
  ingredients: ['Vodka', 'Blue Curaçao', 'Lemonade', 'Lemon'],
  price: 650, image_url: 'https://img.pngimg.com/uploads/cocktail/cocktail_PNG75.png',
  card_color: '#0a4a7a', is_active: true,
}];

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get('slug') || '';

  let cocktails: Cocktail[] = [];

  if (slug === 'test' || slug === 'mock') {
    cocktails = MOCK;
  } else {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await sb
      .from('cocktails').select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    cocktails = data || [];
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
    price:     c.price,
    image_url: c.image_url || '',
    card_color: c.card_color || '#0c0918',
  }));

  let startIndex = normalised.findIndex(c => c.slug === slug);
  if (startIndex < 0) startIndex = 0;

  return NextResponse.json({ cocktails: normalised, startIndex });
}
