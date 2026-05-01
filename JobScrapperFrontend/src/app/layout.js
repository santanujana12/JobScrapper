import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

// ── Viewport (must be separate from metadata in Next.js 14+) ─────────────────
export const viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// ── PWA + SEO metadata ────────────────────────────────────────────────────────
export const metadata = {
  title: 'AI Job Scraper — Find Your Perfect Role',
  description:
    'Upload your resume and let Gemini AI analyze your skills, then automatically scrape career pages at Airbnb, Reddit, Linear, Netlify and 75+ top companies to find your best matches.',
  keywords: ['job search', 'AI', 'resume', 'career', 'Gemini', 'GraphQL'],
  authors: [{ name: 'Santanu Jana' }],

  // PWA manifest
  manifest: '/manifest.webmanifest',

  // Apple-specific PWA tags
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AI Job Scraper',
  },

  // Open Graph (link previews)
  openGraph: {
    title: 'AI Job Scraper — Find Your Perfect Role',
    description:
      'AI-powered resume analysis + career page scraping across 75+ top tech companies.',
    type: 'website',
    locale: 'en_US',
  },

  // Icons
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
  },
};

// ── Service Worker registration (client-side only) ────────────────────────────
// Injected as an inline script so it runs immediately without a separate file.
const swScript = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js')
        .then(function(reg) {
          console.log('[PWA] Service worker registered:', reg.scope);
        })
        .catch(function(err) {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    });
  }
`;

// ── Layout ────────────────────────────────────────────────────────────────────
export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* iOS splash / standalone mode */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI Job Scraper" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />

        {/* Service worker registration */}
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
