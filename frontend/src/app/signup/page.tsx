'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Brand from '@/components/Brand';
import CopyButton from '@/components/CopyButton';
import { normalizePhone, register, saveSession } from '@/lib/auth';

const industries = [
  'Food & Beverage',
  'Cleaning & Janitorial',
  'Hospitality',
  'Retail',
  'Healthcare support',
  'Field service',
];

export default function SignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [industryType, setIndustryType] = useState(industries[0]);
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const normalizedPhone = normalizePhone(phone);
      const data = await register({ businessName, industryType, managerName, phone: normalizedPhone });
      saveSession(data.token, data.isManager, data.employeeId);
      setPhone(normalizedPhone);
      setInviteCode(data.inviteCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-2xl animate-rise">
        <div className="mb-7 flex flex-col items-center text-center">
          <Brand size={40} />
          <p className="mt-3 max-w-lg text-sm text-ink-soft">
            Start with your business, then we&apos;ll walk you through shifts, people, and rules.
          </p>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface-sunk px-5 py-2.5">
            <span className="label-stamp">New business · Setup</span>
            <span className="font-mono text-xs text-ink-faint">Owner timecard</span>
          </div>

          {inviteCode ? (
            <div className="space-y-5 p-6">
              <div className="banner banner-success">
                Your manager access code is ready. Save it somewhere safe — it is how you sign back in.
              </div>
              <div className="rounded-2xl border border-line bg-paper p-5 text-center">
                <p className="label-stamp mb-2">Manager invite code</p>
                <p className="font-mono text-5xl font-semibold tracking-[0.24em] text-pine">{inviteCode}</p>
                <div className="mt-4 flex justify-center">
                  <CopyButton value={inviteCode} label="Copy code" />
                </div>
              </div>
              <button onClick={() => router.replace('/manager/onboarding')} className="btn btn-primary w-full">
                Continue to setup
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5 p-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="businessName" className="field-label">Business name</label>
                <input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="field" required />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="industryType" className="field-label">Industry</label>
                <select id="industryType" value={industryType} onChange={(e) => setIndustryType(e.target.value)} className="field">
                  {industries.map((industry) => <option key={industry}>{industry}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="managerName" className="field-label">Your name</label>
                <input id="managerName" value={managerName} onChange={(e) => setManagerName(e.target.value)} className="field" required />
              </div>

              <div>
                <label htmlFor="phone" className="field-label">Mobile phone</label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setPhone(normalizePhone(phone))}
                  placeholder="(555) 123-4567"
                  className="field font-mono"
                  required
                />
                <p className="mt-1 text-xs text-ink-faint">US numbers are normalized to +1 format.</p>
              </div>

              {error && <p className="banner banner-error sm:col-span-2">{error}</p>}

              <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/login" className="btn btn-ghost">I already have a code</Link>
                <button type="submit" disabled={loading} className="btn btn-accent">
                  {loading ? 'Creating…' : 'Create business'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
