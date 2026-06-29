'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import BlogForm from '@/components/admin/BlogForm';
import { createBlogPost } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import type { BlogPost } from '@/types';

type BlogPayload = Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>;

export default function NewBlogPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (data: BlogPayload) => {
    await createBlogPost(
      {
        ...data,
        createdBy: user?.email || user?.uid || 'admin',
      },
      user?.email || user?.uid || 'admin',
    );
    toast.success('Blog created.');
    router.push('/admin/blogs', { scroll: true });
  };

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/admin/blogs" className="hover:text-amber-600">Blogs</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-stone-900">New Blog</span>
      </nav>
      <h1 className="mb-8 text-3xl font-black text-stone-900">Create Blog</h1>
      <BlogForm onSubmit={handleSubmit} />
    </div>
  );
}
