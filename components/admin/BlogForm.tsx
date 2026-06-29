'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { BlogInternalLink, BlogPost } from '@/types';
import { uploadBlogImage } from '@/lib/storage';
import { slugify } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select, Textarea } from '@/components/ui';
import { ExternalLink, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

type BlogFormPayload = Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>;

type BlogFormProps = {
  initialData?: BlogPost;
  onSubmit: (data: BlogFormPayload) => Promise<void>;
};

const emptyInternalLink: BlogInternalLink = {
  label: '',
  href: '',
  type: 'page',
};

const internalLinkOptions = [
  { value: 'page', label: 'Page' },
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
  { value: 'blog', label: 'Blog' },
  { value: 'custom', label: 'Custom' },
];

export default function BlogForm({ initialData, onSubmit }: BlogFormProps) {
  const [slugTouched, setSlugTouched] = useState(Boolean(initialData?.slug));
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<BlogFormPayload>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    excerpt: initialData?.excerpt || '',
    content: initialData?.content || '',
    coverImage: initialData?.coverImage || '',
    tags: initialData?.tags || [],
    published: initialData?.published || false,
    featured: initialData?.featured || false,
    authorName: initialData?.authorName || 'SS Packaging',
    seoTitle: initialData?.seoTitle || '',
    seoDescription: initialData?.seoDescription || '',
    internalLinks: initialData?.internalLinks || [],
    createdBy: initialData?.createdBy || '',
    publishedAt: initialData?.publishedAt || null,
  });
  const [tagsInput, setTagsInput] = useState((initialData?.tags || []).join(', '));

  useEffect(() => {
    if (slugTouched) return;
    setForm((current) => ({ ...current, slug: slugify(current.title) }));
  }, [form.title, slugTouched]);

  const updateInternalLink = (index: number, patch: Partial<BlogInternalLink>) => {
    setForm((current) => ({
      ...current,
      internalLinks: current.internalLinks.map((link, linkIndex) =>
        linkIndex === index ? { ...link, ...patch } : link,
      ),
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const blogRef = initialData?.id || `temp_${Date.now()}`;
      const imageUrl = await uploadBlogImage(file, blogRef);
      setForm((current) => ({ ...current, coverImage: imageUrl }));
      toast.success('Blog cover uploaded.');
    } catch {
      toast.error('Blog cover upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (uploading) {
      toast.error('Please wait for the cover upload to finish.');
      return;
    }
    if (!form.title.trim()) {
      toast.error('Blog title is required.');
      return;
    }
    if (!form.excerpt.trim()) {
      toast.error('Excerpt is required.');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Blog content is required.');
      return;
    }

    const payload: BlogFormPayload = {
      ...form,
      slug: slugify(form.slug || form.title),
      tags: tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      seoTitle: form.seoTitle.trim() || form.title.trim(),
      seoDescription: form.seoDescription.trim() || form.excerpt.trim(),
      internalLinks: form.internalLinks
        .map((link) => ({
          label: link.label.trim(),
          href: link.href.trim(),
          type: link.type,
        }))
        .filter((link) => link.label && link.href),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-stone-900">Content</h2>
          <p className="mt-1 text-sm text-stone-500">Set the headline, summary, body copy, and cover image.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input
            id="blog-title"
            label="Blog Title *"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Packaging trends for 2026"
          />
          <Input
            id="blog-slug"
            label="Slug *"
            value={form.slug}
            onChange={(event) => {
              setSlugTouched(true);
              setForm((current) => ({ ...current, slug: event.target.value }));
            }}
            placeholder="packaging-trends-for-2026"
            helpText="Used in the public blog URL."
          />
          <Textarea
            id="blog-excerpt"
            label="Excerpt *"
            value={form.excerpt}
            onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
            placeholder="Short summary shown on blog cards and SEO previews."
            className="md:col-span-2"
          />
          <Textarea
            id="blog-content"
            label="Blog Content *"
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
            placeholder="Write the article here. Use blank lines to separate paragraphs."
            className="min-h-[260px] md:col-span-2"
          />
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <p className="text-sm font-medium text-stone-700">Cover Image</p>
            <p className="mt-1 text-xs text-stone-500">Upload the main image that appears on blog cards and the detail page.</p>
          </div>
          {form.coverImage ? (
            <div className="group relative h-56 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
              <Image src={form.coverImage} alt={form.title || 'Blog cover'} fill className="object-cover" />
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, coverImage: '' }))}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove cover image"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
            <ImagePlus className="h-4 w-4" />
            <span>{uploading ? 'Uploading...' : form.coverImage ? 'Replace Cover Image' : 'Upload Cover Image'}</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-stone-900">Publishing</h2>
          <p className="mt-1 text-sm text-stone-500">Control visibility, tags, and the author line shown to readers.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Input
            id="blog-author"
            label="Author Name"
            value={form.authorName}
            onChange={(event) => setForm((current) => ({ ...current, authorName: event.target.value }))}
            placeholder="SS Packaging"
          />
          <Input
            id="blog-tags"
            label="Tags"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="packaging, design, bottles"
            helpText="Separate tags with commas."
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => setForm((current) => ({ ...current, published: event.target.checked }))}
              className="h-4 w-4 accent-amber-600"
            />
            Publish on public site
          </label>
          <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => setForm((current) => ({ ...current, featured: event.target.checked }))}
              className="h-4 w-4 accent-amber-600"
            />
            Mark as featured
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-stone-900">SEO</h2>
          <p className="mt-1 text-sm text-stone-500">Override the page title and description used for search and sharing.</p>
        </div>

        <div className="grid gap-5">
          <Input
            id="blog-seo-title"
            label="SEO Title"
            value={form.seoTitle}
            onChange={(event) => setForm((current) => ({ ...current, seoTitle: event.target.value }))}
            placeholder="Defaults to the blog title"
          />
          <Textarea
            id="blog-seo-description"
            label="SEO Description"
            value={form.seoDescription}
            onChange={(event) => setForm((current) => ({ ...current, seoDescription: event.target.value }))}
            placeholder="Defaults to the excerpt"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Internal Links</h2>
            <p className="mt-1 text-sm text-stone-500">
              Add links to products, categories, other blogs, or key pages directly from the blog editor.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setForm((current) => ({
                ...current,
                internalLinks: [...current.internalLinks, { ...emptyInternalLink }],
              }))
            }
          >
            <Plus className="h-4 w-4" />
            Add Link
          </Button>
        </div>

        {form.internalLinks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-500">
            No internal links yet. Add one for routes like `/products`, `/products/cosmetic-bottles`, `/blogs`, or `/contact`.
          </div>
        ) : (
          <div className="space-y-4">
            {form.internalLinks.map((link, index) => (
              <div key={`${link.href}-${index}`} className="rounded-2xl border border-stone-200 p-4">
                <div className="grid gap-4 md:grid-cols-[160px_1fr_1fr_auto] md:items-start">
                  <Select
                    id={`internal-link-type-${index}`}
                    label="Link Type"
                    options={internalLinkOptions}
                    value={link.type}
                    onChange={(event) =>
                      updateInternalLink(index, { type: event.target.value as BlogInternalLink['type'] })
                    }
                  />
                  <Input
                    id={`internal-link-label-${index}`}
                    label="Label"
                    value={link.label}
                    onChange={(event) => updateInternalLink(index, { label: event.target.value })}
                    placeholder="Shop Pump Bottles"
                  />
                  <Input
                    id={`internal-link-href-${index}`}
                    label="Href"
                    value={link.href}
                    onChange={(event) => updateInternalLink(index, { href: event.target.value })}
                    placeholder="/products/pumps-sprayers"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        internalLinks: current.internalLinks.filter((_, linkIndex) => linkIndex !== index),
                      }))
                    }
                    className="mt-6 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove internal link"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {form.slug ? (
          <LinkPreview href={`/blogs/${slugify(form.slug)}`} />
        ) : null}
        <Button type="submit" loading={submitting || uploading}>
          {initialData ? 'Update Blog' : 'Create Blog'}
        </Button>
      </div>
    </form>
  );
}

function LinkPreview({ href }: { href: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-600">
      <ExternalLink className="h-4 w-4 text-amber-600" />
      <span>{href}</span>
    </div>
  );
}
