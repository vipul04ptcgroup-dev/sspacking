import Link from 'next/link';
import Image from 'next/image';
import type { BlogPost } from '@/types';
import { formatDate, truncate } from '@/lib/utils';
import { ArrowUpRight, CalendarDays } from 'lucide-react';

export default function BlogCard({ blog }: { blog: BlogPost }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_25px_70px_-50px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_35px_90px_-55px_rgba(15,23,42,0.45)]">
      <Link href={`/blogs/${blog.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
          {blog.coverImage ? (
            <Image
              src={blog.coverImage}
              alt={blog.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-200 via-stone-100 to-amber-50 text-stone-400">
              <span className="text-sm font-semibold uppercase tracking-[0.28em]">SS Packaging</span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {blog.featured ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">
              Featured
            </span>
          ) : null}
          {blog.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2 text-xs text-stone-500">
          <CalendarDays className="h-3.5 w-3.5 text-amber-600" />
          <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
          <span>•</span>
          <span>{blog.authorName}</span>
        </div>

        <Link href={`/blogs/${blog.slug}`} className="group/title inline-block">
          <h2 className="text-2xl font-black leading-tight text-stone-900 transition group-hover/title:text-amber-700">
            {blog.title}
          </h2>
        </Link>

        <p className="mt-4 text-sm leading-7 text-stone-600">
          {truncate(blog.excerpt, 150)}
        </p>

        <Link
          href={`/blogs/${blog.slug}`}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-stone-900 transition hover:text-amber-700"
        >
          Read Article
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
