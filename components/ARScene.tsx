'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Camera, Compass } from 'lucide-react';
import { Cocktail } from '@/types/cocktail';

interface ARSceneProps {
  cocktail: Cocktail;
}

export default function ARScene({ cocktail }: ARSceneProps) {
  const [arLoaded, setArLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markerDetected, setMarkerDetected] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Listen to custom marker detection events dispatched by the A-Frame runtime
    const handleFound = () => {
      if (isMounted) setMarkerDetected(true);
    };
    const handleLost = () => {
      if (isMounted) setMarkerDetected(false);
    };

    window.addEventListener('waikiki-marker-found', handleFound);
    window.addEventListener('waikiki-marker-lost', handleLost);

    // Dynamically inject scripts
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // sequential load order matters for A-Frame → AR.js
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(script);
      });
    };

    // Remove any stale old A-Frame / AR.js scripts that may be cached in DOM
    const staleScripts = document.querySelectorAll(
      'script[src*="aframe.io/releases/1.2"], script[src*="AR.js@3.3"]'
    );
    staleScripts.forEach((s) => s.remove());

    const initAR = async () => {
      try {
        // 1. Load A-Frame (1.4.2 - stable, works with AR.js 3.4.5)
        await loadScript('https://aframe.io/releases/1.4.2/aframe.min.js');
        if (!isMounted) return;

        // 2. Load AR.js 3.4.5 (stable, fixes camera recalibration errors)
        await loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js');
        if (!isMounted) return;

        // Register custom A-Frame component for marker event handling
        const AFRAME = (window as any).AFRAME;
        if (AFRAME && !AFRAME.components['marker-handler']) {
          AFRAME.registerComponent('marker-handler', {
            init: function() {
              const marker = this.el;
              const container = marker.querySelector('#card-container');

              marker.addEventListener('markerFound', () => {
                if (container) {
                  container.emit('markerfound');
                }
                // Dispatch a window event to trigger React HUD changes
                window.dispatchEvent(new CustomEvent('waikiki-marker-found'));
              });

              marker.addEventListener('markerLost', () => {
                if (container) {
                  // Reset container position and scale
                  container.setAttribute('position', '0 -2 -2');
                  container.setAttribute('scale', '0.01 0.01 0.01');
                }
                // Dispatch a window event to trigger React HUD changes
                window.dispatchEvent(new CustomEvent('waikiki-marker-lost'));
              });
            }
          });
        }

        setArLoaded(true);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to initialize WebAR');
      }
    };

    initAR();

    // Clean up DOM on unmount
    return () => {
      isMounted = false;
      window.removeEventListener('waikiki-marker-found', handleFound);
      window.removeEventListener('waikiki-marker-lost', handleLost);

      // Remove video element added by AR.js
      const videos = document.querySelectorAll('video');
      videos.forEach((v) => v.remove());

      // Remove A-Frame scene element
      const scenes = document.querySelectorAll('a-scene');
      scenes.forEach((s) => s.remove());

      // Restore HTML and Body styles mutated by A-Frame
      document.documentElement.style.removeProperty('overflow');
      document.documentElement.classList.remove('a-html');
      document.body.style.removeProperty('overflow');
      document.body.classList.remove('a-body');

      // Remove canvas and loading overlays
      const uiElements = document.querySelectorAll('.a-canvas, .a-loader-title, .a-enter-vr, .a-enter-ar');
      uiElements.forEach((el) => el.remove());
    };
  }, []);

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
        <p className="text-[10px] text-[var(--brand-maroon)]/50 mt-6 text-center">Allow camera permission if requested by the browser.</p>
      </div>
    );
  }

  const ingredientsText = cocktail.ingredients.join(', ');
  const cardColor = cocktail.card_color || '#510909';
  const glowColor = cocktail.card_color || '#c29a53';

  const aframeSceneHTML = `
    <a-scene
      embedded
      arjs="sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
      renderer="logarithmicDepthBuffer: true; precision: medium;"
      vr-mode-ui="enabled: false"
      loading-screen="dotsColor: #510909; backgroundColor: #fcefd4"
    >
      <a-marker preset="hiro" marker-handler emitevents="true" smooth="true" smoothCount="10" smoothTolerance="0.01" smoothThreshold="5">
        <a-entity id="card-container" 
                  position="0 -2 -2" 
                  scale="0.01 0.01 0.01" 
                  rotation="-70 0 0"
                  animation__scale="property: scale; from: 0.01 0.01 0.01; to: 1 1 1; dur: 800; easing: easeOutBack; startEvents: markerfound"
                  animation__pos="property: position; from: 0 -2 -2; to: 0 0 0; dur: 800; easing: easeOutBack; startEvents: markerfound">
          
          <!-- Card background plane -->
          <a-plane position="0 0 0" width="2" height="3" color="${cardColor}"></a-plane>
          
          <!-- Neon border glow plane slightly behind -->
          <a-plane position="0 0 -0.01" width="2.06" height="3.06" color="${glowColor}"></a-plane>
          
          <!-- Cocktail PNG standing upright popped out in front of the card, slow bobbing and rotating -->
          <a-image src="${cocktail.image_url}" position="0 0.4 0.45" width="1.8" height="1.8" rotation="0 0 0"
            animation__bob="property: position; from: 0 0.4 0.45; to: 0 0.52 0.45; dir: alternate; loop: true; dur: 2200; easing: easeInOutSine"
            animation__rotate="property: rotation; from: 0 -8 0; to: 0 8 0; dir: alternate; loop: true; dur: 3000; easing: easeInOutSine"></a-image>
          
          <!-- Cocktail name text -->
          <a-text value="${cocktail.name.toUpperCase()}" position="0 -0.65 0.1" align="center" color="white" width="4.5" font="exo2bold" rotation="0 0 0"></a-text>
          
          <!-- Translucent slate description bubble border -->
          <a-plane position="0 -1.15 0.08" width="1.8" height="0.75" color="${glowColor}" rotation="0 0 0"></a-plane>
          
          <!-- Translucent slate description bubble base -->
          <a-plane position="0 -1.15 0.09" width="1.74" height="0.69" color="#2a0404" rotation="0 0 0"></a-plane>
          
          <!-- Ingredients text -->
          <a-text value="${ingredientsText}" position="0 -1.02 0.12" align="center" color="#cbd5e1" width="2.6" rotation="0 0 0"></a-text>
          
          <!-- Price text -->
          <a-text value="Rs.${cocktail.price}" position="0 -1.3 0.12" align="center" color="${glowColor}" width="3.2" font="exo2bold" rotation="0 0 0"></a-text>
 
          <!-- Waikiki wave logo badge (bottom left of bubble/card) -->
          <a-circle position="-0.65 -1.3 0.14" radius="0.08" color="#c29a53" rotation="0 0 0"></a-circle>
          <a-text value="~" position="-0.65 -1.28 0.16" align="center" color="white" width="3.5" font="exo2bold" rotation="0 0 0"></a-text>
          
        </a-entity>
      </a-marker>
      <a-entity camera></a-entity>
    </a-scene>
  `;


  return (
    <>
      {/* Sci-Fi Camera HUD Scan Overlay */}
      <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between p-6">
        {/* Top bar HUD */}
        <div className="flex justify-between items-center bg-[#fcefd4]/75 backdrop-blur-[2px] border border-[var(--brand-maroon)]/15 p-4 rounded-2xl w-full">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-maroon)]">AR.CAM ACTIVE</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-[var(--brand-maroon)]/70">
              TARGET: {cocktail.name.toUpperCase()}
            </span>
          </div>
        </div>
 
        {/* Center Target Box */}
        <div className="self-center flex flex-col items-center justify-center">
          <div 
            className={`w-64 h-64 border-2 rounded-[32px] relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500 ${
              markerDetected 
                ? 'border-[var(--brand-maroon)] bg-[var(--brand-maroon)]/5 shadow-[0_0_30px_rgba(81,9,9,0.15)]' 
                : 'border-[var(--brand-maroon)]/20 bg-[#fcefd4]/25'
            }`}
          >
            {/* Animated target scanning lines */}
            {!markerDetected && <div className="absolute inset-x-0 scanner-line" />}
            
            {/* Corner Indicators */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-[var(--brand-maroon)]/45 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-[var(--brand-maroon)]/45 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-[var(--brand-maroon)]/45 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-[var(--brand-maroon)]/45 rounded-br-lg" />
 
            {/* Status indicators */}
            <p className={`font-display font-black text-center text-xs px-6 uppercase tracking-wider transition-colors duration-300 ${
              markerDetected ? 'text-[var(--brand-maroon)]' : 'text-[var(--brand-maroon)]/60'
            }`}>
              {markerDetected ? 'Hiro Coaster Locked!' : 'Align Coaster in Target'}
            </p>
            <p className="text-[9px] font-semibold text-[var(--brand-maroon)]/65 uppercase tracking-widest mt-1.5 px-6 text-center">
              {markerDetected ? 'Card rendering loaded' : 'Keep camera steady'}
            </p>
          </div>
        </div>

        {/* Bottom space helper (offsets BottomBar content) */}
        <div className="h-20" />
      </div>

      {/* Renders the WebGL / AR.js markup directly to the page */}
      <div 
        className="w-full h-full absolute inset-0 z-10" 
        dangerouslySetInnerHTML={{ __html: aframeSceneHTML }} 
      />
    </>
  );
}
