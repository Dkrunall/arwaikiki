import type { Metadata, Viewport } from "next";
import { Outfit, Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const BASE_URL = 'https://arwaikiki.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Waikiki Bar — Interactive WebAR Cocktail Menu',
    template: '%s | Waikiki Bar',
  },
  description: 'Scan your cocktail QR code, point your camera at the table coaster, and watch your drink float in 3D. The future of bar menus.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: 'Waikiki Bar',
    title: 'Waikiki Bar — Interactive WebAR Cocktail Menu',
    description: 'Scan your cocktail QR code, point your camera at the table coaster, and watch your drink float in 3D.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Waikiki Bar — Interactive WebAR Cocktail Menu',
    description: 'Scan your cocktail QR code, point your camera at the table coaster, and watch your drink float in 3D.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${spaceGrotesk.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-[#fcefd4] text-[#510909] font-sans">
        {children}
        <Script
          type="module"
          src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

