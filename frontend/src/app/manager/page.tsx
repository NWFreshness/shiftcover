'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ScheduleGrid from '@/components/ScheduleGrid';
import CoverageToggle from '@/components/CoverageToggle';
import ShiftModal from '@/components/ShiftModal';
import TopBar from '@/components/TopBar';
import { apiFetch, getToken, isManager, MANAGER_ONBOARDING_SKIP_KEY } from '@/lib/auth';

interface ShiftFormData {
  date: string;
  startTime: string;
  endTime: string;
  role: string;
  site: string;
  assignedEmployeeId: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
}

interface Stats {
  total: number;
  filled: number;
  open: number;
  staleOpen: number;
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, filled: 0, open: 0, staleOpen: 0 });
  const [status, setStatus] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const loadData = useCallback(async () => {
    const [statsRes, empRes] = await Promise.all([
      apiFetch('/api/coverage/stats'),
      apiFetch('/api/employees'),
    ]);
    if (statsRes.ok) setStats(await statsRes.json());
    if (empRes.ok) setEmployees((await empRes.json()).employees || []);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    if (!isManager()) {
      router.replace('/board');
      return;
    }
    const load = async () => {
      const skippedOnboarding = localStorage.getItem(MANAGER_ONBOARDING_SKIP_KEY) === '1';
      if (!skippedOnboarding) {
        const onboardingRes = await apiFetch('/api/onboarding/status');
        if (onboardingRes.ok) {
          const onboarding = await onboardingRes.json();
          if (!onboarding.completedAt) {
            router.replace('/manager/onboarding');
            return;
          }
        }
      }
      await loadData();
    };
    load();
  }, [router, loadData]);

  const handleCheckUncovered = async () => {
    const res = await apiFetch('/api/coverage/check-uncovered', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setStatus(
        data.shiftsAlerted > 0
          ? `Alerted managers about ${data.shiftsAlerted} uncovered shift(s)`
          : 'No long-uncovered shifts to alert',
      );
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const handlePublishWeek = async () => {
    setPublishing(true);
    try {
      const res = await apiFetch('/api/default-shifts/publish-week', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const weekDate = new Date(data.weekStart + 'T00:00:00').toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
        });
        setStatus(
          data.created > 0
            ? `Published ${data.created} shift${data.created === 1 ? '' : 's'} for the week of ${weekDate}`
            : 'All shifts for next week already exist',
        );
        setTimeout(() => setStatus(null), 5000);
        await loadData();
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleAddShift = async (data: ShiftFormData) => {
    const res = await apiFetch('/api/shifts', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        assignedEmployeeId: data.assignedEmployeeId || undefined,
      }),
    });
    if (res.ok) {
      setModalOpen(false);
      loadData();
    }
  };

  const coverage = stats.total > 0 ? Math.round((stats.filled / stats.total) * 100) : 0;

  return (
    <>
      <TopBar>
        <Link href="/manager/employees" className="btn btn-ghost btn-sm">
          Team
        </Link>
        <Link href="/manager/swaps" className="btn btn-ghost btn-sm">
          Swaps
        </Link>
        <Link href="/manager/settings" className="btn btn-ghost btn-sm">
          Settings
        </Link>
      </TopBar>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-rise">
          <div>
            <span className="label-stamp">Manager · Schedule</span>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
              This Week
            </h1>
            <p className="mt-1 font-mono text-xs text-ink-soft">
              Week of {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCheckUncovered} className="btn btn-ghost btn-sm">
              Check Uncovered
            </button>
            <button onClick={handlePublishWeek} disabled={publishing} className="btn btn-ghost btn-sm">
              {publishing ? 'Publishing…' : 'Publish Week'}
            </button>
            <button onClick={() => setModalOpen(true)} className="btn btn-primary btn-sm">
              <span className="text-base leading-none">+</span> Add Shift
            </button>
          </div>
        </div>

        {status && (
          <div className="banner banner-info mb-4 animate-rise">{status}</div>
        )}

        {/* Coverage stats */}
        <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
          <StatCard label="Total Shifts" value={stats.total} tone="ink" delay={0.05} />
          <StatCard label="Filled" value={stats.filled} tone="sage" delay={0.1} />
          <StatCard label="Open" value={stats.open} tone="marigold" delay={0.15} />
        </div>

        {/* Coverage meter */}
        <div className="card mb-6 animate-rise p-4" style={{ animationDelay: '0.18s' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="label-stamp">Coverage</span>
            <span className="font-mono text-sm font-semibold text-ink">{coverage}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunk ring-1 ring-line">
            <div
              className="h-full rounded-full bg-pine transition-all duration-700"
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>

        {stats.staleOpen > 0 && (
          <div className="banner banner-error mb-6 flex items-center justify-between animate-rise">
            <span>
              {stats.staleOpen} shift{stats.staleOpen === 1 ? '' : 's'} open for over 4h
            </span>
            <button onClick={handleCheckUncovered} className="btn btn-danger btn-sm ml-4 shrink-0">
              Alert Managers
            </button>
          </div>
        )}

        <div className="animate-rise" style={{ animationDelay: '0.22s' }}>
          <CoverageToggle />
        </div>

        <div className="mt-6 animate-rise" style={{ animationDelay: '0.26s' }}>
          <ScheduleGrid />
        </div>
      </div>

      <ShiftModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddShift}
        employees={employees}
      />
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
  delay,
}: {
  label: string;
  value: number;
  tone: 'ink' | 'sage' | 'marigold';
  delay: number;
}) {
  const color =
    tone === 'sage' ? 'text-sage' : tone === 'marigold' ? 'text-marigold' : 'text-ink';
  const accent =
    tone === 'sage' ? 'bg-sage' : tone === 'marigold' ? 'bg-marigold' : 'bg-ink/40';
  return (
    <div className="card relative animate-rise overflow-hidden p-4" style={{ animationDelay: `${delay}s` }}>
      <span className={`absolute left-0 top-0 h-full w-1 ${accent}`} />
      <div className={`font-mono text-3xl font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="label-stamp mt-1">{label}</div>
    </div>
  );
}
