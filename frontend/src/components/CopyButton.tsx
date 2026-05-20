'use client';

import { useState } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ value, label = 'Copy', className = 'btn btn-ghost btn-sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? 'Copied' : label}
    </button>
  );
}
