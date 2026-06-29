export default function BlogDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="h-4 w-24 animate-pulse rounded bg-stone-200" />
        <div className="h-14 w-full animate-pulse rounded bg-stone-200" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200" />
        <div className="aspect-[16/9] animate-pulse rounded-3xl bg-stone-200" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-4 w-full animate-pulse rounded bg-stone-200" />
        ))}
      </div>
    </div>
  );
}
