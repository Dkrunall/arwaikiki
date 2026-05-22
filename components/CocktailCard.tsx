'use client';

import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, ExternalLink, QrCode } from 'lucide-react';
import { Cocktail } from '@/types/cocktail';
import Link from 'next/link';

interface CocktailCardProps {
  cocktail: Cocktail;
}

export default function CocktailCard({ cocktail }: CocktailCardProps) {
  const [arUrl, setArUrl] = useState('');
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setArUrl(`${window.location.origin}/ar/${cocktail.slug}`);
    }
  }, [cocktail.slug]);

  // Download QR code as SVG
  const downloadQR = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!qrRef.current) return;
    const svgEl = qrRef.current;
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const trigger = document.createElement('a');
    trigger.href = svgUrl;
    trigger.download = `qr-${cocktail.slug}.svg`;
    document.body.appendChild(trigger);
    trigger.click();
    document.body.removeChild(trigger);
  };

  // Print a bartender layout with the QR code and instructions for the table
  const handlePrintCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Get QR SVG markup
    const qrSvg = qrRef.current ? qrRef.current.outerHTML : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Card - ${cocktail.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Outfit:wght@400;800&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              margin: 0;
              padding: 40px;
              text-align: center;
              background-color: #fcefd4;
              color: #510909;
            }
            .card-container {
              border: 2px solid ${cocktail.card_color || '#510909'};
              border-radius: 24px;
              padding: 40px;
              max-width: 450px;
              margin: 0 auto;
              background-color: #ffffff;
              box-shadow: 0 10px 30px rgba(81,9,9,0.06);
            }
            .venue-name {
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 5px;
              color: #c29a53;
              margin-bottom: 5px;
              text-transform: uppercase;
              font-family: 'Space Grotesk', sans-serif;
            }
            .logo-wave {
              font-size: 28px;
              margin-bottom: 20px;
            }
            .cocktail-title {
              font-size: 36px;
              font-weight: 800;
              margin: 0 0 10px 0;
              text-transform: uppercase;
              color: #510909;
              letter-spacing: -0.5px;
            }
            .cocktail-category {
              font-size: 12px;
              color: #510909;
              background: #fcefd4;
              padding: 4px 12px;
              border-radius: 99px;
              font-weight: 800;
              text-transform: uppercase;
              display: inline-block;
              margin-bottom: 25px;
            }
            .qr-wrapper {
              margin: 30px auto;
              display: flex;
              justify-content: center;
              align-items: center;
              background: #fcefd4;
              padding: 24px;
              border-radius: 16px;
              width: 180px;
              height: 180px;
              border: 1px solid rgba(81,9,9,0.12);
            }
            .instructions {
              font-size: 14px;
              line-height: 1.6;
              color: rgba(81,9,9,0.8);
              margin-bottom: 30px;
              max-width: 320px;
              margin-left: auto;
              margin-right: auto;
            }
            .price-tag {
              font-size: 26px;
              font-weight: 800;
              color: #510909;
            }
            .footer-tip {
              font-size: 11px;
              color: rgba(81,9,9,0.5);
              margin-top: 40px;
              border-top: 1px solid rgba(81,9,9,0.1);
              padding-top: 15px;
            }
            .print-btn {
              background-color: #510909;
              color: #fcefd4;
              border: none;
              padding: 12px 28px;
              font-size: 14px;
              font-weight: bold;
              border-radius: 12px;
              cursor: pointer;
              margin-bottom: 35px;
              box-shadow: 0 4px 12px rgba(81,9,9,0.15);
              transition: all 0.2s;
            }
            @media print {
              .print-btn {
                display: none;
              }
              body {
                padding: 0;
              }
              .card-container {
                box-shadow: none;
                border: 2px solid #000;
              }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Print Menu QR Card</button>
          <div class="card-container">
            <div class="venue-name">Waikiki Bar</div>
            <div class="logo-wave">🌊</div>
            <div class="cocktail-title">${cocktail.name}</div>
            <span class="cocktail-category">${cocktail.category}</span>
            <div class="instructions">
              <strong>Scan to view in WebAR!</strong><br/>
              Point your phone camera at this QR code to load the 3D visual menu, then aim it at the table coaster.
            </div>
            <div class="qr-wrapper">
              ${qrSvg}
            </div>
            <div class="price-tag">Rs. ${cocktail.price}</div>
            <div class="footer-tip">Place next to the Hiro table coaster.</div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const cardColor = cocktail.card_color || '#c29a53';

  return (
    <div 
      className="flex flex-col md:flex-row gap-6 p-6 rounded-3xl glass-premium hover:shadow-xl transition-all duration-500 relative group overflow-hidden"
      style={{
        borderColor: `${cardColor}35`,
        boxShadow: `0 10px 30px -10px rgba(81, 9, 9, 0.08), 0 0 15px ${cardColor}15`
      }}
    >
      {/* Decorative top colored border glow */}
      <div 
        className="absolute top-0 left-0 right-0 h-1 opacity-40 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${cardColor}, transparent)` }}
      />

      {/* Cocktail Image Frame */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 items-center">
        <div className="relative w-44 h-44 flex-shrink-0 bg-[var(--brand-maroon)]/5 rounded-2xl overflow-hidden border border-[var(--brand-maroon)]/10 flex items-center justify-center p-5 shadow-inner">
          <div 
            className="absolute inset-0 opacity-10 blur-xl group-hover:opacity-30 transition-opacity duration-500"
            style={{ backgroundColor: cardColor }}
          />
          {cocktail.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cocktail.image_url}
              alt={cocktail.name}
              className="w-full h-full object-contain drop-shadow-[0_12px_24px_rgba(81,9,9,0.3)] group-hover:scale-105 transition-transform duration-500 z-10"
            />
          ) : (
            <div className="text-[var(--brand-maroon)]/40 text-xs font-bold uppercase tracking-wider">No Image</div>
          )}
          <span 
            className="absolute top-3 left-3 px-3 py-1 text-[9px] uppercase font-black rounded-lg tracking-wider text-[#fcefd4] z-20 shadow-lg"
            style={{ backgroundColor: cardColor }}
          >
            {cocktail.category}
          </span>
        </div>

        {/* Cocktail details */}
        <div className="flex-1 text-center md:text-left flex flex-col justify-center">
          <h3 className="text-2xl md:text-3xl font-display font-black tracking-tight text-[var(--brand-maroon)] uppercase mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#510909] group-hover:to-[#c29a53] transition-all duration-300">
            {cocktail.name}
          </h3>
          <p 
            className="font-bold text-xl mb-3 tracking-wide"
            style={{ color: cardColor }}
          >
            Rs. {cocktail.price}
          </p>
          <p className="text-xs md:text-sm text-[var(--brand-maroon)]/80 leading-relaxed mb-4 max-w-md font-medium">
            {cocktail.description}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-1.5 mt-auto">
            {cocktail.ingredients.map((ing, i) => (
              <span
                key={i}
                className="px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-white/40 hover:bg-white/70 border border-[var(--brand-maroon)]/10 hover:border-[var(--brand-maroon)]/25 rounded-full text-[var(--brand-maroon)] transition-all duration-200"
              >
                {ing.trim()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* QR Code Reveal & Actions */}
      <div className="w-full md:w-44 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-[var(--brand-maroon)]/10 pt-6 md:pt-0 md:pl-6 gap-4">
        {arUrl ? (
          <div className="relative">
            {/* Hidden raw svg for PDF printing / download */}
            <div className="hidden">
              <QRCodeSVG
                ref={qrRef}
                value={arUrl}
                size={180}
                bgColor="#ffffff"
                fgColor="#0a0e27"
                level="H"
                includeMargin={false}
              />
            </div>

            {showQR ? (
              <div 
                className="bg-white p-2.5 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(81,9,9,0.15)] cursor-pointer group/qr relative transition-all duration-300 animate-[fadeIn_0.2s_ease-out]"
                onClick={() => setShowQR(false)}
              >
                <QRCodeSVG
                  value={arUrl}
                  size={120}
                  bgColor="#ffffff"
                  fgColor="#510909"
                  level="H"
                  includeMargin={false}
                />
                <div className="absolute inset-0 bg-[#510909]/80 opacity-0 group-hover/qr:opacity-100 flex items-center justify-center rounded-2xl transition-opacity duration-300">
                  <span className="text-[10px] text-[#fcefd4] font-black uppercase tracking-wider">Close</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowQR(true)}
                className="w-32 h-32 rounded-2xl bg-white/30 hover:bg-white/50 border border-[var(--brand-maroon)]/10 hover:border-[var(--brand-maroon)]/25 flex flex-col items-center justify-center gap-3 transition-all duration-300 group/btn cursor-pointer shadow-inner"
              >
                <div className="w-12 h-12 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 group-hover/btn:border-[var(--brand-maroon)]/30 flex items-center justify-center transition-all duration-300">
                  <QrCode size={20} className="text-[var(--brand-maroon)]/60 group-hover/btn:text-[var(--brand-maroon)] transition-colors" />
                </div>
                <span className="text-[9px] uppercase font-black tracking-widest text-[var(--brand-maroon)]/60 group-hover/btn:text-[var(--brand-maroon)]">Reveal QR</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-32 h-32 bg-[var(--brand-maroon)]/5 border border-[var(--brand-maroon)]/10 rounded-2xl animate-pulse" />
        )}

        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--brand-maroon)]/60">Scan to launch</p>
          <p className="text-[10px] text-[var(--brand-maroon)]/85 font-mono mt-1 bg-[var(--brand-maroon)]/5 px-2 py-0.5 rounded border border-[var(--brand-maroon)]/10 select-all">
            /ar/{cocktail.slug}
          </p>
        </div>

        {/* Action button row */}
        <div className="flex gap-2 w-full max-w-[136px]">
          <button
            onClick={downloadQR}
            className="flex-1 flex justify-center items-center py-2.5 bg-white/40 hover:bg-white/60 border border-[var(--brand-maroon)]/10 hover:border-[var(--brand-maroon)]/25 rounded-xl transition-all cursor-pointer"
            title="Download QR SVG"
          >
            <Download size={14} className="text-[var(--brand-maroon)]/70 hover:text-[var(--brand-maroon)]" />
          </button>
          <button
            onClick={handlePrintCard}
            className="flex-1 flex justify-center items-center py-2.5 bg-white/40 hover:bg-white/60 border border-[var(--brand-maroon)]/10 hover:border-[var(--brand-maroon)]/25 rounded-xl transition-all cursor-pointer"
            title="Print Presentation Card"
          >
            <Printer size={14} className="text-[var(--brand-maroon)]/70 hover:text-[var(--brand-maroon)]" />
          </button>
          <Link
            href={`/ar/${cocktail.slug}`}
            className="flex-1 flex justify-center items-center py-2.5 bg-gradient-to-tr from-[var(--brand-maroon)] to-[#c29a53] hover:shadow-[0_0_12px_rgba(81,9,9,0.2)] rounded-xl transition-all cursor-pointer"
            title="Launch AR Viewer"
          >
            <ExternalLink size={14} className="text-[#fcefd4] stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
