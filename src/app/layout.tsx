import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import ConditionalFooter from '@/components/layout/ConditionalFooter';
import ScrollToTop from '@/components/layout/ScrollToTop';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sspackaging.in';

const siteNavigation = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'SS Packaging',
  url: siteUrl,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${siteUrl}/products?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
  hasPart: [
    { '@type': 'SiteNavigationElement', name: 'Home', url: `${siteUrl}/` },
    { '@type': 'SiteNavigationElement', name: 'Products', url: `${siteUrl}/products` },
    { '@type': 'SiteNavigationElement', name: 'About', url: `${siteUrl}/about` },
    { '@type': 'SiteNavigationElement', name: 'Contact', url: `${siteUrl}/contact` },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'SS Packaging', template: '%s | SS Packaging' },
  description: "India's trusted source for bamboo, glass, plastic, and eco-friendly packaging products.",
  openGraph: {
    title: 'SS Packaging',
    description: "India's trusted source for bamboo, glass, plastic, and eco-friendly packaging products.",
    type: 'website',
    url: siteUrl,
    siteName: 'SS Packaging',
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="bg-stone-50 text-stone-900 antialiased font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigation) }}
        />
        <AuthProvider>
          <ScrollToTop />
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <ConditionalFooter />
          <Toaster
            position="top-right"
            toastOptions={{
              className: '!bg-stone-900 !text-white !rounded-xl !shadow-xl',
              success: { iconTheme: { primary: '#f59e0b', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
