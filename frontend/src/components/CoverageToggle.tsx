'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/auth';

export default function CoverageToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [result, setResult] = useState<{ filled: number; message: string } | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (enabled) {
        setEnabled(false);
      } else {
        const res = await apiFetch('/api/coverage/fill-all', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        const data = await res.json();
        setResult({ filled: data.results?.length || 0, message: data.message });
        setLastRun(new Date().toLocaleTimeString());
        setEnabled(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`card flex items-center justify-between gap-4 p-4 transition-colors ${
        enabled ? 'ring-1 ring-pine/40' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
            enabled ? 'bg-pine text-surface' : 'bg-surface-sunk text-ink-soft'
          }`}
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeLinecap="round" opacity="0.5" />
            <circle cx="12" cy="12" r="4.5" />
          </svg>
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-ink">Auto Coverage</h3>
            <span className={`chip ${enabled ? 'chip-filled' : 'chip-neutral'}`}>
              {enabled ? 'On' : 'Off'}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            Automatically fill open shifts with available employees.
          </p>
          {lastRun && <p className="mt-1 font-mono text-xs text-ink-faint">Last run: {lastRun}</p>}
          {result && <p className="mt-1 text-sm font-medium text-sage-ink">{result.message}</p>}
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle auto coverage"
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
          enabled ? 'border-pine-deep bg-pine' : 'border-line-strong bg-surface-sunk'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-surface shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
