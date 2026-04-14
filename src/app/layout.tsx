import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: { default: 'SS Packaging — Premium Packaging Solutions', template: '%s | SS Packaging' },
  description: "India's trusted source for bamboo, glass, plastic, and eco-friendly packaging products.",
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased font-sans">
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
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
