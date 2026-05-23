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
  price: 650, image_url: 'https://www.thecocktaildb.com/images/media/drink/adxcbq1641146824.jpg',
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
      ? c.ingredients : String(c.ingredients).split(',').map(s => s.trim()),
    price: c.price,
    image_url: c.image_url || '',
    card_color: c.card_color || '#0c0918',
  }));

  const f   = data[startIndex];
  const tot = data.length;
  const fIngs = f.ingredients.slice(0, 4).join(' \xb7 ');

  // Pre-load every cocktail image as an asset (crossorigin for WebGL)
  const assetTags = data.map((c, i) =>
    `<img id="ci${i}" src="${esc(c.image_url)}" crossorigin="anonymous"/>`
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
html,body{width:100%;height:100%;overflow:hidden;background:#000;
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
  display:flex;flex-direction:column;pointer-events:none}

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
</style>
</head>
<body>

<!-- Loading screen -->
<div id="ld">
  <div class="ldring"></div>
  <div class="ldtitle">&#127865; Waikiki</div>
  <div class="ldsub">Starting AR Camera&hellip;</div>
</div>

<!-- Register marker event component BEFORE a-scene is parsed (official AR.js pattern) -->
<script>
AFRAME.registerComponent('waikiki-events', {
  init: function() {
    var marker = this.el;
    var scanarea = document.getElementById('scanarea');
    var camst    = document.getElementById('camst');
    var tips     = document.getElementById('tips');
    var tipsTimer = setTimeout(function(){ if(tips) tips.style.display='block'; }, 9000);
    marker.addEventListener('markerFound', function() {
      clearTimeout(tipsTimer);
      if(tips) tips.style.display='none';
      if(scanarea) scanarea.classList.add('hide');
      if(camst){ camst.textContent='✓ LOCKED'; camst.classList.add('locked'); }
    });
    marker.addEventListener('markerLost', function() {
      if(scanarea) scanarea.classList.remove('hide');
      if(camst){ camst.textContent='● SCANNING'; camst.classList.remove('locked'); }
    });
  }
});
</script>

<!-- Minimal a-scene exactly matching official AR.js examples -->
<a-scene embedded arjs='sourceType: webcam; debugUIEnabled: false;' renderer='precision: medium; alpha: true;'>
  <a-assets timeout="8000">
    ${assetTags}
  </a-assets>

  <a-marker preset="hiro" id="marker" waikiki-events
            smooth="true" smoothCount="10" smoothTolerance="0.01" smoothThreshold="5">
    <a-entity rotation="-70 0 0">

      <!-- Gold border (well behind body — 0.1 gap prevents depth-buffer z-fight) -->
      <a-plane width="2.08" height="3.08" color="#c29a53" position="0 0 -0.1"></a-plane>
      <!-- Card body — fully opaque so camera/marker doesn't bleed through -->
      <a-plane width="2.0" height="3.0" color="#080614" position="0 0 0"></a-plane>

      <!-- Gold accent bars — 0.1 above body, no overlap ambiguity -->
      <a-plane width="2.0" height="0.06" color="#c29a53" position="0  1.47 0.1"></a-plane>
      <a-plane width="2.0" height="0.06" color="#c29a53" position="0 -1.47 0.1"></a-plane>

      <!-- Category badge -->
      <a-plane width="1.2" height="0.24" color="#1a0a2e" position="0 1.18 0.1"></a-plane>
      <a-text id="ar-cat" value="${esc(f.category.toUpperCase())}"
              position="0 1.18 0.15" align="center" color="#c29a53" width="2.8"
              font="sourcecodepro"></a-text>

      <!-- Cocktail image — bob + tilt animations -->
      <a-image id="ar-img" src="#ci${startIndex}"
               position="0 0.38 0.15" width="1.65" height="1.65"
               animation__bob="property: position; from: 0 0.38 0.15; to: 0 0.52 0.15;
                 dir: alternate; loop: true; dur: 2200; easing: easeInOutSine"
               animation__tilt="property: rotation; from: 0 -5 0; to: 0 5 0;
                 dir: alternate; loop: true; dur: 3400; easing: easeInOutSine">
      </a-image>

      <!-- Cocktail name -->
      <a-text id="ar-name" value="${esc(f.name.toUpperCase())}"
              position="0 -0.64 0.1" align="center" color="#ffffff"
              width="5.2" font="exo2bold"></a-text>

      <!-- Divider -->
      <a-plane width="1.75" height="0.012" color="#c29a53" position="0 -0.87 0.1"></a-plane>

      <!-- Ingredients -->
      <a-text id="ar-ings" value="${esc(fIngs)}"
              position="0 -1.06 0.1" align="center" color="#7aadcc" width="3.2"></a-text>

      <!-- Price strip -->
      <a-plane width="2.0" height="0.52" color="#1a0a2e" position="0 -1.33 0.1"></a-plane>
      <a-text id="ar-price" value="Rs. ${f.price}"
              position="0 -1.33 0.15" align="center" color="#c29a53"
              width="5.5" font="exo2bold"></a-text>

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
    <div id="scanlbl">Point at Hiro Coaster</div>
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

<script>
var DATA = ${safeData};
var cur  = ${startIndex};
var tot  = ${tot};

// Dismiss loading when A-Frame scene finishes setup
document.querySelector('a-scene').addEventListener('loaded', function() {
  var ld = document.getElementById('ld');
  ld.classList.add('gone');
  setTimeout(function(){ ld.style.display = 'none'; }, 700);
  // Clear WebGL canvas to transparent so the CSS camera video behind shows through
  if (this.renderer) this.renderer.setClearColor(0x000000, 0);
});

// Navigate between cocktails (prev / next)
function nav(dir) {
  cur = ((cur + dir) % tot + tot) % tot;
  render();
}

function render() {
  var c    = DATA[cur];
  var ings = (Array.isArray(c.ingredients) ? c.ingredients : [c.ingredients])
             .slice(0, 4).join(' \xb7 ');

  // Update A-Frame card
  document.getElementById('ar-img').setAttribute('src', '#ci' + cur);
  document.getElementById('ar-cat').setAttribute('value', c.category.toUpperCase());
  document.getElementById('ar-name').setAttribute('value', c.name.toUpperCase());
  document.getElementById('ar-ings').setAttribute('value', ings);
  document.getElementById('ar-price').setAttribute('value', 'Rs. ' + c.price);

  // Update HUD bottom bar
  document.getElementById('ciname').textContent = c.name;
  document.getElementById('cisub').textContent  = c.category + ' \xb7 Rs. ' + c.price;
  document.getElementById('cicnt').textContent  = (cur + 1) + ' / ' + tot;
}
</script>
</body>
</html>`;
}
