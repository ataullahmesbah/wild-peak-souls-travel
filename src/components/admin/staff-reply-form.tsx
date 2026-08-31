'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Checkbox, FormMessage, Select, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

const STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;

export function StaffReplyForm({
  tokenId,
  currentStatus,
}: {
  tokenId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [internal, setInternal] = React.useState(false);
  const [statusSaving, setStatusSaving] = React.useState(false);

  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/support/messages',
    {
      successMessage: internal
        ? 'Internal note saved. The customer cannot see it.'
        : 'Reply sent to the customer.',
    },
  );

  const updateStatus = async (status: string) => {
    if (status === currentStatus) return;
    setStatusSaving(true);
    await fetch('/api/dashboard/support/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenId, status }),
    }).catch(() => undefined);
    setStatusSaving(false);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <input type="hidden" name="tokenId" value={tokenId} />

        <Textarea
          label={internal ? 'Internal note' : 'Reply to customer'}
          name="body"
          required
          rows={4}
          placeholder={
            internal
              ? 'Context for colleagues — never shown to the customer.'
              : 'Type your reply…'
          }
          error={fieldErrors.body}
        />

        <Checkbox
          name="internal"
          checked={internal}
          onChange={(e) => setInternal(e.target.checked)}
          label="Save as an internal note (hidden from the customer)"
        />

        {error && <FormMessage tone="error">{error}</FormMessage>}
        {success && <FormMessage tone="success">{success}</FormMessage>}

        <Button type="submit" loading={loading}>
          {internal ? 'Save internal note' : 'Send reply'}
        </Button>
      </form>

      <div className="border-t border-border pt-4">
        <Select
          label="Token status"
          name="status"
          defaultValue={currentStatus}
          disabled={statusSaving}
          onChange={(e) => void updateStatus(e.target.value)}
          hint="Changing this notifies the customer."
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, ' ').toLowerCase()}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
