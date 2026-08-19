import type { Metadata, Viewport } from 'next';
import { Archivo, Inter, IBM_Plex_Mono } from 'next/font/google';
import { Providers } from '@/components/providers/Providers';
import { themeScript } from '@/components/providers/ThemeProvider';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CursorLayer } from '@/components/ui/CursorLayer';
import { env } from '@/lib/env';
import './globals.css';

/* Display — architectural grotesque for headlines and campaign type. */
const archivo = Archivo({
  subsets: ['latin'], variable: '--font-display',
  weight: ['400', '500', '600'], display: 'swap',
});
/* Primary sans — navigation, body, product information, UI. */
const inter = Inter({
  subsets: ['latin'], variable: '--font-sans',
  weight: ['400', '500', '600'], display: 'swap',
});
/* Technical accent — specifications, measurements, technology labels. */
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'], variable: '--font-mono',
  weight: ['400', '500'], display: 'swap',
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F1EA' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0C0B' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: 'VAYRO — Engineered for the way forward',
    template: '%s — VAYRO',
  },
  description:
    'Premium outerwear and travel equipment engineered to pack. The Meridian Carry Shell folds into its own hood and becomes a 2.1 L carry unit.',
  applicationName: 'VAYRO',
  keywords: ['packable jacket', 'travel outerwear', 'technical shell', 'carry system', 'VAYRO'],
  authors: [{ name: 'VAYRO' }],
  creator: 'VAYRO',
  openGraph: {
    type: 'website',
    siteName: 'VAYRO',
    title: 'VAYRO — Engineered for the way forward',
    description: 'One layer. Every destination.',
    url: env.siteUrl,
    images: [{ url: '/brand/png/vayro-lockup-horizontal-ivory-2048.png', width: 2048, height: 428, alt: 'VAYRO' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VAYRO — Engineered for the way forward',
    description: 'One layer. Every destination.',
    images: ['/brand/png/vayro-lockup-horizontal-ivory-2048.png'],
  },
  icons: {
    icon: [
      { url: '/brand/favicon.svg', type: 'image/svg+xml' },
      { url: '/brand/png/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/brand/png/vayro-app-icon-180.png',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <a href="#main" className="skip-link">Skip to content</a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <CartDrawer />
          <CursorLayer />
        </Providers>
      </body>
    </html>
  );
}
