'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSession } from '@/lib/auth';
import Brand from '@/components/Brand';

export default function Login() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      saveSession(data.token, data.isManager, data.employee?.id);
      if (!data.isManager && data.needsOnboarding) {
        router.push('/welcome');
        return;
      }
      router.push(data.isManager ? '/manager' : '/board');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm animate-rise">
        <div className="mb-7 flex flex-col items-center text-center">
          <Brand size={40} />
          <p className="mt-3 max-w-[16rem] text-sm text-ink-soft">
            Shift coverage that never lets you down.
          </p>
        </div>

        <div className="card overflow-hidden">
          {/* punch strip */}
          <div className="flex items-center justify-between border-b border-line bg-surface-sunk px-5 py-2.5">
            <span className="label-stamp">Time Card · Access</span>
            <span className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink-faint/55" />
              ))}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            <div>
              <label htmlFor="code" className="field-label text-center">
                Enter your 6-digit invite code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="field text-center font-mono text-3xl font-medium tracking-[0.5em] tabular-nums"
              />
            </div>

            {error && (
              <p className="banner banner-error text-center" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="btn btn-accent w-full"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-ink-faint">
          Codes are issued by your manager. New owner?{' '}
          <Link href="/signup" className="font-semibold text-pine underline-offset-4 hover:underline">
            Create a business
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
