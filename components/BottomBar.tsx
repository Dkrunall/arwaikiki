'use client';

import React, { useState, useRef } from 'react';
import { Camera, Circle, Share2, Square, Loader2, ChevronUp, ChevronDown, BookOpen, Sparkles } from 'lucide-react';
import { Cocktail } from '@/types/cocktail';

interface BottomBarProps {
  cocktail: Cocktail;
}

export default function BottomBar({ cocktail }: BottomBarProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cocktailName = cocktail.name;
  const cardColor = cocktail.card_color || '#c29a53';

  // Function to capture screenshot (composites webcam video and A-Frame WebGL canvas)
  const handleCapture = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      const video = document.querySelector('video');
      const canvas = document.querySelector('a-scene')?.getAttribute('canvas') 
        ? (document.querySelector('a-scene') as any).canvas 
        : document.querySelector('canvas');

      if (!canvas) {
        throw new Error('WebGL Canvas not found');
      }

      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');

      if (!ctx) throw new Error('Could not get 2D context');

      const width = window.innerWidth;
      const height = window.innerHeight;
      tempCanvas.width = width;
      tempCanvas.height = height;

      if (video) {
        const videoRatio = video.videoWidth / video.videoHeight;
        const screenRatio = width / height;
        let drawWidth = width;
        let drawHeight = height;
        let offsetX = 0;
        let offsetY = 0;

        if (screenRatio > videoRatio) {
          drawHeight = width / videoRatio;
          offsetY = (height - drawHeight) / 2;
        } else {
          drawWidth = height * videoRatio;
          offsetX = (width - drawWidth) / 2;
        }

        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
      } else {
        ctx.fillStyle = '#fcefd4';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(canvas, 0, 0, width, height);
      const dataUrl = tempCanvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.download = `${cocktailName.toLowerCase().replace(/\s+/g, '-')}-ar.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Capture failed, trying html2canvas fallback:', error);
      try {
        const html2canvas = (await import('html2canvas')).default;
        const appContainer = document.body;
        const capturedCanvas = await html2canvas(appContainer, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        });
        const dataUrl = capturedCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${cocktailName.toLowerCase().replace(/\s+/g, '-')}-ar-fallback.png`;
        link.href = dataUrl;
        link.click();
      } catch (fallbackError) {
        alert('Failed to capture screenshot. Please try again.');
        console.error(fallbackError);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  // Function to handle screen/viewport recording using getDisplayMedia or Canvas Stream
  const startRecording = async (e: React.MouseEvent) => {
    e.stopPropagation();
    chunksRef.current = [];
    try {
      let stream: MediaStream;

      if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: 'browser',
            } as any,
            audio: false
          });
        } catch (e) {
          console.warn('getDisplayMedia rejected or failed, falling back to canvas captureStream', e);
          const canvas = document.querySelector('canvas');
          if (!canvas) throw new Error('Canvas not found');
          stream = (canvas as any).captureStream(30);
        }
      } else {
        const canvas = document.querySelector('canvas');
        if (!canvas) throw new Error('Canvas not found');
        stream = (canvas as any).captureStream(30);
      }

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${cocktailName.toLowerCase().replace(/\s+/g, '-')}-ar-experience.webm`;
        link.click();
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
      };

      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not start video recording. Make sure screen sharing/camera permission is granted.');
    }
  };

  const stopRecording = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // Function to handle Web Share API
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.href;
    const title = `Waikiki Bar - ${cocktailName}`;
    const text = `Check out this amazing interactive WebAR ${cocktailName} cocktail at Waikiki Bar! 🍹✨`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (error) {
        console.log('Share canceled or failed', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('AR Menu Link copied to clipboard!');
      } catch (error) {
        alert(`Share this link: ${url}`);
      }
    }
  };

  return (
    <>
      {/* Floating details drawer sheet at the bottom */}
      <div 
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center select-none pointer-events-auto transition-transform duration-500 ease-out"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(calc(100% - 64px))'
        }}
      >
        {/* Pull tab handle */}
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex flex-col items-center py-2.5 bg-[#fcefd4]/90 backdrop-blur-2xl border-t border-[var(--brand-maroon)]/15 rounded-t-[32px] cursor-pointer shadow-[0_-15px_30px_rgba(81,9,9,0.1)] group"
        >
          <div className="w-12 h-1 bg-[var(--brand-maroon)]/10 rounded-full mb-1 group-hover:bg-[var(--brand-maroon)]/25 transition-colors" />
          <div className="flex items-center gap-1.5 text-[var(--brand-maroon)]">
            <BookOpen size={13} className="text-[#c29a53]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] font-display text-[var(--brand-maroon)]/80 group-hover:text-[var(--brand-maroon)] transition-colors">
              {isOpen ? 'Close Recipe Details' : 'View Recipe Details'}
            </span>
            {isOpen ? <ChevronDown size={14} className="text-[var(--brand-maroon)]/50" /> : <ChevronUp size={14} className="text-[var(--brand-maroon)]/50" />}
          </div>
        </div>
 
        {/* Drawer contents */}
        <div className="w-full bg-[#fcefd4]/95 backdrop-blur-2xl border-x border-[var(--brand-maroon)]/10 p-6 pb-8 flex flex-col gap-6 max-h-[70vh] overflow-y-auto">
          {/* Header Info inside drawer */}
          <div className="flex justify-between items-start border-b border-[var(--brand-maroon)]/10 pb-4">
            <div>
              <span 
                className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md text-[#fcefd4]"
                style={{ backgroundColor: cardColor }}
              >
                {cocktail.category}
              </span>
              <h3 className="text-2xl font-display font-black text-[var(--brand-maroon)] uppercase mt-2">
                {cocktail.name}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-[var(--brand-maroon)]/50 font-bold block uppercase tracking-widest">Price</span>
              <span className="text-lg font-black" style={{ color: cardColor }}>Rs. {cocktail.price}</span>
            </div>
          </div>
 
          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-maroon)]/60 flex items-center gap-1">
              <Sparkles size={11} className="text-[#c29a53]" />
              <span>Bartender Notes</span>
            </span>
            <p className="text-xs md:text-sm text-[var(--brand-maroon)]/85 leading-relaxed font-medium">
              {cocktail.description}
            </p>
          </div>
 
          {/* Ingredients list */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-maroon)]/60">
              Ingredients ({cocktail.ingredients.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {cocktail.ingredients.map((ing, idx) => (
                <span 
                  key={idx}
                  className="px-3.5 py-1.5 text-xs font-black uppercase tracking-wider bg-white/40 border border-[var(--brand-maroon)]/10 rounded-xl text-[var(--brand-maroon)]"
                >
                  {ing.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
 
      {/* Floating HUD Camera Pills (Record, Capture, Share) - sits above the drawer sheet */}
      <div 
        className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-500"
        style={{
          bottom: isOpen ? '290px' : '88px', // Adjust height cleanly depending on open state
          opacity: 1
        }}
      >
        <div className="flex items-center gap-6 px-6 py-3.5 rounded-full bg-[#fcefd4]/85 border border-[var(--brand-maroon)]/15 backdrop-blur-xl shadow-[0_10px_35px_rgba(81,9,9,0.12)]">
          {/* Record Button */}
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all transform active:scale-95 shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
              title="Stop Recording"
            >
              <Square size={18} className="fill-white" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="group flex items-center justify-center w-12 h-12 rounded-full bg-white/40 border border-[var(--brand-maroon)]/10 hover:border-red-500/40 text-red-500 transition-all transform active:scale-95 cursor-pointer"
              title="Record Screen"
            >
              <Circle size={18} className="fill-red-500 group-hover:scale-110 transition-transform" />
            </button>
          )}
 
          {/* Capture Button */}
          <button
            onClick={handleCapture}
            disabled={isCapturing}
            className="flex items-center justify-center w-16 h-16 rounded-full text-white hover:scale-105 active:scale-95 transition-all shadow-[0_6px_20px_rgba(81,9,9,0.2)] cursor-pointer"
            style={{
              background: `linear-gradient(135deg, ${cardColor}, #510909)`,
              boxShadow: `0 0 20px ${cardColor}33`
            }}
            title="Capture Snapshot"
          >
            {isCapturing ? (
              <Loader2 size={26} className="animate-spin" />
            ) : (
              <Camera size={26} className="stroke-[2.5]" />
            )}
          </button>
 
          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-white/40 border border-[var(--brand-maroon)]/10 hover:border-[var(--brand-maroon)]/25 text-[var(--brand-maroon)]/70 hover:text-[var(--brand-maroon)] active:scale-95 transition-all cursor-pointer"
            title="Share Experience"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
