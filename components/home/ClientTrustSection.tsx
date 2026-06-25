import { Star } from 'lucide-react';

const testimonials = [
  {
    quote:
      'Excellent quality products and timely delivery. SS Packaging is our trusted partner.',
    name: 'Rohit Sharma',
    title: 'Cosmetic Manufacturer',
  },
  {
    quote:
      'Best supplier for cosmetic packaging. Wide range and great service!',
    name: 'Neha Verma',
    title: 'Personal Care Brand',
  },
  {
    quote:
      'Reliable for bulk orders and their customization support is excellent.',
    name: 'Amit Patel',
    title: 'Pharma Company',
  },
];

const brands = ['LOTUS HERBALS', 'Himalaya', 'PATANJALI', 'Zydus Wellness', 'Dabur', 'WIPRO', 'emami'];

export default function ClientTrustSection() {
  return (
    <section className="bg-white pb-14 pt-4 sm:pb-16 lg:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600">
            What Our Clients Say
          </p>
        </div>

        <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:pb-0">
          {testimonials.map((item) => (
            <div key={item.name} className="min-w-[88%] snap-center sm:min-w-[70%] lg:min-w-0">
              <article className="rounded-[14px] border border-stone-200 bg-white px-5 py-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.22)] sm:px-7 sm:py-6">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-[15px] leading-7 text-stone-600 sm:text-[17px] sm:leading-8">
                  {item.quote}
                </p>
                <div className="mt-6">
                  <p className="text-base font-bold text-[#08111f]">- {item.name}</p>
                  <p className="mt-1 text-sm font-medium text-stone-500">{item.title}</p>
                </div>
              </article>
            </div>
          ))}
        </div>

        {/* <div className="mt-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-600">
            Trusted By Leading Brands
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          {brands.map((brand) => (
            <div
              key={brand}
              className="flex min-h-[84px] items-center justify-center rounded-[12px] border border-stone-200 bg-white px-4 text-center shadow-[0_16px_40px_-40px_rgba(15,23,42,0.24)]"
            >
              <span className="text-lg font-bold tracking-[-0.02em] text-stone-700">{brand}</span>
            </div>
          ))}
        </div> */}

      </div>
    </section>
  );
}
