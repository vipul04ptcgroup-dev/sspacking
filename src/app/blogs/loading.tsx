export default function BlogsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mb-10 space-y-4">
        <div className="h-4 w-32 animate-pulse rounded bg-stone-200" />
        <div className="h-12 w-72 animate-pulse rounded bg-stone-200" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-stone-200" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
            <div className="aspect-[16/10] animate-pulse bg-stone-200" />
            <div className="space-y-4 p-6">
              <div className="h-3 w-28 animate-pulse rounded bg-stone-200" />
              <div className="h-8 w-3/4 animate-pulse rounded bg-stone-200" />
              <div className="h-4 w-full animate-pulse rounded bg-stone-200" />
              <div className="h-4 w-5/6 animate-pulse rounded bg-stone-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
