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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let cocktails: Cocktail[] = [];

  if (slug === 'test' || slug === 'mock') {
    cocktails = MOCK;
  } else {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('cocktails').select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    cocktails = data || [];
  }

  if (!cocktails.length) return NextResponse.redirect(new URL('/', request.url));

  let startIndex = cocktails.findIndex(c => c.slug === slug);
  if (startIndex < 0) startIndex = 0;

  const origin = new URL(request.url).origin;

  return new NextResponse(buildHTML(cocktails, startIndex, origin), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function esc(v: unknown) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function buildHTML(cocktails: Cocktail[], startIndex: number, origin: string): string {
  const data = cocktails.map(c => ({
    name: c.name, slug: c.slug, category: c.category,
    description: c.description || '',
    ingredients: Array.isArray(c.ingredients)
      ? c.ingredients : String(c.ingredients).split(',').map(s=>s.trim()),
    price: c.price,
    image_url: c.image_url || '',
    card_color: c.card_color || '#510909',
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<meta name="mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<title>Waikiki Bar – Menu</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#0a0612;
  font-family:'Helvetica Neue',Arial,sans-serif;-webkit-tap-highlight-color:transparent}

/* ── Camera ─────────────────────────────────────────────────── */
#cam{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:.55}
#cam-bg{position:fixed;inset:0;z-index:1;
  background:radial-gradient(ellipse at 50% 30%,rgba(30,10,60,.4) 0%,rgba(8,4,20,.75) 100%);
  backdrop-filter:blur(1px)}

/* ── Top bar ─────────────────────────────────────────────────── */
#topbar{
  position:fixed;top:0;left:0;right:0;z-index:200;
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;padding-top:max(16px,env(safe-area-inset-top))}
.tbtn{
  width:40px;height:40px;border-radius:50%;
  background:rgba(255,255,255,.12);backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.18);color:#fff;
  display:flex;align-items:center;justify-content:center;
  text-decoration:none;font-size:18px;cursor:pointer;flex-shrink:0}
#brand{
  font-size:13px;font-weight:900;text-transform:uppercase;
  letter-spacing:.2em;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.5)}
#counter{
  font-size:12px;font-weight:700;color:rgba(255,255,255,.85);
  background:rgba(0,0,0,.35);backdrop-filter:blur(10px);
  padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.15)}

/* ── Slider wrapper ──────────────────────────────────────────── */
#wrap{
  position:fixed;bottom:0;left:0;right:0;z-index:100;
  height:82vh;display:flex;align-items:flex-end;pointer-events:none}

/* ── Slider track ────────────────────────────────────────────── */
#track{
  display:flex;align-items:flex-end;gap:16px;
  padding:0 12vw 56px;
  transition:transform .42s cubic-bezier(.25,.46,.45,.94);
  will-change:transform;pointer-events:auto}

/* ── Card ────────────────────────────────────────────────────── */
.card{
  flex-shrink:0;width:76vw;border-radius:28px;
  position:relative;overflow:hidden;cursor:pointer;
  transition:transform .4s,filter .4s,box-shadow .4s;
  box-shadow:0 32px 80px rgba(0,0,0,.55)}
.card.active{transform:scale(1) translateY(0);filter:brightness(1);
  box-shadow:0 32px 80px rgba(0,0,0,.7)}
.card:not(.active){transform:scale(.9) translateY(24px);filter:brightness(.6)}

/* Card top: image area */
.card-top{
  width:100%;height:52vw;overflow:hidden;
  display:flex;align-items:center;justify-content:center;
  position:relative}
.card-top::after{
  content:'';position:absolute;bottom:0;left:0;right:0;height:50%;
  background:linear-gradient(to bottom,transparent,var(--bg))}
.card-img{
  width:90%;height:100%;object-fit:contain;
  filter:drop-shadow(0 16px 40px rgba(0,0,0,.45));
  transition:transform .4s}
.card.active .card-img{transform:scale(1.08) translateY(-4px)}
.card:not(.active) .card-img{transform:scale(.95)}

/* Floating image animation on active */
@keyframes bob{0%,100%{transform:scale(1.08) translateY(-4px)}
               50%{transform:scale(1.08) translateY(-14px)}}
.card.active .card-img{animation:bob 2.8s ease-in-out infinite}

/* Card bottom: info */
.card-info{width:100%;padding:16px 20px 22px;position:relative;z-index:2}
.cat-badge{
  display:inline-block;font-size:9px;font-weight:900;text-transform:uppercase;
  letter-spacing:.15em;padding:3px 10px;border-radius:20px;margin-bottom:10px;
  color:#fff;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25)}
.cname{
  font-size:clamp(20px,5.5vw,26px);font-weight:900;text-transform:uppercase;
  letter-spacing:.03em;line-height:1.1;color:#fff;margin-bottom:8px;
  text-shadow:0 2px 8px rgba(0,0,0,.4)}
.cdesc{
  font-size:12px;color:rgba(255,255,255,.72);line-height:1.5;margin-bottom:14px;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cfooter{display:flex;justify-content:space-between;align-items:center;gap:10px}
.cprice{font-size:22px;font-weight:900;color:#fff;white-space:nowrap}
.cings{display:flex;gap:5px;overflow:hidden;flex-wrap:nowrap}
.ing{
  font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
  padding:4px 8px;border-radius:10px;white-space:nowrap;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);color:#fff}

/* ── Dots ────────────────────────────────────────────────────── */
#dots{
  position:fixed;bottom:20px;left:0;right:0;
  display:flex;justify-content:center;align-items:center;gap:6px;z-index:200}
.dot{
  width:6px;height:6px;border-radius:3px;
  background:rgba(255,255,255,.3);cursor:pointer;
  transition:all .3s;flex-shrink:0}
.dot.active{width:22px;background:#fff}

/* ── Swipe hint ──────────────────────────────────────────────── */
#hint{
  position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
  z-index:300;text-align:center;pointer-events:none;
  animation:fadeHint 2.8s ease-out forwards}
@keyframes fadeHint{0%{opacity:0}15%{opacity:1}75%{opacity:1}100%{opacity:0}}
.hint-icon{font-size:36px;margin-bottom:8px}
.hint-txt{font-size:11px;font-weight:900;text-transform:uppercase;
  letter-spacing:.18em;color:rgba(255,255,255,.9)}
</style>
</head>
<body>

<!-- Camera -->
<video id="cam" autoplay playsinline muted></video>
<div id="cam-bg"></div>

<!-- Top bar -->
<div id="topbar">
  <a class="tbtn" href="${esc(origin)}">&#8592;</a>
  <span id="brand">🍹 Waikiki</span>
  <span id="counter">1 / ${data.length}</span>
</div>

<!-- Slider -->
<div id="wrap"><div id="track"></div></div>

<!-- Dots -->
<div id="dots"></div>

<!-- Swipe hint (auto-fades) -->
${data.length > 1 ? `
<div id="hint">
  <div class="hint-icon">👈 👉</div>
  <div class="hint-txt">Swipe to browse</div>
</div>` : ''}

<script>
var DATA = ${JSON.stringify(data)};
var cur  = ${startIndex};
var tot  = DATA.length;
var CARD_W = 0; // set after first render

// Build cards
var track = document.getElementById('track');
DATA.forEach(function(c, i) {
  var ings = c.ingredients.slice(0,3)
    .map(function(g){ return '<span class="ing">'+g+'</span>'; }).join('');
  var div = document.createElement('div');
  div.className = 'card';
  div.style.setProperty('--bg', c.card_color);
  div.innerHTML =
    '<div class="card-top" style="background:'+c.card_color+'">'+
      '<img class="card-img" src="'+c.image_url+'" alt="'+c.name+'" loading="lazy" crossorigin="anonymous"/>'+
    '</div>'+
    '<div class="card-info" style="background:'+c.card_color+'">'+
      '<span class="cat-badge">'+c.category+'</span>'+
      '<h2 class="cname">'+c.name.toUpperCase()+'</h2>'+
      '<p class="cdesc">'+c.description+'</p>'+
      '<div class="cfooter">'+
        '<span class="cprice">Rs. '+c.price+'</span>'+
        '<div class="cings">'+ings+'</div>'+
      '</div>'+
    '</div>';
  div.addEventListener('click', function(){ if(i !== cur) goTo(i); });
  track.appendChild(div);
});

// Build dots
var dotsEl = document.getElementById('dots');
DATA.forEach(function(_, i) {
  var d = document.createElement('div');
  d.className = 'dot';
  d.addEventListener('click', function(){ goTo(i); });
  dotsEl.appendChild(d);
});

function getCardW() {
  var cards = track.querySelectorAll('.card');
  if (!cards.length) return 0;
  return cards[0].getBoundingClientRect().width + 16; // card + gap
}

function goTo(idx) {
  cur = Math.max(0, Math.min(tot-1, idx));
  if (!CARD_W) CARD_W = getCardW();
  track.style.transform = 'translateX(-'+(cur * CARD_W)+'px)';
  track.querySelectorAll('.card').forEach(function(c,i){
    c.classList.toggle('active', i===cur);
  });
  dotsEl.querySelectorAll('.dot').forEach(function(d,i){
    d.classList.toggle('active', i===cur);
  });
  document.getElementById('counter').textContent = (cur+1)+' / '+tot;
}

// Initial render (after layout)
requestAnimationFrame(function(){ CARD_W = getCardW(); goTo(cur); });
window.addEventListener('resize', function(){ CARD_W = getCardW(); goTo(cur); });

// Touch swipe
var tx=0, ty=0, dragging=false;
document.addEventListener('touchstart',function(e){
  tx=e.touches[0].clientX; ty=e.touches[0].clientY; dragging=true;
},{passive:true});
document.addEventListener('touchmove',function(e){
  if(!dragging) return;
  var dx=e.touches[0].clientX-tx, dy=e.touches[0].clientY-ty;
  if(Math.abs(dx)>Math.abs(dy)) e.preventDefault();
},{passive:false});
document.addEventListener('touchend',function(e){
  if(!dragging) return; dragging=false;
  var dx=e.changedTouches[0].clientX-tx, dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)>Math.abs(dy) && Math.abs(dx)>40) goTo(dx<0?cur+1:cur-1);
},{passive:true});

// Mouse drag (desktop testing)
var mx=0, mdown=false;
document.addEventListener('mousedown',function(e){ mx=e.clientX; mdown=true; });
document.addEventListener('mouseup',function(e){
  if(!mdown) return; mdown=false;
  var dx=e.clientX-mx;
  if(Math.abs(dx)>40) goTo(dx<0?cur+1:cur-1);
});

// Camera
if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
  navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}})
    .then(function(s){ document.getElementById('cam').srcObject=s; })
    .catch(function(){/* fallback bg already shown */});
}
</script>
</body>
</html>`;
}
