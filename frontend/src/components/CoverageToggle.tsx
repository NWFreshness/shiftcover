'use client';

import { useState } from 'react';

interface CoverageToggleProps {
  businessId: string;
}

export default function CoverageToggle({ businessId }: CoverageToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [result, setResult] = useState<{ filled: number; message: string } | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (enabled) {
        // Turning off - just update state
        setEnabled(false);
      } else {
        // Turning on - trigger fill-all
        const res = await fetch('/api/coverage/fill-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId }),
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
    <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
      <div>
        <h3 className="font-semibold text-gray-900">Auto Coverage</h3>
        <p className="text-sm text-gray-500 mt-1">
          Automatically fill open shifts with available employees
        </p>
        {lastRun && (
          <p className="text-xs text-gray-400 mt-1">Last run: {lastRun}</p>
        )}
        {result && (
          <p className="text-sm text-green-600 mt-1">{result.message}</p>
        )}
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
