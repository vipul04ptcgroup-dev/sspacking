'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from 'lucide-react';
import { COMPANY_DETAILS } from '@/lib/company';

const quickLinks = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Get Quote', href: '/contact#quote' },
];

const companyLinks = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
];

const supportLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Shipping Policy', href: '/shipping' },
];

const associatedBrands = [
  {
    name: 'The Future X',
    href: 'https://thefuturex.in',
    logo: '/Footer/tfx.jpeg',
  },
  {
    name: 'Ilika',
    href: 'https://ilika.in',
    logo: '/Footer/ilika.webp',
  },
  {
    name: 'PTC Gram',
    href: 'https://ptcgram.com',
    logo: '/Footer/ptc.jpeg',
  },
];

const contactItems = [
  {
    icon: MapPin,
    value: COMPANY_DETAILS.addressLines[0],
  },
  {
    icon: MapPin,
    value: COMPANY_DETAILS.addressLines[1],
  },
  {
    icon: Phone,
    value: COMPANY_DETAILS.contactNumber,
    href: 'tel:+919120879879',
  },
  {
    icon: Mail,
    value: COMPANY_DETAILS.email,
    href: `mailto:${COMPANY_DETAILS.email}`,
  },
  {
    icon: Clock3,
    value: 'Monday to Saturday, 9:00 AM to 6:00 PM',
  },
];

const mobileSections = [
  { id: 'quick-links', title: 'Quick Links', links: quickLinks },
  { id: 'company', title: 'Company', links: companyLinks },
  { id: 'support', title: 'Support', links: supportLinks },
];

export default function Footer() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  return (
    <footer className="overflow-hidden border-t border-white/10 bg-black text-stone-200">
      <div className="bg-black">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Public Storefront
            </p>
            <div className="mx-auto mt-6 flex justify-center">
              <Image
                src={COMPANY_DETAILS.logoPath}
                alt={`${COMPANY_DETAILS.legalName} logo`}
                width={180}
                height={72}
                className="h-auto w-28 object-contain sm:w-32"
              />
            </div>
            <h2 className="mt-5 font-serif text-4xl leading-none text-white sm:text-6xl lg:text-7xl">
              SS Packaging
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-stone-300 sm:text-base sm:leading-8">
              Premium packaging solutions for cosmetics, personal care, retail, and custom brand requirements across India.
            </p>
          </div>

          <div className="mt-10 hidden border-t border-white/10 pt-8 md:grid md:grid-cols-[1.7fr_1fr_1fr_1fr] md:gap-6">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white">Get In Touch</h3>
              <ul className="mt-5 space-y-2.5">
                {contactItems.map((item) => (
                  <li key={item.value} className="flex items-start gap-3 text-[13px] leading-5 text-stone-300">
                    <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <div className="min-w-0">
                      {item.href ? (
                        <a href={item.href} className="break-all transition hover:text-amber-300">
                          {item.value}
                        </a>
                      ) : (
                        <p>{item.value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <FooterLinkColumn title="Quick Links" links={quickLinks} />
            <div>
              <FooterLinkColumn title="Company" links={companyLinks} />
              <div className="mt-8">
                <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white">Associated Brands</h3>
                <AssociatedBrandsList className="mt-4" compact />
              </div>
            </div>
            <FooterLinkColumn title="Support" links={supportLinks} />
          </div>

          <div className="mt-8 border-t border-white/10 pt-6 md:hidden">
            <div className="space-y-1">
              {mobileSections.map((section) => (
                <div key={section.id} className="border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between py-4 text-left"
                  >
                    <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white">{section.title}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-stone-300 transition-transform ${
                        openSection === section.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openSection === section.id && (
                    <ul className="space-y-3 pb-4">
                      {section.links.map((link) => (
                        <li key={link.href}>
                          <Link href={link.href} className="block text-sm text-stone-300 transition hover:text-amber-300">
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              <div className="border-b border-white/10">
                <button
                  type="button"
                  onClick={() => toggleSection('contact')}
                  className="flex w-full items-center justify-between py-4 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Get In Touch</span>
                  <ChevronDown
                    className={`h-4 w-4 text-stone-300 transition-transform ${
                      openSection === 'contact' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openSection === 'contact' && (
                  <ul className="space-y-2.5 pb-4">
                    {contactItems.map((item) => (
                      <li key={item.value} className="flex items-start gap-3 text-[13px] leading-5 text-stone-300">
                        <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                        <div className="min-w-0">
                          {item.href ? (
                            <a href={item.href} className="break-words transition hover:text-amber-300">
                              {item.value}
                            </a>
                          ) : (
                            <p>{item.value}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-b border-white/10">
                <button
                  type="button"
                  onClick={() => toggleSection('associated-brands')}
                  className="flex w-full items-center justify-between py-4 text-left"
                >
                  <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Associated Brands</span>
                  <ChevronDown
                    className={`h-4 w-4 text-stone-300 transition-transform ${
                      openSection === 'associated-brands' ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openSection === 'associated-brands' && <AssociatedBrandsList className="pb-4" />}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-center text-xs text-stone-500 md:flex-row md:items-center md:justify-between md:text-left">
            <p>&copy; {new Date().getFullYear()} {COMPANY_DETAILS.legalName}. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-end">
              {supportLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition hover:text-amber-300">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function AssociatedBrandsList({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <ul className={`${compact ? 'flex flex-wrap gap-3' : 'space-y-3'} ${className}`.trim()}>
      {associatedBrands.map((brand) => (
        <li key={brand.href}>
          <a
            href={brand.href}
            target="_blank"
            rel="noreferrer"
            aria-label={brand.name}
            className={
              compact
                ? 'flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white p-1 transition hover:border-amber-400/50 hover:bg-stone-100'
                : 'flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 transition hover:border-amber-400/40 hover:bg-white/[0.06]'
            }
          >
            <div
              className={
                compact
                  ? 'flex h-full w-full items-center justify-center overflow-hidden'
                  : 'flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white px-2 py-1'
              }
            >
              <Image
                src={brand.logo}
                alt={brand.name}
                width={48}
                height={48}
                className="h-full w-full object-contain"
              />
            </div>
            {!compact && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{brand.name}</p>
                <p className="text-xs text-stone-400">{brand.href.replace(/^https?:\/\//, '')}</p>
              </div>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

function FooterLinkColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.28em] text-white">{title}</h3>
      <ul className="mt-5 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex items-center gap-2 text-sm text-stone-300 transition hover:text-amber-300"
            >
              <ChevronRight className="h-3.5 w-3.5 text-amber-400" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
