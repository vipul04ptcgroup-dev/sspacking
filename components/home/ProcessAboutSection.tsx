import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ClipboardList,
  Cog,
  FlaskConical,
  PackageCheck,
  PaintbrushVertical,
  Truck,
} from 'lucide-react';

export default function ProcessAboutSection() {
  const steps = [
    { icon: ClipboardList, label: 'Share\nRequirement' },
    { icon: FlaskConical, label: 'Get\nSamples' },
    { icon: PaintbrushVertical, label: 'Approve\nDesign' },
    { icon: Cog, label: 'Production' },
    { icon: Truck, label: 'Delivery' },
  ];

  const stats = [
    { value: '10+', label: 'Years Experience' },
    { value: '5000+', label: 'Products' },
    { value: '1000+', label: 'Clients' },
    { value: '50+', label: 'Cities Served' },
    { value: '99%', label: 'Customer Satisfaction' },
  ];

  return (
    <section className="bg-white py-12 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600">
            How It Works
          </p>
        </div>

        <div className="relative mt-6">
          <div className="absolute left-0 right-0 top-8 hidden border-t border-dashed border-stone-300 lg:block" />
          <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step.label} className="relative flex flex-col items-center text-center">
                <div className="absolute left-1/2 top-12 hidden h-7 w-7 -translate-x-[62px] items-center justify-center rounded-full bg-[#08111f] text-xs font-bold text-white lg:flex">
                  {index + 1}
                </div>
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-stone-200 bg-white text-[#08111f] shadow-sm">
                  <step.icon className="h-7 w-7" />
                </div>
                <p className="mt-4 whitespace-pre-line text-base font-semibold leading-6 text-stone-800">
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-[14px] bg-[#08111f] text-white shadow-[0_24px_60px_-42px_rgba(2,6,23,0.6)]">
          <div className="grid md:grid-cols-2 xl:grid-cols-5">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="border-b border-white/15 px-6 py-6 text-center md:border-r md:border-b-0 last:border-r-0"
              >
                <div className="text-[3rem] font-black leading-none tracking-[-0.04em] text-white">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm font-medium text-stone-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div className="overflow-hidden rounded-[14px] border border-stone-200 bg-white shadow-[0_20px_50px_-40px_rgba(15,23,42,0.28)]">
            <div className="relative min-h-[260px] sm:min-h-[320px] lg:min-h-[360px]">
              <Image
                src="/homepageaboutus.png"
                alt="SS Packaging production and packaging range"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[14px] border border-stone-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffdf8_100%)] px-6 py-8 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.18)] sm:px-8">
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,_rgba(15,23,42,0.04),_transparent_70%)] lg:block" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600">
              About SS Packaging
            </p>
            <h2 className="mt-3 max-w-xl text-[2.1rem] font-black leading-[1.08] tracking-[-0.03em] text-[#08111f] sm:text-[2.5rem]">
              Packaging That Protects, Preserves & Elevates
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-stone-600">
              SS Packaging is a trusted manufacturer and supplier of premium packaging solutions designed for cosmetic, pharmaceutical, food, FMCG and industrial applications. We provide high-quality bottles, jars, containers and closures with custom manufacturing capabilities.
            </p>
            <div className="mt-7">
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-[#08111f] px-6 py-3 text-sm font-bold uppercase tracking-[0.03em] text-white transition hover:bg-[#12243c]"
              >
                About Us <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
