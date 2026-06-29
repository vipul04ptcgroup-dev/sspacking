'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { deleteBlogPost, getAllBlogPosts } from '@/lib/firestore';
import { formatDate, truncate } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import type { BlogPost } from '@/types';
import Button from '@/components/ui/Button';
import { Badge, EmptyState, Spinner } from '@/components/ui';
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminBlogsPage() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setBlogs(await getAllBlogPosts());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredBlogs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return blogs;
    return blogs.filter((blog) =>
      blog.title.toLowerCase().includes(term) ||
      blog.slug.toLowerCase().includes(term) ||
      blog.excerpt.toLowerCase().includes(term) ||
      blog.tags.some((tag) => tag.toLowerCase().includes(term)),
    );
  }, [blogs, search]);

  const handleDelete = async (blog: BlogPost) => {
    if (!window.confirm(`Delete blog "${blog.title}"?`)) return;

    setDeletingId(blog.id);
    try {
      await deleteBlogPost(blog.id, user?.email || user?.uid || 'admin');
      setBlogs((current) => current.filter((item) => item.id !== blog.id));
      toast.success('Blog deleted.');
    } catch {
      toast.error('Blog delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Blogs</h1>
          <p className="mt-1 text-stone-500">Create, publish, edit, and remove blog articles from the public website.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search blogs..."
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <Link href="/admin/blogs/new">
            <Button>
              <Plus className="h-4 w-4" />
              Add Blog
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filteredBlogs.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-16 w-16" />}
          title={blogs.length === 0 ? 'No blogs yet' : 'No blogs match your search'}
          description={
            blogs.length === 0
              ? 'Create your first article for the public blog section.'
              : 'Try another title, slug, or tag.'
          }
          action={
            blogs.length === 0 ? (
              <Link href="/admin/blogs/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Blog
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Slug</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Published</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Tags</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredBlogs.map((blog) => (
                  <tr key={blog.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{blog.title}</p>
                        <p className="mt-1 text-xs text-stone-500">{truncate(blog.excerpt, 90)}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-mono text-stone-500">{blog.slug}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <Badge variant={blog.published ? 'success' : 'warning'}>
                          {blog.published ? 'Published' : 'Draft'}
                        </Badge>
                        {blog.featured ? <Badge variant="info">Featured</Badge> : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">
                      {blog.publishedAt ? formatDate(blog.publishedAt) : '-'}
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">
                      {blog.tags.length > 0 ? truncate(blog.tags.join(', '), 50) : '-'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/blogs/${blog.slug}`}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                          target="_blank"
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/blogs/${blog.id}`}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-amber-50 hover:text-amber-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(blog)}
                          disabled={deletingId === blog.id}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
