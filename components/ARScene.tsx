'use client';

import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { Cocktail } from '@/types/cocktail';

interface ARSceneProps {
  cocktail: Cocktail;
}

export default function ARScene({ cocktail }: ARSceneProps) {
  const [arLoaded, setArLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markerDetected, setMarkerDetected] = useState(false);

  // ── Effect 1: load scripts + register A-Frame component ──────────────────
  useEffect(() => {
    let isMounted = true;

    const handleFound = () => { if (isMounted) setMarkerDetected(true); };
    const handleLost  = () => { if (isMounted) setMarkerDetected(false); };
    window.addEventListener('waikiki-marker-found', handleFound);
    window.addEventListener('waikiki-marker-lost',  handleLost);

    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.async = false;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(s);
      });

    const initAR = async () => {
      try {
        await loadScript('https://aframe.io/releases/1.4.2/aframe.min.js');
        if (!isMounted) return;
        await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js');
        if (!isMounted) return;

        const AFRAME = (window as any).AFRAME;
        if (AFRAME && !AFRAME.components['marker-handler']) {
          AFRAME.registerComponent('marker-handler', {
            init: function () {
              this.el.addEventListener('markerFound', () =>
                window.dispatchEvent(new CustomEvent('waikiki-marker-found')));
              this.el.addEventListener('markerLost', () =>
                window.dispatchEvent(new CustomEvent('waikiki-marker-lost')));
            },
          });
        }

        if (isMounted) setArLoaded(true);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to initialize WebAR');
      }
    };

    initAR();

    return () => {
      isMounted = false;
      window.removeEventListener('waikiki-marker-found', handleFound);
      window.removeEventListener('waikiki-marker-lost',  handleLost);
    };
  }, []);

  // ── Effect 2: inject <a-scene> directly onto document.body ───────────────
  // A-Frame must NOT be nested inside a React-managed node — it mutates
  // <html>, <body>, and appends canvases in ways React fights with.
  useEffect(() => {
    if (!arLoaded) return;

    const ingredientsText = Array.isArray(cocktail.ingredients)
      ? cocktail.ingredients.join(', ')
      : String(cocktail.ingredients);
    const cardColor = cocktail.card_color || '#510909';
    const glowColor = cocktail.card_color || '#c29a53';

    const container = document.createElement('div');
    container.id = 'ar-scene-root';
    container.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1;';

    container.innerHTML = `
      <a-scene
        arjs="sourceType: webcam; debugUIEnabled: false; videoTexture: true;"
        renderer="logarithmicDepthBuffer: true; precision: medium; antialias: true;"
        vr-mode-ui="enabled: false"
        loading-screen="enabled: false"
      >
        <a-assets timeout="3000">
          <img id="cocktail-img" src="${cocktail.image_url}" crossorigin="anonymous">
        </a-assets>

        <a-marker preset="hiro" marker-handler emitevents="true"
                  smooth="true" smoothCount="10" smoothTolerance="0.01" smoothThreshold="5">
          <a-entity rotation="-70 0 0">

            <a-plane position="0 0 0"    width="2"    height="3"    color="${cardColor}"></a-plane>
            <a-plane position="0 0 -0.01" width="2.06" height="3.06" color="${glowColor}"></a-plane>

            <a-image src="#cocktail-img" position="0 0.4 0.45" width="1.8" height="1.8"
              animation__bob="property: position; from: 0 0.4 0.45; to: 0 0.52 0.45; dir: alternate; loop: true; dur: 2200; easing: easeInOutSine"
              animation__rotate="property: rotation; from: 0 -8 0; to: 0 8 0; dir: alternate; loop: true; dur: 3000; easing: easeInOutSine">
            </a-image>

            <a-text value="${cocktail.name.toUpperCase()}"
              position="0 -0.65 0.1" align="center" color="white" width="4.5" font="exo2bold">
            </a-text>

            <a-plane position="0 -1.15 0.08" width="1.8"  height="0.75" color="${glowColor}"></a-plane>
            <a-plane position="0 -1.15 0.09" width="1.74" height="0.69" color="#2a0404"></a-plane>

            <a-text value="${ingredientsText}"
              position="0 -1.02 0.12" align="center" color="#cbd5e1" width="2.6">
            </a-text>
            <a-text value="Rs.${cocktail.price}"
              position="0 -1.3 0.12" align="center" color="${glowColor}" width="3.2" font="exo2bold">
            </a-text>

            <a-circle position="-0.65 -1.3 0.14" radius="0.08" color="#c29a53"></a-circle>
            <a-text value="~" position="-0.65 -1.28 0.16" align="center" color="white" width="3.5" font="exo2bold">
            </a-text>

          </a-entity>
        </a-marker>

        <a-entity camera></a-entity>
      </a-scene>
    `;

    document.body.appendChild(container);

    return () => {
      // Remove the scene container we added
      const el = document.getElementById('ar-scene-root');
      if (el) el.remove();

      // Clean up everything A-Frame / AR.js added to the DOM
      document.querySelectorAll('video').forEach(v => v.remove());
      document.querySelectorAll('a-scene').forEach(s => s.remove());
      document.querySelectorAll('.a-canvas, .a-loader-title, .a-enter-vr, .a-enter-ar')
        .forEach(el => el.remove());

      document.documentElement.style.removeProperty('overflow');
      document.documentElement.classList.remove('a-html');
      document.body.style.removeProperty('overflow');
      document.body.classList.remove('a-body');
    };
  }, [arLoaded, cocktail]);

  // ── Render: only the React HUD — A-Frame scene lives on body directly ────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
        <p className="text-red-500 font-black mb-4 uppercase tracking-widest text-sm">WebAR Scanner Failed</p>
        <p className="text-xs text-[var(--brand-maroon)]/70 text-center max-w-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-3 bg-[var(--brand-maroon)] text-[#fcefd4] font-black uppercase text-xs tracking-wider rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-md"
        >
          Re-initialize Camera
        </button>
      </div>
    );
  }

  if (!arLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full border-4 border-dashed border-[var(--brand-maroon)] animate-spin flex items-center justify-center">
            <Camera size={28} className="text-[var(--brand-maroon)] animate-pulse" />
          </div>
          <div className="absolute top-[-4px] left-[-4px] w-[88px] h-[88px] rounded-full border-4 border-transparent border-t-[#c29a53] animate-ping" />
        </div>
        <h2 className="text-xl font-display font-black tracking-widest mb-1 text-[var(--brand-maroon)]">WAIKIKI BAR</h2>
        <p className="text-[var(--brand-maroon)] text-xs font-bold tracking-widest uppercase animate-pulse">Starting AR Engine...</p>
        <p className="text-[10px] text-[var(--brand-maroon)]/50 mt-6 text-center">Allow camera permission when prompted.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
      {/* Top bar HUD */}
      <div className="flex justify-between items-center bg-[#fcefd4]/75 backdrop-blur-[2px] border border-[var(--brand-maroon)]/15 p-4 rounded-2xl w-full">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-maroon)]">AR.CAM ACTIVE</span>
        </div>
        <span className="text-[10px] font-mono text-[var(--brand-maroon)]/70">
          TARGET: {cocktail.name.toUpperCase()}
        </span>
      </div>

      {/* Center target box */}
      <div className="self-center">
        <div className={`w-64 h-64 border-2 rounded-[32px] relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500 ${
          markerDetected
            ? 'border-[var(--brand-maroon)] bg-[var(--brand-maroon)]/5 shadow-[0_0_30px_rgba(81,9,9,0.15)]'
            : 'border-[var(--brand-maroon)]/20 bg-[#fcefd4]/25'
        }`}>
          {!markerDetected && <div className="absolute inset-x-0 scanner-line" />}
          <div className="absolute top-4 left-4  w-4 h-4 border-t-2 border-l-2 border-[var(--brand-maroon)]/45 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[var(--brand-maroon)]/45 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4  w-4 h-4 border-b-2 border-l-2 border-[var(--brand-maroon)]/45 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[var(--brand-maroon)]/45 rounded-br-lg" />
          <p className={`font-display font-black text-center text-xs px-6 uppercase tracking-wider ${
            markerDetected ? 'text-[var(--brand-maroon)]' : 'text-[var(--brand-maroon)]/60'
          }`}>
            {markerDetected ? 'Hiro Coaster Locked!' : 'Align Coaster in Target'}
          </p>
          <p className="text-[9px] font-semibold text-[var(--brand-maroon)]/65 uppercase tracking-widest mt-1.5 px-6 text-center">
            {markerDetected ? 'Card rendering loaded' : 'Keep camera steady'}
          </p>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
