'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EmployeeManager from '@/components/EmployeeManager';
import TopBar from '@/components/TopBar';
import { getToken, isManager } from '@/lib/auth';

export default function EmployeesPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    if (!isManager()) {
      router.replace('/board');
    }
  }, [router]);

  return (
    <>
      <TopBar>
        <Link href="/manager" className="btn btn-ghost btn-sm">← Schedule</Link>
      </TopBar>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 animate-rise">
          <span className="label-stamp">Manager · Team</span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">Employees</h1>
          <p className="mt-1 text-sm text-ink-soft">Add staff, update contact details, and share invite codes.</p>
        </div>
        <EmployeeManager />
      </div>
    </>
  );
}
