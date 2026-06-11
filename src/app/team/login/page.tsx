'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FirebaseError } from 'firebase/app';
import { signOut } from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { auth } from '@/lib/firebase';
import { getTeamMemberProfile } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { Boxes } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

function getTeamLoginErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid team email or password. Use the team login created by admin.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please wait a bit and try again.';
      case 'auth/network-request-failed':
        return 'Network error while signing in. Please check your internet connection.';
      default:
        return error.message || 'Unable to sign in right now.';
    }
  }

  return error instanceof Error ? error.message : 'Invalid team email or password.';
}

function TeamLoginContent() {
  const { user, loading, isAdmin, isTeamMember, login } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (loading) return;
    if (isAdmin) {
      router.push('/admin');
      return;
    }
    if (user && isTeamMember) {
      router.push('/team');
    }
  }, [isAdmin, isTeamMember, loading, router, user]);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      await login(data.email.trim().toLowerCase(), data.password);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Unable to complete sign in.');
      }

      const teamProfile = await getTeamMemberProfile(currentUser.uid);
      if (!teamProfile || !teamProfile.active) {
        await signOut(auth);
        throw new Error('This login is only for active team members.');
      }

      const token = await currentUser.getIdToken();
      await fetch('/api/team/access-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'login' }),
      });

      router.push('/team');
    } catch (error) {
      toast.error(getTeamLoginErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_32%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] px-4 py-20">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 text-white shadow-lg">
            <Boxes className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black text-stone-900">Team Stock Login</h1>
          <p className="mt-2 text-sm text-stone-500">
            Sign in with the team credentials shared by admin to view stock only.
          </p>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-200/60">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="team-email"
              label="Team Email"
              type="email"
              placeholder="team@sspackaging.in"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="team-password"
              label="Password"
              type="password"
              placeholder="Enter assigned password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" loading={submitting} size="lg" className="w-full">
              Sign In To Team Panel
            </Button>
          </form>

          <div className="mt-6 rounded-2xl bg-stone-50 px-4 py-3 text-xs text-stone-500">
            Need access? Ask an admin to create your team member ID and password from the admin panel.
          </div>

          <p className="mt-5 text-center text-sm text-stone-500">
            Back to{' '}
            <Link href="/" className="font-semibold text-amber-600 hover:underline">
              SS Packaging website
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TeamLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-100" />}>
      <TeamLoginContent />
    </Suspense>
  );
}
