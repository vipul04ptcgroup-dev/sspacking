import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
import BlogCard from '@/components/blog/BlogCard';
import { getFeaturedBlogPosts, getPublishedBlogPosts } from '@/lib/firestore';
import { buildBreadcrumbSchema } from '@/src/seo/breadcrumbSchema';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export default async function BlogsPage() {
  const [blogs, featuredBlogs] = await Promise.all([getPublishedBlogPosts(), getFeaturedBlogPosts(2)]);

  return (
    <div className="bg-[linear-gradient(180deg,#fafaf9_0%,#ffffff_28%,#f5f5f4_100%)]">
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: '/blogs',
            name: 'SS Packaging Blog',
            description: 'Read packaging insights, product guidance, and industry updates from SS Packaging.',
            keywords: ['SS Packaging blog', 'packaging insights', 'bottle packaging articles'],
          }),
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Blogs', path: '/blogs' },
          ]),
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <nav className="mb-8 flex items-center gap-2 text-sm text-stone-500">
          <Link href="/" className="hover:text-amber-600">Home</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-stone-900">Blogs</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-amber-600">Insights & Updates</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-stone-900 sm:text-5xl lg:text-6xl">
              Packaging stories, trends, and practical guides.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600">
              Explore product ideas, packaging decisions, and business-facing content built for brands, manufacturers, and sourcing teams.
            </p>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-500">Featured Now</p>
            <div className="mt-5 space-y-4">
              {featuredBlogs.length > 0 ? featuredBlogs.map((blog) => (
                <Link
                  key={blog.id}
                  href={`/blogs/${blog.slug}`}
                  className="block rounded-2xl border border-stone-100 bg-stone-50 px-4 py-4 transition hover:border-amber-200 hover:bg-amber-50"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    {blog.publishedAt ? blog.publishedAt.toLocaleDateString('en-IN') : blog.createdAt.toLocaleDateString('en-IN')}
                  </p>
                  <h2 className="mt-2 text-lg font-bold leading-snug text-stone-900">{blog.title}</h2>
                </Link>
              )) : (
                <p className="text-sm text-stone-500">Featured blog posts will appear here once published.</p>
              )}
            </div>
          </div>
        </div>

        {blogs.length === 0 ? (
          <div className="mt-14 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <h2 className="text-2xl font-bold text-stone-900">No published blogs yet</h2>
            <p className="mt-3 text-stone-500">Publish your first article from the admin panel to populate this section.</p>
          </div>
        ) : (
          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {blogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} />
            ))}
          </div>
        )}

        <div className="mt-16 rounded-[2rem] bg-stone-900 px-6 py-8 text-white sm:px-8 lg:flex lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">Need custom packaging help?</p>
            <h2 className="mt-2 text-2xl font-black">Talk to our team about sourcing and customization.</h2>
          </div>
          <Link
            href="/contact#quote"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-400 lg:mt-0"
          >
            Request A Quote
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
