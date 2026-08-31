'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Spinner } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Inline status changer used across every lead table. Posts and refreshes in
 * place so a coordinator can move a queue along without leaving the list.
 */
export function LeadStatusForm({
  endpoint,
  idField,
  id,
  currentStatus,
  statuses,
}: {
  endpoint: string;
  idField: string;
  id: string;
  currentStatus: string;
  statuses: string[];
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const update = async (status: string) => {
    if (status === currentStatus) return;
    setSaving(true);
    setFailed(false);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [idField]: id, status }),
      });
      if (!response.ok) setFailed(true);
      else router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`status-${id}`} className="sr-only">
        Update status
      </label>
      <select
        id={`status-${id}`}
        defaultValue={currentStatus}
        disabled={saving}
        onChange={(e) => void update(e.target.value)}
        className={cn(
          'h-8 rounded-field border bg-input px-2 text-xs focus:border-primary focus:outline-none',
          failed ? 'border-destructive' : 'border-border',
        )}
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status.replace(/_/g, ' ').toLowerCase()}
          </option>
        ))}
      </select>
      {saving && <Spinner className="h-3.5 w-3.5 text-muted-foreground" />}
      {failed && (
        <span role="alert" className="text-xs text-destructive">
          Failed
        </span>
      )}
    </div>
  );
}
