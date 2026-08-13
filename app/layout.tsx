import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SmartPunter — Smarter Football Predictions, Every Day',
  description: 'Football predictions and VIP betting tips for South African punters. Free and VIP tips with honest results tracking.',
  manifest: '/manifest.json',
  themeColor: '#f5a623',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SmartPunter',
  },
  openGraph: {
    title: 'SmartPunter — Smarter Football Predictions',
    description: 'Football predictions and VIP betting tips for South African punters.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0e1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className="dark">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
