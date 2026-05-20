'use client';

import CopyButton from './CopyButton';

interface InviteCardProps {
  code?: string | null;
  smsEnabled?: boolean;
  sent?: boolean;
  message?: string | null;
  onTextInvite?: () => Promise<void> | void;
}

export default function InviteCard({ code, smsEnabled = false, sent, message, onTextInvite }: InviteCardProps) {
  if (!code) return null;
  return (
    <div className="rounded-2xl border border-marigold/45 bg-marigold/10 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="label-stamp">Invite code</p>
          <p className="font-mono text-2xl font-semibold tracking-[0.18em] text-ink">{code}</p>
          <p className="mt-1 text-xs text-ink-soft">Share this code with the employee so they can sign in.</p>
        </div>
        <div className="flex gap-2">
          <CopyButton value={code} />
          {smsEnabled && onTextInvite && (
            <button type="button" onClick={onTextInvite} className="btn btn-accent btn-sm">Text invite</button>
          )}
        </div>
      </div>
      {sent !== undefined && <p className="mt-2 text-xs text-ink-soft">{sent ? 'Text sent.' : 'Text not sent; copy the code manually.'}</p>}
      {message && <p className="mt-2 text-xs text-ink-soft">{message}</p>}
    </div>
  );
}
