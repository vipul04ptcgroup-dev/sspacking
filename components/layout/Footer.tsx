'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MapPin, Share2, Globe, Send } from 'lucide-react';
 

export default function Footer() {
  return (
    <footer className="bg-stone-900 text-stone-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 mb-12">

          {/* Brand */}
          <div className="lg:col-span-5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
              <Image src="/Logo.png" alt="SS Packaging logo" width={40} height={40} className="w-auto h-16 object-contain" />
            </div>
            <p className="text-sm leading-relaxed text-stone-400 max-w-sm mx-auto sm:mx-0">
              India&apos;s trusted source for premium, eco-friendly, and industrial packaging solutions. Quality you can count on.
            </p>
            <div className="flex justify-center sm:justify-start gap-3 mt-5">
              {[Share2, Globe, Send].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 bg-stone-800 hover:bg-amber-600 rounded-lg flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3 text-center sm:text-left">
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Home', href: '/' },
                { label: 'Products', href: '/products' },
                { label: 'About Us', href: '/about' },
                { label: 'Contact', href: '/contact' },
                { label: 'Get a Quote', href: '/contact#quote' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-stone-400 hover:text-amber-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="lg:col-span-4 text-center sm:text-left">
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5 text-sm text-stone-400">
                <MapPin className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                Office no. 201-202, Hirubhai Residency Besides Vedant Hospital, Virar (West) - 401303 Maharashtra, India.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-stone-400">
                <MapPin className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                Unit no. 13, Pragati Compound, Dongri Pada Road, near Jain Mandir, Poman, Vasai Bhiwandi Road, Vasai East, Palghar - 401208
              </li>
              <li className="flex items-center gap-2.5 text-sm text-stone-400">
                <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="tel:+919876543210" className="hover:text-amber-400 transition">+91 91208 79879</a>
              </li>
              <li className="flex items-center gap-2.5 text-sm text-stone-400">
                <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                <a href="mailto:customerservice.sspackaging@gmail.com" className="hover:text-amber-400 transition">customerservice.sspackaging@gmail.com</a>
              </li>
            </ul>
            <div className="mt-5 p-3 bg-stone-800 rounded-xl">
              <p className="text-xs text-stone-400 mb-1">Business Hours</p>
              <p className="text-sm text-white">Mon - Sat: 9:00 AM - 6:00 PM</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-stone-800 flex flex-col md:flex-row items-center md:items-center justify-between gap-4 text-xs text-stone-500 text-center md:text-left">
          <p>&copy; {new Date().getFullYear()} SS Packaging. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-amber-400 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-amber-400 transition">Terms of Service</Link>
            <Link href="/shipping" className="hover:text-amber-400 transition">Shipping Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
