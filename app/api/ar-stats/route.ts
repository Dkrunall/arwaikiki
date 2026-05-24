import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [allRes, todayRes, cocktailRes] = await Promise.all([
    sb.from('cocktail_scans').select('cocktail_slug'),
    sb.from('cocktail_scans').select('cocktail_slug')
      .gte('scanned_at', todayStart.toISOString()),
    sb.from('cocktails').select('name, slug, category, card_color')
      .eq('is_active', true),
  ]);

  const allTime: Record<string, number> = {};
  (allRes.data || []).forEach((r: { cocktail_slug: string }) => {
    allTime[r.cocktail_slug] = (allTime[r.cocktail_slug] || 0) + 1;
  });

  const today: Record<string, number> = {};
  (todayRes.data || []).forEach((r: { cocktail_slug: string }) => {
    today[r.cocktail_slug] = (today[r.cocktail_slug] || 0) + 1;
  });

  const cocktails = (cocktailRes.data || []).map((c: {
    name: string; slug: string; category: string; card_color: string;
  }) => ({
    name:       c.name,
    slug:       c.slug,
    category:   c.category,
    card_color: c.card_color || '#0c0918',
    today:      today[c.slug] || 0,
    all_time:   allTime[c.slug] || 0,
  })).sort((a, b) => b.today - a.today || b.all_time - a.all_time);

  const totalToday   = Object.values(today).reduce((s, n) => s + n, 0);
  const totalAllTime = Object.values(allTime).reduce((s, n) => s + n, 0);

  return NextResponse.json({ cocktails, totalToday, totalAllTime });
}
