import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  if (!rateLimit(getIp(request), 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = body?.slug;
  if (!slug || typeof slug !== 'string') {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await sb
    .from('cocktail_scans')
    .insert({ cocktail_slug: slug });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
