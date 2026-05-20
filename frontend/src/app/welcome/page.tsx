'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Brand from '@/components/Brand';
import { apiFetch, getToken, isManager, normalizePhone } from '@/lib/auth';

interface EmployeeProfile {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: string;
  onboardedAt?: string | null;
}

interface AvailabilityChoice {
  date: string;
  available: boolean | null;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function displayDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function nextSevenDays(): AvailabilityChoice[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return { date: isoDate(date), available: null };
  });
}

export default function WelcomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [availability, setAvailability] = useState<AvailabilityChoice[]>(() => nextSevenDays());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => availability.filter((day) => day.available !== null).length,
    [availability],
  );

  const loadProfile = useCallback(async () => {
    const res = await apiFetch('/api/employees/me');
    if (!res.ok) {
      setError('Could not load your profile');
      return;
    }
    const data = await res.json();
    const employee = data.employee as EmployeeProfile;
    setProfile(employee);
    setName(employee.name || '');
    setPhone(employee.phone || '');
    setEmail(employee.email || '');
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    if (isManager()) {
      router.replace('/manager');
      return;
    }
    loadProfile().finally(() => setLoading(false));
  }, [loadProfile, router]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const normalizedPhone = normalizePhone(phone);
      const res = await apiFetch('/api/employees/me', {
        method: 'PUT',
        body: JSON.stringify({ name, phone: normalizedPhone, email: email || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Could not save your profile');
        return;
      }
      setPhone(normalizedPhone);
      setStep(2);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const chooseAvailability = (date: string, available: boolean) => {
    setAvailability((days) => days.map((day) => (day.date === date ? { ...day, available } : day)));
  };

  const finish = async (skipAvailability = false) => {
    setSaving(true);
    setError(null);
    try {
      if (!skipAvailability) {
        const choices = availability.filter((day) => day.available !== null);
        await Promise.all(
          choices.map((day) =>
            apiFetch('/api/availability', {
              method: 'PUT',
              body: JSON.stringify({ date: day.date, available: day.available }),
            }).then(async (res) => {
              if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Could not save ${day.date}`);
              }
            }),
          ),
        );
      }

      const onboardedRes = await apiFetch('/api/employees/me/onboarded', { method: 'POST' });
      if (!onboardedRes.ok) {
        const data = await onboardedRes.json();
        setError(data.error || 'Could not finish welcome setup');
        return;
      }
      router.replace('/board');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-10">
        <div className="card p-6 text-sm text-ink-soft">Loading your timecard…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl animate-rise">
        <div className="mb-7 flex flex-col items-center text-center">
          <Brand size={40} />
          <span className="label-stamp mt-5">Employee welcome</span>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Let&apos;s stamp your first card
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink-soft">
            Confirm your contact details, then mark the days your manager should know about this week.
          </p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className={`rounded-2xl border p-3 ${step === 1 ? 'border-pine bg-pine text-paper' : 'border-line bg-surface'}`}>
            <span className="block font-display font-bold">1 Profile</span>
            <span className={`chip mt-2 ${step > 1 ? 'chip-filled' : 'chip-neutral'}`}>{step > 1 ? 'Saved' : 'Open'}</span>
          </div>
          <div className={`rounded-2xl border p-3 ${step === 2 ? 'border-pine bg-pine text-paper' : 'border-line bg-surface'}`}>
            <span className="block font-display font-bold">2 Availability</span>
            <span className="chip chip-neutral mt-2">Optional</span>
          </div>
        </div>

        {error && <div className="banner banner-error mb-4">{error}</div>}

        {step === 1 ? (
          <form onSubmit={saveProfile} className="card space-y-5 p-6">
            <div>
              <span className="label-stamp">Confirm details</span>
              <h2 className="font-display text-2xl font-bold text-ink">Your manager has you as {profile?.role || 'team member'}</h2>
              <p className="mt-1 text-sm text-ink-soft">Keep this accurate so shift alerts and coverage requests reach you.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="employee-name" className="field-label">Name</label>
                <input id="employee-name" value={name} onChange={(e) => setName(e.target.value)} className="field" required />
              </div>
              <div>
                <label htmlFor="employee-phone" className="field-label">Mobile phone</label>
                <input
                  id="employee-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setPhone(normalizePhone(phone))}
                  className="field font-mono"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="employee-email" className="field-label">Email</label>
                <input id="employee-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="Optional" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Saving…' : 'Save and continue'}</button>
            </div>
          </form>
        ) : (
          <div className="card space-y-5 p-6">
            <div>
              <span className="label-stamp">Next 7 days</span>
              <h2 className="font-display text-2xl font-bold text-ink">Mark availability</h2>
              <p className="mt-1 text-sm text-ink-soft">Tap only the dates you know. You can skip this and update availability later.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {availability.map((day) => (
                <div key={day.date} className="rounded-2xl border border-line bg-paper p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-semibold text-ink">{displayDate(day.date)}</span>
                    <span className={`chip ${day.available === true ? 'chip-filled' : day.available === false ? 'chip-danger' : 'chip-neutral'}`}>
                      {day.available === true ? 'Available' : day.available === false ? 'Unavailable' : 'Unset'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => chooseAvailability(day.date, true)} className="btn btn-primary btn-sm">Available</button>
                    <button type="button" onClick={() => chooseAvailability(day.date, false)} className="btn btn-danger btn-sm">Unavailable</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="banner banner-info">
              {selectedCount === 0 ? 'No dates selected yet.' : `${selectedCount} date${selectedCount === 1 ? '' : 's'} ready to save.`}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">Back</button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => finish(true)} disabled={saving} className="btn btn-ghost">Skip for now</button>
                <button type="button" onClick={() => finish(false)} disabled={saving} className="btn btn-accent">
                  {saving ? 'Finishing…' : 'Save availability and open board'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
