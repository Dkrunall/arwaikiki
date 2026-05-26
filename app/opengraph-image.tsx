import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Waikiki Bar – Interactive WebAR Cocktail Menu';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fcefd4 0%, #f5d9a0 50%, #fcefd4 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient blobs */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'rgba(81,9,9,0.07)', filter: 'blur(60px)', display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: '-80px', right: '-80px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'rgba(194,154,83,0.1)', filter: 'blur(80px)', display: 'flex',
        }} />

        {/* Gold top border */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
          background: 'linear-gradient(90deg, #510909, #c29a53, #510909)',
          display: 'flex',
        }} />

        {/* Cocktail emoji */}
        <div style={{ fontSize: '96px', marginBottom: '24px', display: 'flex' }}>
          🍹
        </div>

        {/* Brand pill */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(81,9,9,0.06)', border: '1px solid rgba(81,9,9,0.15)',
          borderRadius: '99px', padding: '8px 24px', marginBottom: '20px',
        }}>
          <span style={{
            fontSize: '13px', fontWeight: 900, letterSpacing: '0.25em',
            textTransform: 'uppercase', color: 'rgba(81,9,9,0.6)',
          }}>
            Interactive Dining Experience
          </span>
        </div>

        {/* Main heading */}
        <div style={{
          fontSize: '72px', fontWeight: 900, color: '#510909',
          textTransform: 'uppercase', letterSpacing: '-1px',
          textAlign: 'center', lineHeight: 1.05, display: 'flex',
          flexDirection: 'column', alignItems: 'center',
        }}>
          <span>WAIKIKI BAR</span>
          <span style={{ color: '#c29a53', fontSize: '52px' }}>WebAR Menu</span>
        </div>

        {/* Divider */}
        <div style={{
          width: '120px', height: '2px', margin: '24px 0',
          background: 'linear-gradient(90deg, transparent, #c29a53, transparent)',
          display: 'flex',
        }} />

        {/* Description */}
        <div style={{
          fontSize: '22px', color: 'rgba(81,9,9,0.7)', textAlign: 'center',
          maxWidth: '700px', lineHeight: 1.5, display: 'flex',
        }}>
          Scan your cocktail QR code · Point camera at the coaster · Watch it float in 3D
        </div>

        {/* URL badge */}
        <div style={{
          position: 'absolute', bottom: '32px',
          display: 'flex', alignItems: 'center',
          background: 'rgba(81,9,9,0.06)', border: '1px solid rgba(81,9,9,0.12)',
          borderRadius: '99px', padding: '8px 20px',
        }}>
          <span style={{ fontSize: '14px', color: 'rgba(81,9,9,0.5)', fontWeight: 700, letterSpacing: '0.1em' }}>
            arwaikiki.vercel.app
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
