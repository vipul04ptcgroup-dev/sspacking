'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import BlogForm from '@/components/admin/BlogForm';
import { Spinner } from '@/components/ui';
import { getBlogPostById, updateBlogPost } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import type { BlogPost } from '@/types';

type BlogPayload = Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>;

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBlogPostById(id).then((data) => {
      setBlog(data);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (data: BlogPayload) => {
    await updateBlogPost(
      id,
      {
        ...data,
        createdBy: blog?.createdBy || user?.email || user?.uid || 'admin',
      },
      user?.email || user?.uid || 'admin',
    );
    toast.success('Blog updated.');
    router.push('/admin/blogs', { scroll: true });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  if (!blog) {
    return <div className="py-20 text-center text-stone-400">Blog not found</div>;
  }

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/admin/blogs" className="hover:text-amber-600">Blogs</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-stone-900">{blog.title}</span>
      </nav>
      <h1 className="mb-8 text-3xl font-black text-stone-900">Edit Blog</h1>
      <BlogForm initialData={blog} onSubmit={handleSubmit} />
    </div>
  );
}
