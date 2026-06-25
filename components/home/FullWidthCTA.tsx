import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CircleDollarSign } from 'lucide-react';

export default function FullWidthCTA() {
  const customServices = [
    'Logo Printing',
    'Color Customization',
    'Bottle Development',
    'Labeling',
    'OEM Manufacturing',
  ];

  return (
    <section className="w-full bg-white py-10 sm:py-12 lg:py-14">
      <div className="w-full overflow-hidden bg-[linear-gradient(90deg,#020202_0%,#050505_38%,#0a0908_70%,#231709_100%)] text-white shadow-[0_24px_60px_-42px_rgba(0,0,0,0.8)]">
        <div className="mx-auto grid max-w-[1700px] items-center gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_auto_1.25fr_0.7fr] lg:gap-8 lg:px-10">
          <div className="max-w-md">
            <h2 className="text-[2rem] font-black uppercase leading-none tracking-[-0.03em] text-white sm:text-[2.2rem]">
              Need Custom Packaging?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-stone-300 sm:text-base">
              From concept to production, we create packaging solutions tailored to your brand.
            </p>
            <div className="mt-6">
              <Link
                href="/contact#quote"
                className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-amber-500 px-6 py-3 text-sm font-bold uppercase tracking-[0.03em] text-stone-950 transition hover:bg-amber-400"
              >
                Start Your Project <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="hidden h-28 w-px bg-white/20 lg:block" />

          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {customServices.map((service) => (
              <div key={service} className="flex flex-col items-center justify-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/5 text-amber-300">
                  <CircleDollarSign className="h-6 w-6" />
                </div>
                <span className="mt-3 text-sm font-semibold leading-5 text-stone-100">{service}</span>
              </div>
            ))}
          </div>

          <div className="relative hidden min-h-[170px] overflow-hidden lg:block">
            <Image
              src="/homepagecustome.png"
              alt="SS Packaging product range"
              fill
              className="object-cover object-right"
              sizes="30vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,2,2,0.08)_0%,rgba(2,2,2,0.02)_35%,rgba(2,2,2,0)_100%)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
