import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin, Share2, Globe, Send } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image src="/Logo.png" alt="SS Packaging logo" width={40} height={40} className="w-auto h-16 object-contain" />
              <div>
               
              </div>
            </div>
            <p className="text-sm leading-relaxed text-stone-400">
              India's trusted source for premium, eco-friendly, and industrial packaging solutions. Quality you can count on.
            </p>
            <div className="flex gap-3 mt-5">
              {[Share2, Globe, Send].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-stone-800 hover:bg-amber-600 rounded-lg flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', href: '/' },
                { label: 'Products', href: '/products' },
                { label: 'About Us', href: '/about' },
                { label: 'Contact', href: '/contact' },
                { label: 'Get a Quote', href: '/contact#quote' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-stone-400 hover:text-amber-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-semibold mb-4">Categories</h4>
            <ul className="space-y-2.5">
              {[
                'Bamboo Packaging',
                'Glass Bottles',
                'Plastic Containers',
                'Corrugated Boxes',
                'Eco-Friendly',
                'Custom Packaging',
              ].map(cat => (
                <li key={cat}>
                  <Link href={`/products?q=${encodeURIComponent(cat)}`} className="text-sm text-stone-400 hover:text-amber-400 transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-stone-400">
                <MapPin className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                123, Industrial Area, Mumbai, Maharashtra - 400001
              </li>
              <li className="flex items-center gap-2.5 text-sm text-stone-400">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="tel:+919876543210" className="hover:text-amber-400 transition">+91 98765 43210</a>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-stone-400">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="mailto:info@sspackaging.in" className="hover:text-amber-400 transition">info@sspackaging.in</a>
              </li>
            </ul>
            <div className="mt-5 p-3 bg-stone-800 rounded-xl">
              <p className="text-xs text-stone-400 mb-1">Business Hours</p>
              <p className="text-sm text-white">Mon – Sat: 9:00 AM – 6:00 PM</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© {new Date().getFullYear()} SS Packaging. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-amber-400 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-amber-400 transition">Terms of Service</Link>
            <Link href="/shipping" className="hover:text-amber-400 transition">Shipping Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
