import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import ConditionalFooter from '@/components/layout/ConditionalFooter';
import ScrollToTop from '@/components/layout/ScrollToTop';
import VisitorAnalyticsTracker from '@/components/analytics/VisitorAnalyticsTracker';
import { SITE_URL } from '@/lib/seo';
import { BUSINESS_IMAGES, buildOrganizationSchema } from '@/src/seo/organizationSchema';
import { buildWebsiteSchema } from '@/src/seo/websiteSchema';
import { buildLocalBusinessSchema } from '@/src/seo/localBusinessSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'SS Packaging', template: '%s | SS Packaging' },
  description: "India's trusted source for bamboo, glass, plastic, and eco-friendly packaging products.",
  openGraph: {
    title: 'SS Packaging',
    description: "India's trusted source for bamboo, glass, plastic, and eco-friendly packaging products.",
    type: 'website',
    url: SITE_URL,
    siteName: 'SS Packaging',
    images: BUSINESS_IMAGES.map((url: string) => ({ url })),
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SS Packaging',
    description: "India's trusted source for bamboo, glass, plastic, and eco-friendly packaging products.",
    images: BUSINESS_IMAGES,
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
        {/* Global structured data used site-wide for entity recognition and sitelink search support. */}
        <SchemaInjector
          schemas={[
            buildOrganizationSchema(),
            buildWebsiteSchema(),
            buildLocalBusinessSchema(),
          ]}
        />
        <AuthProvider>
          <ScrollToTop />
          <VisitorAnalyticsTracker />
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
