import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export default function FullWidthCTA() {
  return (
    <section className="w-full bg-white pb-4 pt-10 sm:pb-6 sm:pt-12 lg:pb-8 lg:pt-14">
      <div className="w-full overflow-hidden bg-[linear-gradient(90deg,#020202_0%,#050505_38%,#0a0908_70%,#231709_100%)] text-white shadow-[0_24px_60px_-42px_rgba(0,0,0,0.8)]">
        <div className="mx-auto grid max-w-[1700px] items-center gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8 lg:px-10">
          <div className="max-w-md text-center lg:ml-20 lg:text-left xl:ml-28">
            <h2 className="text-[2rem] font-black uppercase leading-none tracking-[-0.03em] text-white sm:text-[2.2rem]">
              Need Custom Packaging?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-stone-300 sm:text-base">
              From concept to production, we create packaging solutions tailored to your brand.
            </p>
            <div className="mt-6 flex justify-center lg:block">
              <Link
                href="/contact#quote"
                className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-amber-500 px-6 py-3 text-sm font-bold uppercase tracking-[0.03em] text-stone-950 transition hover:bg-amber-400"
              >
                Start Your Project <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative min-h-[240px] overflow-hidden rounded-[14px] border border-white/10 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.65)] sm:min-h-[300px] lg:min-h-[360px]">
            <Image
              src="/homepagecustome.png"
              alt="SS Packaging product range"
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,2,2,0.06)_0%,rgba(2,2,2,0.02)_35%,rgba(2,2,2,0)_100%)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
