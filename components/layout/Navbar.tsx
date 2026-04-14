'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShoppingCart, User, Menu, X, Search, ChevronDown, LogOut, Package, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useCartStore } from '@/store/cart-store';
import { getCategories } from '@/lib/firestore';
import type { Category } from '@/types';

export default function Navbar() {
  const { user, userProfile, logout, isAdmin } = useAuth();
  const itemCount = useCartStore(s => s.itemCount());
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    getCategories().then(setCategories);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/products?q=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm border-b border-stone-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/Logo.png" alt="SS Packaging logo" width={40} height={40} className="w-auto h-16 object-contain" priority />
           
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">Home</Link>

            <div className="relative" onMouseEnter={() => setProductsOpen(true)} onMouseLeave={() => setProductsOpen(false)}>
              <button className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-stone-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                Products <ChevronDown className={`w-4 h-4 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
              </button>
              {productsOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-stone-100 min-w-[200px] py-2 z-50">
                  <Link href="/products" className="block px-4 py-2 text-sm text-stone-700 hover:bg-amber-50 hover:text-amber-700 font-medium">All Products</Link>
                  <div className="my-1 border-t border-stone-100" />
                  {categories.map(cat => (
                    <Link key={cat.id} href={`/products/${cat.slug}`} className="block px-4 py-2 text-sm text-stone-600 hover:bg-amber-50 hover:text-amber-700">
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/about" className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">About</Link>
            <Link href="/contact" className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">Contact</Link>
          </nav>

          {/* Search + Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="pl-9 pr-4 py-2 text-sm bg-stone-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-amber-400 w-44 focus:w-60 transition-all"
                />
              </div>
            </form>

            {/* Cart */}
            <Link href="/cart" className="relative p-2.5 text-stone-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-amber-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-100 transition"
                >
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <span className="text-amber-700 font-bold text-sm">
                      {(user.displayName || user.email || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-stone-100 min-w-[180px] py-2 z-50">
                    <div className="px-4 py-2 border-b border-stone-100">
                      <p className="text-xs font-semibold text-stone-900 truncate">{user.displayName || 'User'}</p>
                      <p className="text-xs text-stone-500 truncate">{user.email}</p>
                    </div>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-amber-50">
                        <LayoutDashboard className="w-4 h-4" /> Admin Dashboard
                      </Link>
                    )}
                    <Link href="/account" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-amber-50">
                      <User className="w-4 h-4" /> My Account
                    </Link>
                    <Link href="/account/orders" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-amber-50">
                      <Package className="w-4 h-4" /> My Orders
                    </Link>
                    <button onClick={() => { logout(); setProfileOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth/login" className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition">
                <User className="w-4 h-4" /> Login
              </Link>
            )}

            {/* Get Quote */}
            <Link href="/contact#quote" className="hidden lg:flex px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-lg transition">
              Get Quote
            </Link>

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(v => !v)} className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-stone-100 py-4 space-y-1">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-9 pr-4 py-2.5 text-sm bg-stone-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </form>
            <Link href="/" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-stone-700 hover:bg-amber-50 rounded-lg">Home</Link>
            <Link href="/products" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-stone-700 hover:bg-amber-50 rounded-lg">All Products</Link>
            {categories.map(cat => (
              <Link key={cat.id} href={`/products/${cat.slug}`} onClick={() => setMenuOpen(false)} className="block px-6 py-2 text-sm text-stone-600 hover:bg-amber-50 rounded-lg">
                {cat.name}
              </Link>
            ))}
            <Link href="/about" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-stone-700 hover:bg-amber-50 rounded-lg">About</Link>
            <Link href="/contact" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-stone-700 hover:bg-amber-50 rounded-lg">Contact</Link>
            {!user && <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 rounded-lg">Login / Register</Link>}
          </div>
        )}
      </div>
    </header>
  );
}
