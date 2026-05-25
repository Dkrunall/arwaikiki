import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let cocktails: Cocktail[] = [];

  let scanCounts: Record<string, number> = {};

  if (slug === 'test' || slug === 'mock') {
    cocktails = MOCK;
  } else {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const [cocktailRes, scanRes] = await Promise.all([
      supabase.from('cocktails').select('*').eq('is_active', true)
        .order('created_at', { ascending: false }),
      supabase.from('cocktail_scans').select('cocktail_slug')
        .gte('scanned_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);
    cocktails = cocktailRes.data || [];
    (scanRes.data || []).forEach((r: { cocktail_slug: string }) => {
      scanCounts[r.cocktail_slug] = (scanCounts[r.cocktail_slug] || 0) + 1;
    });
  }

  if (!cocktails.length) return NextResponse.redirect(new URL('/', request.url));

  // Merge today's scan counts into cocktail objects before passing to buildHTML
  const cocktailsWithCounts = cocktails.map(c => ({
    ...c, scan_count: scanCounts[c.slug] || 0,
  }));

  let startIndex = cocktailsWithCounts.findIndex(c => c.slug === slug);
  if (startIndex < 0) startIndex = 0;

  const origin = new URL(request.url).origin;

  return new NextResponse(buildHTML(cocktailsWithCounts, startIndex, origin), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Permissions-Policy': 'camera=*, microphone=*',
    },
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
      ? c.ingredients : String(c.ingredients).split(',').map(s => s.trim()),
    price:      c.price,
    image_url:  c.image_url || '',
    video_url:  c.video_url || '',
    card_color: c.card_color || '#0c0918',
    scan_count:       c.scan_count || 0,
    is_daily_special: c.is_daily_special || false,
  }));

  const f   = data[startIndex];
  const tot = data.length;
  const fIngs = f.ingredients.slice(0, 4).join(' \xb7 ');

  // Pre-load assets — video element if video_url present, otherwise img
  const assetTags = data.map((c, i) =>
    c.video_url
      ? `<video id="ci${i}" src="${esc(c.video_url)}" autoplay loop muted playsinline preload="auto" webkit-playsinline crossorigin="anonymous"></video>`
      : `<img id="ci${i}" src="${esc(c.image_url)}" crossorigin="anonymous"/>`
  ).join('\n    ');

  // Safe JSON — prevent </script> injection
  const safeData = JSON.stringify(data).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<meta name="mobile-web-app-capable" content="yes"/>
<meta name="apple-mobile-web-app-capable" content="yes"/>
<title>Waikiki AR</title>
<!-- Exact CDN combo from official AR.js docs/examples -->
<script src="https://cdn.jsdelivr.net/gh/aframevr/aframe@1.6.0/dist/aframe-master.min.js"></script>
<script src="https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js"></script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{margin:0;overflow:hidden;background:#000;
  font-family:'Helvetica Neue',Arial,sans-serif;-webkit-tap-highlight-color:transparent}


/* ── Loading screen ──────────────────────────────────────── */
#ld{position:fixed;inset:0;z-index:9999;background:#060212;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  transition:opacity .6s ease}
#ld.gone{opacity:0;pointer-events:none}
.ldring{width:72px;height:72px;border-radius:50%;margin-bottom:24px;
  border:3px solid rgba(194,154,83,.15);border-top:3px solid #c29a53;
  animation:ldspin .9s linear infinite}
@keyframes ldspin{to{transform:rotate(360deg)}}
.ldtitle{font-size:22px;font-weight:900;letter-spacing:.25em;
  text-transform:uppercase;color:#c29a53;margin-bottom:6px}
.ldsub{font-size:10px;font-weight:700;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(255,255,255,.4)}

/* ── HUD layer (on top of A-Frame) ──────────────────────── */
#hud{position:fixed;inset:0;z-index:100;
  display:none;flex-direction:column;pointer-events:none}

/* Top bar */
#topbar{display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px;padding-top:max(16px,env(safe-area-inset-top));
  background:linear-gradient(180deg,rgba(0,0,0,.7) 0%,transparent 100%);
  pointer-events:auto}
.tbtn{width:42px;height:42px;border-radius:50%;
  background:rgba(255,255,255,.1);backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,.2);color:#fff;
  display:flex;align-items:center;justify-content:center;
  text-decoration:none;font-size:18px;cursor:pointer;flex-shrink:0}
#brand{font-size:13px;font-weight:900;text-transform:uppercase;
  letter-spacing:.2em;color:#fff;text-shadow:0 2px 16px rgba(0,0,0,.9)}
#camst{font-size:11px;font-weight:700;color:rgba(255,255,255,.8);
  background:rgba(0,0,0,.45);backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  padding:6px 14px;border-radius:20px;
  border:1px solid rgba(255,255,255,.14);
  transition:color .3s,border-color .3s,background .3s}
#camst.locked{color:#c29a53;
  border-color:rgba(194,154,83,.45);
  background:rgba(194,154,83,.08)}

/* Center scan target */
#scanarea{flex:1;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:16px;
  transition:opacity .45s}
#scanarea.hide{opacity:0;visibility:hidden}
#scanbox{width:210px;height:210px;position:relative;
  display:flex;align-items:center;justify-content:center}
.cor{position:absolute;width:26px;height:26px}
.cor.tl{top:0;left:0;border-top:3px solid #c29a53;border-left:3px solid #c29a53;border-radius:9px 0 0 0}
.cor.tr{top:0;right:0;border-top:3px solid #c29a53;border-right:3px solid #c29a53;border-radius:0 9px 0 0}
.cor.bl{bottom:0;left:0;border-bottom:3px solid #c29a53;border-left:3px solid #c29a53;border-radius:0 0 0 9px}
.cor.br{bottom:0;right:0;border-bottom:3px solid #c29a53;border-right:3px solid #c29a53;border-radius:0 0 9px 0}
/* Inner corner accents */
.cor::before{content:'';position:absolute;background:#c29a53;border-radius:2px}
.cor.tl::before,.cor.tr::before{top:-1px;width:3px;height:8px}
.cor.bl::before,.cor.br::before{bottom:-1px;width:3px;height:8px}
.cor.tl::before{left:0} .cor.tr::before{right:0}
.cor.bl::before{left:0} .cor.br::before{right:0}
#sline{position:absolute;inset-x:8px;height:2px;top:0;
  background:linear-gradient(90deg,transparent,#c29a53,rgba(194,154,83,.4),#c29a53,transparent);
  animation:sln 2.5s linear infinite;
  box-shadow:0 0 10px 1px rgba(194,154,83,.5)}
@keyframes sln{0%{top:0;opacity:.1}8%{opacity:1}92%{opacity:1}100%{top:100%;opacity:.1}}
.scan-inner-border{
  position:absolute;inset:28px;border:1px solid rgba(194,154,83,.12);border-radius:4px}
#scanlbl{font-size:11px;font-weight:900;text-transform:uppercase;
  letter-spacing:.18em;color:rgba(255,255,255,.65);text-align:center;
  text-shadow:0 2px 8px rgba(0,0,0,.8)}
#scansub{font-size:9px;font-weight:700;text-transform:uppercase;
  letter-spacing:.12em;color:rgba(194,154,83,.6);text-align:center;margin-top:4px}

/* Bottom nav bar */
#botbar{display:flex;align-items:center;justify-content:space-between;
  padding:14px 20px;padding-bottom:max(20px,env(safe-area-inset-bottom));
  background:linear-gradient(0deg,rgba(0,0,0,.75) 0%,transparent 100%);
  pointer-events:auto}
.navbtn{width:46px;height:46px;border-radius:50%;
  background:rgba(255,255,255,.1);backdrop-filter:blur(16px);
  -webkit-backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,.2);color:#fff;font-size:20px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  transition:background .15s,border-color .15s,transform .1s;
  -webkit-tap-highlight-color:transparent;user-select:none}
.navbtn:active{background:rgba(194,154,83,.25);border-color:rgba(194,154,83,.6);
  transform:scale(.92)}
${tot <= 1 ? '.navbtn{opacity:.25;pointer-events:none}' : ''}
#cinfo{text-align:center;flex:1;padding:0 12px}
#ciname{font-size:16px;font-weight:900;text-transform:uppercase;
  letter-spacing:.08em;color:#fff;
  text-shadow:0 2px 12px rgba(0,0,0,.9);line-height:1.2}
#cisub{font-size:10px;font-weight:700;letter-spacing:.15em;
  text-transform:uppercase;color:rgba(194,154,83,.9);margin-top:3px}
#cicnt{font-size:10px;color:rgba(255,255,255,.4);margin-top:3px;letter-spacing:.08em}

/* ── Tap hint pill ───────────────────────────────────────── */
#taphint{position:fixed;bottom:110px;left:50%;transform:translateX(-50%);
  z-index:150;background:rgba(81,9,9,.92);color:#fcefd4;
  font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;
  padding:9px 20px;border-radius:20px;white-space:nowrap;
  border:1px solid rgba(194,154,83,.35);
  opacity:0;transition:opacity .4s;pointer-events:none}
#taphint.on{opacity:1}

/* ── Description bottom sheet ────────────────────────────── */
#descbg{position:fixed;inset:0;z-index:500;background:rgba(81,9,9,.45);
  backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);
  display:none;align-items:flex-end}
#descbg.on{display:flex}
#descsheet{background:#fcefd4;border-radius:28px 28px 0 0;
  padding:28px 24px 48px;width:100%;max-height:75vh;overflow-y:auto;
  transform:translateY(100%);
  transition:transform .38s cubic-bezier(.34,1.56,.64,1)}
#descbg.on #descsheet{transform:translateY(0)}
#desc-handle{width:40px;height:4px;background:#510909;opacity:.2;
  border-radius:2px;margin:0 auto 22px}
#desc-cat{font-size:10px;font-weight:900;text-transform:uppercase;
  letter-spacing:.2em;color:#c29a53;margin-bottom:6px}
#desc-name{font-size:24px;font-weight:900;text-transform:uppercase;
  letter-spacing:.06em;color:#510909;line-height:1.1;margin-bottom:14px}
#desc-text{font-size:13px;color:#510909;opacity:.72;
  line-height:1.75;margin-bottom:20px}
#desc-ings-label{font-size:10px;font-weight:900;text-transform:uppercase;
  letter-spacing:.15em;color:#510909;margin-bottom:10px}
#desc-ings{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
.ing-chip{padding:5px 13px;background:rgba(81,9,9,.07);
  border:1px solid rgba(81,9,9,.14);border-radius:20px;
  font-size:11px;font-weight:700;color:#510909;
  text-transform:uppercase;letter-spacing:.08em}
#desc-footer{display:flex;justify-content:space-between;align-items:center;
  padding-top:16px;border-top:1px solid rgba(81,9,9,.1)}
#desc-price{font-size:22px;font-weight:900;color:#510909}
.desc-btns{display:flex;gap:8px}
#share-btn{padding:12px 18px;background:rgba(194,154,83,.12);color:#7a5a1a;
  font-weight:900;border:1px solid rgba(194,154,83,.45);border-radius:14px;
  font-size:12px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;
  -webkit-tap-highlight-color:transparent;transition:background .15s}
#share-btn:active{background:rgba(194,154,83,.28)}
#desc-close{padding:12px 20px;background:#510909;color:#fcefd4;
  font-weight:900;border:none;border-radius:14px;font-size:12px;
  letter-spacing:.12em;text-transform:uppercase;cursor:pointer;
  -webkit-tap-highlight-color:transparent}
/* Toast */
#toast{position:fixed;bottom:140px;left:50%;transform:translateX(-50%);
  z-index:600;background:rgba(10,10,20,.9);color:#fff;
  font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;
  padding:10px 22px;border-radius:20px;white-space:nowrap;
  border:1px solid rgba(255,255,255,.12);
  opacity:0;transition:opacity .3s;pointer-events:none}
#toast.on{opacity:1}

/* ── Share bottom sheet ──────────────────────────────────── */
#sharebg{position:fixed;inset:0;z-index:700;background:rgba(0,0,0,.72);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  display:none;align-items:flex-end;justify-content:center}
#sharebg.on{display:flex}
#sharesheet2{background:#100820;border-radius:28px 28px 0 0;
  padding:20px 20px 48px;width:100%;max-width:520px;
  transform:translateY(100%);
  transition:transform .38s cubic-bezier(.34,1.56,.64,1)}
#sharebg.on #sharesheet2{transform:translateY(0)}
#sh-handle{width:40px;height:4px;background:rgba(255,255,255,.18);
  border-radius:2px;margin:0 auto 16px}
#sh-title{font-size:11px;font-weight:900;text-transform:uppercase;
  letter-spacing:.2em;color:rgba(255,255,255,.38);text-align:center;margin-bottom:18px}
#sh-card-wrap{display:flex;justify-content:center;margin-bottom:20px}
#share-canvas{border-radius:14px;width:130px;height:231px;
  box-shadow:0 8px 32px rgba(0,0,0,.65);display:block;object-fit:cover}
#sh-btns{display:flex;flex-direction:column;gap:10px}
.shopt{display:flex;align-items:center;gap:14px;padding:15px 18px;
  border-radius:16px;border:none;cursor:pointer;font-weight:900;font-size:13px;
  letter-spacing:.05em;text-transform:uppercase;width:100%;text-align:left;
  -webkit-tap-highlight-color:transparent;transition:opacity .12s,transform .1s}
.shopt:active{opacity:.78;transform:scale(.98)}
.shopt svg{width:22px;height:22px;flex-shrink:0}
.shopt-wa{background:#25D366;color:#fff}
.shopt-ig{background:radial-gradient(circle at 28% 110%,#fdf497 0%,#fd5949 40%,#d6249f 65%,#285AEB 90%);color:#fff}
.shopt-copy{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.12)}
.shopt-close{background:transparent;color:rgba(255,255,255,.32);
  justify-content:center;font-size:11px;padding:10px;letter-spacing:.15em}
</style>
</head>
<body>

<!-- Loading screen -->
<div id="ld">
  <div class="ldring"></div>
  <div class="ldtitle">&#127865; Waikiki</div>
  <div class="ldsub" id="ldsub">Starting AR Camera&hellip;</div>
</div>

<!-- Register marker event component BEFORE a-scene is parsed (official AR.js pattern) -->
<script>
var markerVisible = false;
var navBusy = false;

AFRAME.registerComponent('waikiki-events', {
  init: function() {
    var marker   = this.el;
    var card     = document.getElementById('ar-card');
    var scanarea = document.getElementById('scanarea');
    var camst    = document.getElementById('camst');
    var tips     = document.getElementById('tips');
    var tipsTimer = setTimeout(function(){ if(tips) tips.style.display='block'; }, 9000);

    marker.addEventListener('markerFound', function() {
      markerVisible = true;
      clearTimeout(tipsTimer);
      if(tips)    tips.style.display = 'none';
      if(scanarea) scanarea.classList.add('hide');
      if(camst)  { camst.textContent = '✓ LOCKED'; camst.classList.add('locked'); }
      if(card) card.setAttribute('animation__popin',
        'property:scale; from:0 0 0; to:1 1 1; dur:450; easing:easeOutBack');
      // Log scan
      if (typeof logScan === 'function' && typeof DATA !== 'undefined') logScan(DATA[cur].slug);
      // Enable tap zone + show hint briefly
      var tz = document.getElementById('tapzone');
      if(tz) tz.style.pointerEvents = 'auto';
      var th = document.getElementById('taphint');
      if(th){ th.classList.add('on'); setTimeout(function(){ th.classList.remove('on'); }, 3000); }
    });

    marker.addEventListener('markerLost', function() {
      markerVisible = false;
      if(scanarea) scanarea.classList.remove('hide');
      if(camst)  { camst.textContent = '● SCANNING'; camst.classList.remove('locked'); }
      if(card) card.setAttribute('animation__popout',
        'property:scale; from:1 1 1; to:0 0 0; dur:220; easing:easeInBack');
      // Disable tap zone + close sheet if open
      var tz = document.getElementById('tapzone');
      if(tz) tz.style.pointerEvents = 'none';
      closeDesc();
    });
  }
});

// camera-init fires after the user grants camera permission (= valid user gesture)
// This is the earliest safe moment to call video.play() on iOS/Android
function playAllVideos() {
  document.querySelectorAll('a-assets video').forEach(function(v) {
    v.play().catch(function(){});
  });
}
window.addEventListener('camera-init', function() {
  var s = document.getElementById('ldsub');
  if(s){ s.textContent = '✓ Camera Active'; s.style.color = '#5cb85c'; }
  playAllVideos();
});
// Fallback: first touch anywhere (covers browsers where camera-init fires too early)
document.addEventListener('touchstart', playAllVideos, { once: true });

// arjs-video-loaded → video appended to DOM, ready to scan
window.addEventListener('arjs-video-loaded', function() {
  var s = document.getElementById('ldsub');
  if(s){ s.textContent = 'Point at AR Menu Marker ↓'; s.style.color = ''; }
});

// Camera-error event → show actionable error instead of hanging spinner
window.addEventListener('camera-error', function() {
  var ld = document.getElementById('ld');
  if(ld) ld.innerHTML =
    '<div style="text-align:center;padding:24px">' +
    '<div style="font-size:40px;margin-bottom:16px">🚫</div>' +
    '<div class="ldtitle" style="color:#e05555">Camera Blocked</div>' +
    '<div class="ldsub" style="margin-top:10px;line-height:1.8">Allow camera access<br>in your browser settings<br>then reload</div>' +
    '<button onclick="location.reload()" style="margin-top:24px;padding:12px 32px;' +
      'background:#c29a53;color:#000;font-weight:900;border:none;border-radius:12px;' +
      'font-size:13px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer">Reload</button>' +
    '</div>';
});
</script>

<!-- Minimal a-scene exactly matching official AR.js examples -->
<a-scene embedded arjs='sourceType: webcam; debugUIEnabled: false;' renderer='precision: medium; alpha: true; logarithmicDepthBuffer: true; antialias: true;' vr-mode-ui='enabled: false'>
  <a-assets timeout="8000">
    ${assetTags}
  </a-assets>

  <a-marker type="pattern" url="${origin}/markers/waikikiAR.patt" id="marker" waikiki-events
            smooth="true" smoothCount="10" smoothTolerance="0.01" smoothThreshold="5">
    <a-entity id="ar-card" rotation="-70 0 0" scale="0 0 0">

      <!-- Card slab — taller box for bigger card -->
      <a-box width="1.68" height="3.00" depth="0.15" color="#510909" position="0 0 0"></a-box>

      <!-- Video / image fills entire card face -->
      <${f.video_url ? 'a-video' : 'a-image'} id="ar-img" src="#ci${startIndex}"
               position="0 0 0.077" width="1.60" height="2.92">
      </${f.video_url ? 'a-video' : 'a-image'}>

      <!-- Top glass overlay: low-opacity tint + white edge line + category pill -->
      <a-plane width="1.60" height="0.45" color="#000000" opacity="0.22"
               position="0 1.275 0.082"></a-plane>
      <a-plane width="1.60" height="0.005" color="#ffffff" opacity="0.28"
               position="0 1.053 0.083"></a-plane>
      <a-plane width="1.12" height="0.26" color="#510909" opacity="0.70"
               position="0 1.275 0.086"></a-plane>
      <a-text id="ar-cat" value="${esc(f.category.toUpperCase())}"
              position="0 1.275 0.090" align="center" color="#fcefd4"
              width="2.0" font="exo2bold"></a-text>

      <!-- Bottom glass overlay: low-opacity tint + white edge line -->
      <a-plane width="1.60" height="1.15" color="#000000" opacity="0.35"
               position="0 -0.925 0.082"></a-plane>
      <a-plane width="1.60" height="0.005" color="#ffffff" opacity="0.22"
               position="0 -0.353 0.083"></a-plane>

      <!-- Cocktail name -->
      <a-text id="ar-name" value="${esc(f.name.toUpperCase())}"
              position="0 -0.52 0.088" align="center" color="#fcefd4"
              width="2.0" font="exo2bold"></a-text>

      <!-- Gold divider -->
      <a-plane width="1.35" height="0.004" color="#c29a53"
               position="0 -0.70 0.088"></a-plane>

      <!-- Ingredients -->
      <a-text id="ar-ings" value="${esc(fIngs)}"
              position="0 -0.86 0.088" align="center" color="#c8b89a"
              width="1.8"></a-text>

      <!-- Gold price pill -->
      <a-plane width="0.88" height="0.28" color="#c29a53" opacity="0.92"
               position="0 -1.10 0.088"></a-plane>
      <a-text id="ar-price" value="Rs. ${f.price}"
              position="0 -1.10 0.092" align="center" color="#1a0510"
              width="1.6" font="exo2bold"></a-text>

      <!-- Scan count (hidden when 0) -->
      <a-text id="ar-scans" value="${f.scan_count ? f.scan_count + ' scans today' : ''}"
              position="0 -1.38 0.092" align="center" color="#c29a53"
              width="1.5"></a-text>

      <!-- Daily special badge -->
      <a-entity id="ar-badge" visible="${f.is_daily_special ? 'true' : 'false'}">
        <a-plane width="1.60" height="0.16" color="#c29a53"
                 position="0 1.47 0.094"></a-plane>
        <a-text value="DAILY SPECIAL"
                position="0 1.47 0.097" align="center" color="#1a0510"
                width="2.2" font="exo2bold"></a-text>
      </a-entity>

      <!-- Floating bubbles fizz effect -->
      <a-entity geometry="primitive:sphere;radius:0.042;segmentsHeight:6;segmentsWidth:8" material="color:#b8dff0;opacity:0.55;transparent:true" position="-0.50 -1.20 0.12" animation__rise="property:position;from:-0.50 -1.20 0.12;to:-0.50 1.90 0.12;dur:3200;loop:true;easing:linear" animation__fade="property:material.opacity;from:0.55;to:0;dur:3200;loop:true;easing:easeInQuad"></a-entity>
      <a-entity geometry="primitive:sphere;radius:0.030;segmentsHeight:6;segmentsWidth:8" material="color:#c8e8f8;opacity:0.45;transparent:true" position="0.28 -0.90 0.12" animation__rise="property:position;from:0.28 -0.90 0.12;to:0.28 1.80 0.12;dur:2600;loop:true;delay:700;easing:linear" animation__fade="property:material.opacity;from:0.45;to:0;dur:2600;loop:true;delay:700;easing:easeInQuad"></a-entity>
      <a-entity geometry="primitive:sphere;radius:0.055;segmentsHeight:6;segmentsWidth:8" material="color:#a8d4ec;opacity:0.50;transparent:true" position="-0.20 -1.10 0.12" animation__rise="property:position;from:-0.20 -1.10 0.12;to:-0.20 2.00 0.12;dur:3600;loop:true;delay:1400;easing:linear" animation__fade="property:material.opacity;from:0.50;to:0;dur:3600;loop:true;delay:1400;easing:easeInQuad"></a-entity>
      <a-entity geometry="primitive:sphere;radius:0.035;segmentsHeight:6;segmentsWidth:8" material="color:#c0e4f4;opacity:0.40;transparent:true" position="0.52 -1.30 0.12" animation__rise="property:position;from:0.52 -1.30 0.12;to:0.52 1.85 0.12;dur:2900;loop:true;delay:300;easing:linear" animation__fade="property:material.opacity;from:0.40;to:0;dur:2900;loop:true;delay:300;easing:easeInQuad"></a-entity>
      <a-entity geometry="primitive:sphere;radius:0.028;segmentsHeight:6;segmentsWidth:8" material="color:#d0ecf8;opacity:0.42;transparent:true" position="-0.60 -0.70 0.12" animation__rise="property:position;from:-0.60 -0.70 0.12;to:-0.60 1.95 0.12;dur:2400;loop:true;delay:1800;easing:linear" animation__fade="property:material.opacity;from:0.42;to:0;dur:2400;loop:true;delay:1800;easing:easeInQuad"></a-entity>
      <a-entity geometry="primitive:sphere;radius:0.048;segmentsHeight:6;segmentsWidth:8" material="color:#b0dcf0;opacity:0.52;transparent:true" position="0.10 -1.00 0.12" animation__rise="property:position;from:0.10 -1.00 0.12;to:0.10 1.75 0.12;dur:3400;loop:true;delay:900;easing:linear" animation__fade="property:material.opacity;from:0.52;to:0;dur:3400;loop:true;delay:900;easing:easeInQuad"></a-entity>
      <a-entity geometry="primitive:sphere;radius:0.038;segmentsHeight:6;segmentsWidth:8" material="color:#bce0f2;opacity:0.47;transparent:true" position="-0.35 -1.25 0.12" animation__rise="property:position;from:-0.35 -1.25 0.12;to:-0.35 2.05 0.12;dur:2800;loop:true;delay:1200;easing:linear" animation__fade="property:material.opacity;from:0.47;to:0;dur:2800;loop:true;delay:1200;easing:easeInQuad"></a-entity>

    </a-entity>
  </a-marker>

  <a-entity camera></a-entity>
</a-scene>

<!-- HUD overlay -->
<div id="hud">
  <div id="topbar">
    <a class="tbtn" href="${esc(origin)}">&#8592;</a>
    <span id="brand">&#127865; Waikiki</span>
    <span id="camst">&#9679; SCANNING</span>
  </div>

  <div id="scanarea">
    <div id="scanbox">
      <div class="cor tl"></div><div class="cor tr"></div>
      <div class="cor bl"></div><div class="cor br"></div>
      <div class="scan-inner-border"></div>
      <div id="sline"></div>
    </div>
    <div id="scanlbl">Point at AR Menu Marker</div>
    <div id="scansub">Hold 20&ndash;40 cm above &bull; Keep steady</div>
    <div id="tips" style="display:none;margin-top:20px;background:rgba(0,0,0,.55);
      backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      border:1px solid rgba(194,154,83,.3);border-radius:14px;
      padding:14px 18px;max-width:260px">
      <div style="font-size:10px;font-weight:900;text-transform:uppercase;
        letter-spacing:.15em;color:#c29a53;margin-bottom:8px">Having Trouble?</div>
      <div style="font-size:11px;color:rgba(255,255,255,.75);line-height:1.8">
        &#8226; Hold phone 25&ndash;35 cm above marker<br/>
        &#8226; Tilt phone so marker fills screen<br/>
        &#8226; Needs bright, even lighting<br/>
        &#8226; Keep phone still 2&ndash;3 seconds<br/>
        &#8226; Marker must be flat &amp; unfolded
      </div>
    </div>
  </div>

  <div id="botbar">
    <button class="navbtn" id="btn-prev" onclick="nav(-1)">&#8592;</button>
    <div id="cinfo">
      <div id="ciname">${esc(f.name)}</div>
      <div id="cisub">${esc(f.category)} &middot; Rs.&thinsp;${f.price}</div>
      <div id="cicnt">${startIndex + 1} / ${tot}</div>
    </div>
    <button class="navbtn" id="btn-next" onclick="nav(1)">&#8594;</button>
  </div>
</div>

<!-- Invisible tap zone — activated by markerFound; tap/swipe handled in JS -->
<div id="tapzone"
  style="position:fixed;inset:0;z-index:90;pointer-events:none;cursor:pointer"></div>

<!-- Swipe / tap hint pill -->
<div id="taphint">&#8592; Swipe to browse &nbsp;&bull;&nbsp; Tap for info &#8594;</div>

<!-- Toast notification -->
<div id="toast"></div>

<!-- Share bottom sheet (Spotify-style card) -->
<div id="sharebg" onclick="if(event.target===this)closeShare()">
  <div id="sharesheet2">
    <div id="sh-handle"></div>
    <div id="sh-title">Share This Cocktail</div>
    <div id="sh-card-wrap">
      <canvas id="share-canvas" width="540" height="960"></canvas>
    </div>
    <div id="sh-btns">
      <button class="shopt shopt-wa" onclick="doShareWA()">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
        WhatsApp
      </button>
      <button class="shopt shopt-ig" onclick="doShareIG()">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
        Instagram Story
      </button>
      <button class="shopt shopt-copy" onclick="doShareCopy()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
        Copy Link
      </button>
      <button class="shopt shopt-close" onclick="closeShare()">Close &#10005;</button>
    </div>
  </div>
</div>

<!-- Description bottom sheet -->
<div id="descbg" onclick="if(event.target===this)closeDesc()">
  <div id="descsheet">
    <div id="desc-handle"></div>
    <div id="desc-cat"></div>
    <div id="desc-name"></div>
    <div id="desc-text"></div>
    <div id="desc-ings-label">Ingredients</div>
    <div id="desc-ings"></div>
    <div id="desc-special" style="display:none;font-size:10px;font-weight:900;
      text-transform:uppercase;letter-spacing:.18em;color:#fff;
      background:#c29a53;padding:6px 16px;border-radius:20px;
      margin-bottom:16px;text-align:center">&#9733; Daily Special</div>
    <div id="desc-footer">
      <div>
        <div id="desc-price"></div>
        <div id="desc-scans" style="font-size:11px;font-weight:700;color:#c29a53;margin-top:4px"></div>
      </div>
      <div class="desc-btns">
        <button id="share-btn" onclick="openShare()">&#8679; Share</button>
        <button id="desc-close" onclick="closeDesc()">Close &#10005;</button>
      </div>
    </div>
  </div>
</div>

<script>
var DATA = ${safeData};
var cur  = ${startIndex};
var tot  = ${tot};

// canplay fallback: play each video as soon as it has buffered enough data
document.querySelectorAll('a-assets video').forEach(function(v) {
  v.addEventListener('canplay', function() { v.play().catch(function(){}); });
});

// Dismiss loading when A-Frame scene finishes setup
document.querySelector('a-scene').addEventListener('loaded', function() {
  var ld = document.getElementById('ld');
  ld.classList.add('gone');
  setTimeout(function(){ ld.style.display = 'none'; }, 700);
  document.getElementById('hud').style.display = 'flex';
  if (this.renderer) this.renderer.setClearColor(0x000000, 0);
  playAllVideos();
});

// ── Description sheet ────────────────────────────────────────────
// Toast + Share
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  setTimeout(function(){ t.classList.remove('on'); }, 2400);
}
// \u2500\u2500 Share modal \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function openShare() {
  buildShareCard();
  document.getElementById('sharebg').classList.add('on');
}
function closeShare() {
  document.getElementById('sharebg').classList.remove('on');
}

function roundPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function buildShareCard() {
  var c = DATA[cur];
  var canvas = document.getElementById('share-canvas');
  var ctx = canvas.getContext('2d');
  var W = 540, H = 960;

  function draw(img) {
    ctx.clearRect(0,0,W,H);
    // Background
    var bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0, c.card_color || '#0c0918');
    bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);

    // Cocktail image \u2014 cover-fit in rounded rect
    var ix=30, iy=90, iw=W-60, ih=iw;
    if (img) {
      ctx.save();
      roundPath(ctx,ix,iy,iw,ih,24); ctx.clip();
      var ar = img.naturalWidth/img.naturalHeight;
      var dw,dh,dx,dy;
      if (ar>1){ dh=ih; dw=dh*ar; dx=ix-(dw-iw)/2; dy=iy; }
      else     { dw=iw; dh=dw/ar; dx=ix; dy=iy-(dh-ih)/2; }
      ctx.drawImage(img,dx,dy,dw,dh);
      ctx.restore();
    }

    // Text-area gradient overlay
    var ov = ctx.createLinearGradient(0,iy+ih*0.45,0,H);
    ov.addColorStop(0,'rgba(0,0,0,0)');
    ov.addColorStop(0.4,'rgba(0,0,0,.78)');
    ov.addColorStop(1,'rgba(0,0,0,.96)');
    ctx.fillStyle=ov; ctx.fillRect(0,iy,W,H-iy);

    var ty = iy+ih+54;
    ctx.textAlign='center';

    // Brand label
    ctx.fillStyle='#c29a53';
    ctx.font='700 13px "Helvetica Neue",Arial,sans-serif';
    ctx.fillText('WAIKIKI BAR & LOUNGE', W/2, ty);

    // Category
    ctx.fillStyle='rgba(194,154,83,.6)';
    ctx.font='600 11px "Helvetica Neue",Arial,sans-serif';
    ctx.fillText(c.category.toUpperCase(), W/2, ty+26);

    // Gold divider
    ctx.strokeStyle='rgba(194,154,83,.3)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(W/2-70,ty+42); ctx.lineTo(W/2+70,ty+42); ctx.stroke();

    // Name
    ctx.fillStyle='#ffffff';
    ctx.font='900 46px "Helvetica Neue",Arial,sans-serif';
    ctx.fillText(c.name.toUpperCase(), W/2, ty+98);

    // Ingredients
    var ings=(Array.isArray(c.ingredients)?c.ingredients:[c.ingredients]).slice(0,3).join('  \u00b7  ');
    ctx.fillStyle='rgba(255,255,255,.48)';
    ctx.font='500 13px "Helvetica Neue",Arial,sans-serif';
    ctx.fillText(ings, W/2, ty+132);

    // Price
    ctx.fillStyle='#c29a53';
    ctx.font='700 20px "Helvetica Neue",Arial,sans-serif';
    ctx.fillText('Rs. '+c.price, W/2, ty+172);

    // AR CTA
    ctx.fillStyle='rgba(255,255,255,.3)';
    ctx.font='600 11px "Helvetica Neue",Arial,sans-serif';
    ctx.fillText('\u2736  Scan QR to experience in AR  \u2736', W/2, ty+206);
  }

  var imgEl = new Image();
  imgEl.crossOrigin='anonymous';
  imgEl.onload  = function(){ draw(imgEl); };
  imgEl.onerror = function(){ draw(null); };
  imgEl.src = c.image_url;
}

function getCanvasBlob() {
  return new Promise(function(res) {
    document.getElementById('share-canvas').toBlob(function(b){ res(b); },'image/jpeg',0.92);
  });
}

function doShareWA() {
  var c = DATA[cur];
  var url = window.location.origin+'/ar/'+c.slug;
  var msg = '\ud83c\udf79 *'+c.name+'* from Waikiki Bar!\\n'
    +(c.description?c.description+'\\n':'')+
    '\\nScan the AR Menu to see it come alive in 3D \ud83d\udd2e\\n'+url;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

async function doShareIG() {
  var blob = await getCanvasBlob();
  var file = new File([blob],'waikiki-'+DATA[cur].slug+'.jpg',{type:'image/jpeg'});
  if (navigator.canShare && navigator.canShare({files:[file]})) {
    try { await navigator.share({files:[file],title:DATA[cur].name+' | Waikiki'}); return; }
    catch(e){ if(e.name==='AbortError') return; }
  }
  // Fallback: download the card so user can share from gallery
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'waikiki-'+DATA[cur].slug+'.jpg';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 3000);
  showToast('Image saved \u2014 share from your gallery!');
}

async function doShareCopy() {
  var url = window.location.origin+'/ar/'+DATA[cur].slug;
  try { await navigator.clipboard.writeText(url); showToast('Link copied!'); }
  catch(e){ showToast('Copy: '+url); }
}

// Scan logging (throttled: same slug skipped within 30s)
var _lastScanSlug = '', _lastScanTime = 0;
function logScan(slug) {
  var now = Date.now();
  if (slug === _lastScanSlug && now - _lastScanTime < 30000) return;
  _lastScanSlug = slug; _lastScanTime = now;
  fetch('/api/ar-scan', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: slug })
  }).catch(function(){});
  var c = DATA[cur];
  if (c && c.slug === slug) { c.scan_count = (c.scan_count || 0) + 1; render(); }
}

function showDesc() {
  var c = DATA[cur];
  document.getElementById('desc-cat').textContent  = c.category;
  document.getElementById('desc-name').textContent = c.name;
  document.getElementById('desc-text').textContent = c.description || '';
  document.getElementById('desc-price').textContent = 'Rs. ' + c.price;
  var ds = document.getElementById('desc-scans');
  if (ds) ds.textContent = c.scan_count > 0 ? '🔥 ' + c.scan_count + ' scans today' : '';
  var sp = document.getElementById('desc-special');
  if (sp) sp.style.display = c.is_daily_special ? 'block' : 'none';
  var el = document.getElementById('desc-ings');
  el.innerHTML = '';
  var ings = Array.isArray(c.ingredients) ? c.ingredients
    : String(c.ingredients).split(',');
  ings.forEach(function(ing) {
    var chip = document.createElement('span');
    chip.className = 'ing-chip';
    chip.textContent = ing.trim();
    el.appendChild(chip);
  });
  document.getElementById('descbg').classList.add('on');
}
function closeDesc() {
  document.getElementById('descbg').classList.remove('on');
}

// Navigate between cocktails with bounce animation
function nav(dir) {
  if (navBusy) return;
  closeDesc();
  var card = document.getElementById('ar-card');
  if (!card) { cur = ((cur + dir) % tot + tot) % tot; render(); return; }

  // Read actual live scale — more reliable than a tracked boolean
  var sc = card.object3D ? card.object3D.scale : null;
  var curScale = sc ? sc.x : 0;

  if (curScale < 0.05) {
    // Card not visible — swap content instantly, no animation needed
    cur = ((cur + dir) % tot + tot) % tot;
    render();
    return;
  }

  navBusy = true;
  var fromStr = curScale.toFixed(3) + ' ' + curScale.toFixed(3) + ' ' + curScale.toFixed(3);

  // Remove ALL existing scale animations so A-Frame treats the next setAttribute
  // as a new animation — without this, identical attribute values are ignored
  card.removeAttribute('animation__popin');
  card.removeAttribute('animation__navin');
  card.removeAttribute('animation__navout');

  card.setAttribute('animation__navout',
    'property:scale; from:' + fromStr + '; to:0 0 0; dur:200; easing:easeInBack');

  setTimeout(function() {
    cur = ((cur + dir) % tot + tot) % tot;
    render();
    card.removeAttribute('animation__navout');
    card.setAttribute('animation__navin',
      'property:scale; from:0 0 0; to:1 1 1; dur:420; easing:easeOutBack');
    setTimeout(function() { navBusy = false; }, 440);
  }, 210);
}

// ── Swipe gesture navigation ──────────────────────────────────────
(function() {
  var sx = 0, sy = 0;
  document.addEventListener('touchstart', function(e) {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', function(e) {
    if (document.getElementById('descbg').classList.contains('on')) return;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    var adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx > 35 && adx > ady * 1.2 && tot > 1) {
      // Horizontal swipe — left = next, right = prev
      nav(dx < 0 ? 1 : -1);
    } else if (adx < 12 && ady < 12 && markerVisible) {
      // Tap anywhere on the AR view — open details sheet
      showDesc();
    }
  }, { passive: true });
})();

function render() {
  var c    = DATA[cur];
  var ings = (Array.isArray(c.ingredients) ? c.ingredients : [c.ingredients])
             .slice(0, 4).join(' \xb7 ');

  // Update A-Frame card
  document.getElementById('ar-img').setAttribute('src', '#ci' + cur);
  // Ensure video plays when navigating to a cocktail that has one
  var asset = document.getElementById('ci' + cur);
  if (asset && asset.tagName === 'VIDEO') { asset.currentTime = 0; asset.play().catch(function(){}); }
  document.getElementById('ar-cat').setAttribute('value', c.category.toUpperCase());
  document.getElementById('ar-name').setAttribute('value', c.name.toUpperCase());
  document.getElementById('ar-ings').setAttribute('value', ings);
  document.getElementById('ar-price').setAttribute('value', 'Rs. ' + c.price);
  var scansEl = document.getElementById('ar-scans');
  if (scansEl) scansEl.setAttribute('value', c.scan_count > 0 ? c.scan_count + ' scans today' : '');

  // Toggle daily special badge
  var badge = document.getElementById('ar-badge');
  if (badge) badge.setAttribute('visible', c.is_daily_special ? 'true' : 'false');

  // Update HUD bottom bar
  document.getElementById('ciname').textContent = (c.is_daily_special ? '★ ' : '') + c.name;
  document.getElementById('cisub').textContent  = c.category + ' \xb7 Rs. ' + c.price;
  document.getElementById('cicnt').textContent  = (cur + 1) + ' / ' + tot;
}
</script>
</body>
</html>`;
}
