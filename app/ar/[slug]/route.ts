import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cocktail {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  ingredients: string[] | string;
  price: number;
  image_url: string;
  card_color: string;
  is_active: boolean;
}

const MOCK_COCKTAIL: Cocktail = {
  id: 'mock',
  name: 'Blue Lagoon',
  slug: 'test',
  category: 'Signature',
  description: 'A vibrant blue tropical cocktail combining vodka, blue curaçao, and fresh lemonade. Perfectly refreshing and served ice cold.',
  ingredients: ['Vodka', 'Blue Curaçao', 'Lemonade', 'Lemon garnish'],
  price: 650,
  image_url: 'https://img.pngimg.com/uploads/cocktail/cocktail_PNG75.png',
  card_color: '#0a4a7a',
  is_active: true,
};

// ── Route Handler ──────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let cocktail: Cocktail | null = null;

  if (slug === 'test' || slug === 'mock') {
    cocktail = MOCK_COCKTAIL;
  } else {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('cocktails')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();
    cocktail = data;
  }

  if (!cocktail) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return new NextResponse(buildHTML(cocktail, request.url), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ── HTML escaping ──────────────────────────────────────────────────────────────
function esc(val: unknown): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── HTML builder ───────────────────────────────────────────────────────────────
function buildHTML(cocktail: Cocktail, requestUrl: string): string {
  const origin = new URL(requestUrl).origin;

  const ingredients: string[] = Array.isArray(cocktail.ingredients)
    ? cocktail.ingredients
    : String(cocktail.ingredients).split(',').map(s => s.trim()).filter(Boolean);

  const ingredientsText = ingredients.join(', ');
  const cardColor  = cocktail.card_color || '#510909';
  const glowColor  = cocktail.card_color || '#c29a53';
  const nameUpper  = cocktail.name.toUpperCase();
  const ingTags    = ingredients.map(i => `<span class="ing-tag">${esc(i)}</span>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <meta name="mobile-web-app-capable" content="yes"/>
  <meta name="apple-mobile-web-app-capable" content="yes"/>
  <title>${esc(cocktail.name)} – Waikiki Bar</title>
  <script src="https://aframe.io/releases/1.4.2/aframe.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js"></script>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    html,body{margin:0;padding:0;overflow:hidden;width:100%;height:100%;background:#000;font-family:'Helvetica Neue',Arial,sans-serif}

    /* ── Loading overlay (shown until scene ready) ── */
    #loading{
      position:fixed;inset:0;z-index:999;background:#fcefd4;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      transition:opacity .5s;
    }
    #loading.hidden{opacity:0;pointer-events:none}
    .spin{width:56px;height:56px;border:4px dashed #510909;border-radius:50%;animation:spin 1.2s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .load-title{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:.2em;color:#510909;margin-top:20px}
    .load-sub{font-size:10px;color:rgba(81,9,9,.5);text-transform:uppercase;letter-spacing:.15em;margin-top:8px}

    /* ── Back button ── */
    #back{
      position:fixed;top:20px;left:20px;z-index:300;
      width:42px;height:42px;border-radius:50%;
      background:rgba(8,14,36,.8);border:1px solid rgba(255,255,255,.08);
      color:#fff;display:flex;align-items:center;justify-content:center;
      backdrop-filter:blur(8px);text-decoration:none;font-size:20px;line-height:1;
    }

    /* ── HUD ── */
    #hud{
      position:fixed;inset:0;z-index:200;pointer-events:none;
      display:flex;flex-direction:column;justify-content:space-between;padding:20px;
    }
    #top-bar{
      display:flex;justify-content:space-between;align-items:center;
      background:rgba(252,239,212,.8);backdrop-filter:blur(6px);
      border:1px solid rgba(81,9,9,.15);padding:12px 16px;border-radius:16px;
    }
    .cam-left{display:flex;align-items:center;gap:8px}
    .cam-dot{width:10px;height:10px;border-radius:50%;background:#ef4444;animation:ping 1.2s infinite}
    @keyframes ping{0%,100%{transform:scale(1);opacity:1}60%{transform:scale(1.6);opacity:.5}}
    .cam-label{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#510909}
    .target-name{font-size:10px;font-family:monospace;color:rgba(81,9,9,.65)}

    #scan-box{
      align-self:center;width:260px;height:260px;
      border:2px solid rgba(81,9,9,.2);border-radius:32px;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      position:relative;overflow:hidden;
      background:rgba(252,239,212,.08);transition:.4s;
    }
    #scan-box.locked{border-color:#510909;background:rgba(81,9,9,.05);box-shadow:0 0 30px rgba(81,9,9,.18)}
    #scan-line{
      position:absolute;inset-x:0;height:3px;
      background:linear-gradient(90deg,transparent,#510909,transparent);
      animation:scan 3s linear infinite;box-shadow:0 0 10px rgba(81,9,9,.5);
    }
    @keyframes scan{0%{top:0;opacity:.1}10%{opacity:1}90%{opacity:1}100%{top:100%;opacity:.1}}
    .c{position:absolute;width:16px;height:16px;border-color:rgba(81,9,9,.4)}
    .tl{top:14px;left:14px;border-top:2px solid;border-left:2px solid;border-radius:4px 0 0 0}
    .tr{top:14px;right:14px;border-top:2px solid;border-right:2px solid;border-radius:0 4px 0 0}
    .bl{bottom:14px;left:14px;border-bottom:2px solid;border-left:2px solid;border-radius:0 0 0 4px}
    .br{bottom:14px;right:14px;border-bottom:2px solid;border-right:2px solid;border-radius:0 0 4px 0}
    #status-main{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:rgba(81,9,9,.6);text-align:center;padding:0 20px}
    #status-sub{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.15em;color:rgba(81,9,9,.45);text-align:center;margin-top:6px}

    /* ── Action pills ── */
    #pills{
      position:fixed;left:50%;transform:translateX(-50%);
      bottom:88px;z-index:250;transition:bottom .5s;
    }
    .pill-row{
      display:flex;align-items:center;gap:20px;
      padding:12px 24px;border-radius:999px;
      background:rgba(252,239,212,.88);backdrop-filter:blur(16px);
      border:1px solid rgba(81,9,9,.12);
      box-shadow:0 8px 30px rgba(81,9,9,.1);
    }
    .pbtn{
      width:48px;height:48px;border-radius:50%;cursor:pointer;border:none;
      display:flex;align-items:center;justify-content:center;
      background:rgba(255,255,255,.4);border:1px solid rgba(81,9,9,.1);
      color:rgba(81,9,9,.7);
    }
    .pbtn-main{
      width:64px;height:64px;border-radius:50%;cursor:pointer;border:none;
      display:flex;align-items:center;justify-content:center;color:#fff;
      background:linear-gradient(135deg,${cardColor},#510909);
      box-shadow:0 0 20px ${cardColor}44;
    }

    /* ── Bottom sheet ── */
    #sheet{
      position:fixed;inset-x:0;bottom:0;z-index:240;
      transform:translateY(calc(100% - 64px));transition:.5s cubic-bezier(.16,1,.3,1);
    }
    #sheet.open{transform:translateY(0)}
    #sheet-handle{
      width:100%;background:rgba(252,239,212,.92);backdrop-filter:blur(20px);
      border-top:1px solid rgba(81,9,9,.1);border-radius:32px 32px 0 0;
      padding:10px 0 6px;display:flex;flex-direction:column;align-items:center;
      cursor:pointer;gap:2px;
    }
    .hbar{width:44px;height:4px;border-radius:2px;background:rgba(81,9,9,.1)}
    .hlabel{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.2em;color:rgba(81,9,9,.75)}
    #sheet-body{
      background:rgba(252,239,212,.96);backdrop-filter:blur(20px);
      border-left:1px solid rgba(81,9,9,.08);border-right:1px solid rgba(81,9,9,.08);
      padding:20px 20px 48px;max-height:70vh;overflow-y:auto;
    }
    .badge{
      display:inline-block;padding:3px 10px;border-radius:6px;
      font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:#fcefd4;
      background:${esc(cardColor)};
    }
    .cname{font-size:22px;font-weight:900;text-transform:uppercase;color:#510909;letter-spacing:.05em;margin:8px 0 4px}
    .sec{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:rgba(81,9,9,.55);margin:14px 0 6px}
    .desc{font-size:13px;color:rgba(81,9,9,.85);line-height:1.65}
    .ings{display:flex;flex-wrap:wrap;gap:8px}
    .ing-tag{
      padding:6px 14px;border-radius:12px;font-size:11px;font-weight:900;
      text-transform:uppercase;letter-spacing:.04em;color:#510909;
      background:rgba(255,255,255,.45);border:1px solid rgba(81,9,9,.1);
    }
    .price-row{display:flex;justify-content:flex-end;padding-bottom:14px;border-bottom:1px solid rgba(81,9,9,.08);margin-bottom:4px}
    .price-lbl{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:rgba(81,9,9,.5);display:block;margin-bottom:2px}
    .price-val{font-size:18px;font-weight:900;color:${esc(cardColor)}}
  </style>
</head>
<body>

  <!-- Loading overlay -->
  <div id="loading">
    <div class="spin"></div>
    <p class="load-title">Waikiki Bar</p>
    <p class="load-sub">Starting AR Engine…</p>
  </div>

  <!-- Back button -->
  <a id="back" href="${esc(origin)}">&#8592;</a>

  <!-- ════════════════════════════════════════════════════════════════════════
       A-Frame scene — direct child of <body>, zero React wrappers
       ════════════════════════════════════════════════════════════════════════ -->
  <a-scene
    arjs="sourceType: webcam; debugUIEnabled: false; videoTexture: true;"
    renderer="logarithmicDepthBuffer: true; precision: medium; antialias: true;"
    vr-mode-ui="enabled: false"
    loading-screen="enabled: false"
  >
    <a-assets timeout="3000">
      <img id="cimg" src="${esc(cocktail.image_url)}" crossorigin="anonymous"/>
    </a-assets>

    <a-marker id="hiro" preset="hiro" emitevents="true"
              smooth="true" smoothCount="10" smoothTolerance="0.01" smoothThreshold="5">
      <a-entity rotation="-70 0 0">

        <a-plane position="0 0 0"     width="2"    height="3"    color="${esc(cardColor)}"></a-plane>
        <a-plane position="0 0 -0.01" width="2.06" height="3.06" color="${esc(glowColor)}"></a-plane>

        <a-image src="#cimg" position="0 0.4 0.45" width="1.8" height="1.8"
          animation__bob="property: position; from: 0 0.4 0.45; to: 0 0.52 0.45; dir: alternate; loop: true; dur: 2200; easing: easeInOutSine"
          animation__spin="property: rotation; from: 0 -8 0; to: 0 8 0; dir: alternate; loop: true; dur: 3000; easing: easeInOutSine">
        </a-image>

        <a-text value="${esc(nameUpper)}"      position="0 -0.65 0.1"  align="center" color="white"              width="4.5" font="exo2bold"></a-text>
        <a-plane position="0 -1.15 0.08" width="1.8"  height="0.75" color="${esc(glowColor)}"></a-plane>
        <a-plane position="0 -1.15 0.09" width="1.74" height="0.69" color="#2a0404"></a-plane>
        <a-text value="${esc(ingredientsText)}" position="0 -1.02 0.12" align="center" color="#cbd5e1"            width="2.6"></a-text>
        <a-text value="Rs.${esc(String(cocktail.price))}" position="0 -1.3 0.12" align="center" color="${esc(glowColor)}" width="3.2" font="exo2bold"></a-text>

        <a-circle position="-0.65 -1.3 0.14" radius="0.08" color="#c29a53"></a-circle>
        <a-text value="~" position="-0.65 -1.28 0.16" align="center" color="white" width="3.5" font="exo2bold"></a-text>

      </a-entity>
    </a-marker>

    <a-entity camera></a-entity>
  </a-scene>

  <!-- HUD overlay -->
  <div id="hud">
    <div id="top-bar">
      <div class="cam-left">
        <div class="cam-dot"></div>
        <span class="cam-label">AR.CAM ACTIVE</span>
      </div>
      <span class="target-name">TARGET: ${esc(nameUpper)}</span>
    </div>

    <div id="scan-box">
      <div id="scan-line"></div>
      <div class="c tl"></div><div class="c tr"></div>
      <div class="c bl"></div><div class="c br"></div>
      <p id="status-main">Align Coaster in Target</p>
      <p id="status-sub">Keep camera steady</p>
    </div>

    <div style="height:80px"></div>
  </div>

  <!-- Action pills -->
  <div id="pills">
    <div class="pill-row">
      <button class="pbtn" id="share-btn" title="Share">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
      </button>
      <button class="pbtn-main" id="snap-btn" title="Capture">
        <svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
      <button class="pbtn" id="details-btn" title="Recipe Details">
        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Bottom sheet -->
  <div id="sheet">
    <div id="sheet-handle">
      <div class="hbar"></div>
      <span class="hlabel" id="handle-lbl">View Recipe Details &#9650;</span>
    </div>
    <div id="sheet-body">
      <span class="badge">${esc(cocktail.category)}</span>
      <p class="cname">${esc(cocktail.name)}</p>
      <div class="price-row">
        <div>
          <span class="price-lbl">Price</span>
          <span class="price-val">Rs. ${esc(String(cocktail.price))}</span>
        </div>
      </div>
      <p class="sec">✦ Bartender Notes</p>
      <p class="desc">${esc(cocktail.description)}</p>
      <p class="sec" style="margin-top:16px">Ingredients (${ingredients.length})</p>
      <div class="ings">${ingTags}</div>
    </div>
  </div>

  <script>
    // ── Hide loading overlay once scene is ready ───────────────────────────
    var loadEl = document.getElementById('loading');
    document.querySelector('a-scene').addEventListener('loaded', function () {
      loadEl.classList.add('hidden');
      setTimeout(function(){ loadEl.style.display='none'; }, 600);

      // Marker events
      var marker = document.getElementById('hiro');
      var scanBox   = document.getElementById('scan-box');
      var scanLine  = document.getElementById('scan-line');
      var statusMain = document.getElementById('status-main');
      var statusSub  = document.getElementById('status-sub');

      marker.addEventListener('markerFound', function () {
        scanBox.classList.add('locked');
        scanLine.style.display = 'none';
        statusMain.textContent = 'Hiro Coaster Locked!';
        statusSub.textContent  = 'Card is rendering';
      });
      marker.addEventListener('markerLost', function () {
        scanBox.classList.remove('locked');
        scanLine.style.display = '';
        statusMain.textContent = 'Align Coaster in Target';
        statusSub.textContent  = 'Keep camera steady';
      });
    });

    // ── Bottom sheet toggle ────────────────────────────────────────────────
    var sheet  = document.getElementById('sheet');
    var pills  = document.getElementById('pills');
    var lbl    = document.getElementById('handle-lbl');
    var isOpen = false;

    function toggleSheet(open) {
      isOpen = open !== undefined ? open : !isOpen;
      sheet.classList.toggle('open', isOpen);
      pills.style.bottom = isOpen ? '300px' : '88px';
      lbl.textContent = isOpen ? 'Close Details \\u25BC' : 'View Recipe Details \\u25B2';
    }

    document.getElementById('sheet-handle').addEventListener('click', function(){ toggleSheet(); });
    document.getElementById('details-btn').addEventListener('click', function(){ toggleSheet(); });

    // ── Capture screenshot ─────────────────────────────────────────────────
    document.getElementById('snap-btn').addEventListener('click', function () {
      var canvas = document.querySelector('canvas');
      if (!canvas) { alert('Canvas not ready yet.'); return; }
      var link = document.createElement('a');
      link.download = 'waikiki-${esc(cocktail.slug)}.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });

    // ── Share ──────────────────────────────────────────────────────────────
    document.getElementById('share-btn').addEventListener('click', function () {
      var url = window.location.href;
      if (navigator.share) {
        navigator.share({ title: 'Waikiki Bar – ${esc(cocktail.name)}', url: url });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function(){ alert('Link copied!'); });
      } else {
        alert('Share this link: ' + url);
      }
    });
  </script>
</body>
</html>`;
}
