// src/components/admin/refresh-schedules-button.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

/**
 * Refreshes transport schedules on demand.
 *
 * The same work a nightly job does, available to press. Useful when a timetable
 * changes mid-week and nobody wants to wait for the next scheduled run.
 */
export function RefreshSchedulesButton({ kind }: { kind: 'flights' | 'trains' }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function refresh() {
    setBusy(true);
    try {
      const response = await fetch('/api/dashboard/transport/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { checked: number; updated: number; created: number };
      };

      if (!response.ok) {
        toast.error(body.error ?? 'The refresh could not run.');
        return;
      }

      const { checked = 0, updated = 0, created = 0 } = body.data ?? {};

      if (kind === 'trains') {
        toast.success(
          `${updated} schedule${updated === 1 ? '' : 's'} marked as confirmed today.`,
        );
      } else if (updated === 0 && created === 0) {
        toast.info(
          `Checked ${checked} flight${checked === 1 ? '' : 's'}; nothing had changed.`,
        );
      } else {
        toast.success(
          `${updated} updated${created > 0 ? `, ${created} new route${created === 1 ? '' : 's'} added as inactive for review` : ''}.`,
        );
      }
      router.refresh();
    } catch {
      toast.error('We could not reach the server. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={busy}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-field border border-border bg-card px-3.5 text-sm font-medium',
        'transition-colors hover:bg-muted disabled:opacity-60',
      )}
    >
      <RefreshCw className={cn('h-4 w-4', busy && 'animate-spin')} aria-hidden="true" />
      {busy
        ? 'Refreshing…'
        : kind === 'flights'
          ? 'Refresh from airline feed'
          : 'Mark schedules confirmed'}
    </button>
  );
}
