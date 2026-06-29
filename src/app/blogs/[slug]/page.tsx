import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowUpRight, ChevronRight, Clock3 } from 'lucide-react';
import { absoluteUrl } from '@/lib/seo';
import { getBlogPostBySlug, getPublishedBlogPosts } from '@/lib/firestore';
import { formatDate } from '@/lib/utils';
import { buildArticleSchema } from '@/src/seo/articleSchema';
import { buildBreadcrumbSchema } from '@/src/seo/breadcrumbSchema';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

type BlogBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'list'; items: string[] };

function buildContentBlocks(content: string): BlogBlock[] {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const bulletItems = lines.map((line) => line.match(/^[-*•]\s+(.+)$/)?.[1]?.trim() || null);

      if (lines.length > 0 && bulletItems.every(Boolean)) {
        return {
          type: 'list',
          items: bulletItems.filter((item): item is string => Boolean(item)),
        };
      }

      return {
        type: 'paragraph',
        content: block,
      };
    });
}

export async function generateStaticParams() {
  const posts = await getPublishedBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogPostBySlug(slug);

  if (!blog || !blog.published) {
    return {
      title: 'Blog Not Found',
    };
  }

  const title = blog.seoTitle || blog.title;
  const description = blog.metaDescription || blog.seoDescription || blog.excerpt;
  const resolvedTitle = blog.metaTitle || title;
  const path = `/blogs/${blog.slug}`;

  return {
    title: resolvedTitle,
    description,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      title: resolvedTitle,
      description,
      url: absoluteUrl(path),
      type: 'article',
      images: blog.coverImage ? [{ url: blog.coverImage }] : undefined,
    },
    twitter: {
      card: blog.coverImage ? 'summary_large_image' : 'summary',
      title: resolvedTitle,
      description,
      images: blog.coverImage ? [blog.coverImage] : undefined,
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [blog, allPublishedBlogs] = await Promise.all([
    getBlogPostBySlug(slug),
    getPublishedBlogPosts(),
  ]);

  if (!blog || !blog.published) return notFound();

  const relatedBlogs = allPublishedBlogs
    .filter((post) => post.slug !== blog.slug)
    .slice(0, 3);
  const blocks = buildContentBlocks(blog.content);
  const pagePath = `/blogs/${blog.slug}`;
  const keywordList = [
    blog.focusKeyword,
    ...blog.secondaryKeywords,
    blog.title,
    ...blog.tags,
  ].filter(Boolean);

  return (
    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#fafaf9_35%,#f5f5f4_100%)]">
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: pagePath,
            name: blog.metaTitle || blog.seoTitle || blog.title,
            description: blog.metaDescription || blog.seoDescription || blog.excerpt,
            keywords: keywordList,
          }),
          buildArticleSchema({
            path: pagePath,
            headline: blog.title,
            description: blog.metaDescription || blog.seoDescription || blog.excerpt,
            image: blog.coverImage,
            datePublished: (blog.publishedAt || blog.createdAt).toISOString(),
            dateModified: blog.updatedAt.toISOString(),
            authorName: blog.authorName,
          }),
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blogs', path: '/blogs' },
            { name: blog.title, path: pagePath },
          ]),
        ]}
      />

      <article className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <nav className="mb-8 flex items-center gap-2 text-sm text-stone-500">
          <Link href="/" className="hover:text-amber-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/blogs" className="hover:text-amber-600">Blogs</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-stone-900">{blog.title}</span>
        </nav>

        <header className="mx-auto max-w-3xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {blog.featured ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800">
                Featured
              </span>
            ) : null}
          </div>

          <h1 className="mt-6 text-4xl font-black leading-tight text-stone-900 sm:text-5xl">
            {blog.title}
          </h1>
          <p className="mt-5 text-base leading-8 text-stone-600 sm:text-lg">
            {blog.excerpt}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-stone-500">
            <span>{blog.authorName}</span>
            <span>•</span>
            <span>{formatDate(blog.publishedAt || blog.createdAt)}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-600" />
              Updated {formatDate(blog.updatedAt)}
            </span>
          </div>
        </header>

        {blog.coverImage ? (
          <div className="relative mx-auto mt-10 aspect-[16/9] max-w-4xl overflow-hidden rounded-[2rem] border border-stone-200 bg-stone-100 shadow-[0_30px_100px_-65px_rgba(15,23,42,0.45)]">
            <Image src={blog.coverImage} alt={blog.title} fill className="object-cover" priority />
          </div>
        ) : null}

        <div className="mx-auto mt-12 max-w-5xl">
          <div className="min-w-0 rounded-[2rem] border border-stone-200 bg-white p-7 shadow-sm sm:p-10">
            <div className="prose prose-stone max-w-none">
              {blocks.map((block, index) =>
                block.type === 'list' ? (
                  <ul key={index} className="mb-6 list-disc space-y-3 pl-6 text-base leading-8 text-stone-700">
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={index} className="mb-6 text-base leading-8 text-stone-700">
                    {block.content}
                  </p>
                ),
              )}
            </div>
          </div>
        </div>

        {blog.internalLinks.length > 0 ? (
          <section className="mx-auto mt-10 max-w-5xl rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">Internal Links</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {blog.internalLinks.map((link) => (
                <InternalBlogLink key={`${link.href}-${link.label}`} href={link.href} label={link.label} />
              ))}
            </div>
          </section>
        ) : null}

        {relatedBlogs.length > 0 ? (
          <section className="mx-auto mt-10 max-w-5xl rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">More Articles</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {relatedBlogs.map((relatedBlog) => (
                <Link
                  key={relatedBlog.id}
                  href={`/blogs/${relatedBlog.slug}`}
                  className="block rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4 transition hover:border-amber-200 hover:bg-amber-50"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    {formatDate(relatedBlog.publishedAt || relatedBlog.createdAt)}
                  </p>
                  <h3 className="mt-2 text-base font-bold leading-snug text-stone-900">{relatedBlog.title}</h3>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </article>
    </div>
  );
}

function InternalBlogLink({ href, label }: { href: string; label: string }) {
  const isExternal = /^https?:\/\//i.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
      >
        <span>{label}</span>
        <ArrowUpRight className="h-4 w-4" />
      </a>
    );
  }

  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
    >
      <span>{label}</span>
      <ArrowUpRight className="h-4 w-4" />
    </Link>
  );
}
