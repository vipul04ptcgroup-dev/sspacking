'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Spinner } from '@/components/ui';

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isTeamMember, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/team/login';

  useEffect(() => {
    if (loading) return;
    if (isAdmin) {
      router.push('/admin');
      return;
    }
    if (isLoginPage) {
      if (user && isTeamMember) {
        router.push('/team');
      }
      return;
    }
    if (!user || !isTeamMember) {
      router.push('/team/login');
    }
  }, [isAdmin, isLoginPage, isTeamMember, loading, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isLoginPage) {
    return children;
  }

  if (!user || !isTeamMember) return null;

  return children;
}
