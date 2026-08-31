'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/field';
import { Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

/**
 * The working panel on a lead detail page: move the status, take ownership,
 * record what was said, and — where the lead can be quoted — the number quoted.
 *
 * Status and notes save together in one request. Splitting them into two
 * controls invites the half-saved state where someone marks a lead "contacted"
 * and loses the note explaining what was agreed.
 */
export function LeadWorkspace({
  endpoint,
  id,
  currentStatus,
  statuses,
  staffNotes,
  quotedAmount,
  assignedToName,
  assignedToMe,
  showQuote = false,
  showNotes = true,
}: {
  endpoint: string;
  id: string;
  currentStatus: string;
  statuses: string[];
  staffNotes?: string | null;
  quotedAmount?: number | null;
  assignedToName?: string | null;
  assignedToMe?: boolean;
  showQuote?: boolean;
  showNotes?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const takeOwnership = form.get('assignToMe') === 'on';

    const payload: Record<string, unknown> = {
      requestId: id,
      status: form.get('status'),
      assignToMe: takeOwnership,
      // Unticking the box hands the lead back, rather than silently keeping
      // whoever happened to open it as the owner.
      unassign: assignedToMe && !takeOwnership,
    };
    if (showNotes) payload.staffNotes = String(form.get('staffNotes') ?? '');
    if (showQuote) {
      const quote = String(form.get('quotedAmount') ?? '').trim();
      payload.quotedAmount = quote === '' ? null : Number(quote);
    }

    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(body.error ?? 'That could not be saved.');
        return;
      }
      toast.success('Lead updated.');
      router.refresh();
    } catch {
      toast.error('We could not reach the server. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <Select name="status" label="Status" defaultValue={currentStatus} required>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
          </option>
        ))}
      </Select>

      {showQuote && (
        <Input
          name="quotedAmount"
          label="Quoted amount (BDT)"
          type="number"
          min={0}
          step="0.01"
          defaultValue={quotedAmount ?? undefined}
          hint="Leave blank until a price has actually been agreed."
        />
      )}

      {showNotes && (
        <Textarea
          name="staffNotes"
          label="Internal notes"
          rows={6}
          defaultValue={staffNotes ?? undefined}
          hint="Only staff see these. Record what was said and what happens next."
        />
      )}

      <div className="flex items-start gap-2.5">
        <input
          id="assignToMe"
          name="assignToMe"
          type="checkbox"
          defaultChecked={assignedToMe}
          className="mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-border text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
        <label htmlFor="assignToMe" className="text-sm leading-snug">
          Assign this lead to me
          {assignedToName && !assignedToMe && (
            <span className="block text-xs text-muted-foreground">
              Currently owned by {assignedToName}.
            </span>
          )}
        </label>
      </div>

      <Button type="submit" loading={saving} className="w-full">
        Save changes
      </Button>
    </form>
  );
}
