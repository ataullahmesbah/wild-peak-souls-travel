// src/components/admin/comment-moderation-form.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormMessage, Input } from '@/components/ui/field';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useApiForm } from '@/hooks/use-api-form';
import { useToast } from '@/components/ui/toast';

/**
 * Approve, reject, re-queue or delete one comment.
 *
 * Approve and reject are the everyday actions and are one click. Delete is
 * behind a confirmation because it is the only irreversible one — rejecting
 * keeps the row, so a decision can always be revisited.
 */
export function CommentModerationForm({
  commentId,
  currentStatus,
  canDelete,
}: {
  commentId: string;
  currentStatus: string;
  canDelete: boolean;
}) {
  const [status, setStatus] = React.useState(currentStatus);
  const [deleting, setDeleting] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const router = useRouter();
  const toast = useToast();

  const { loading, error, success, submit } = useApiForm(
    '/api/dashboard/blog/comments/moderate',
    { resetForm: false, successMessage: 'Comment updated.' },
  );

  async function remove() {
    setDeleting(true);
    try {
      const response = await fetch('/api/dashboard/blog/comments/moderate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, status: 'REJECTED' }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(body.error ?? 'The comment could not be deleted.');
        return;
      }
      toast.success('Comment deleted.');
      setConfirming(false);
      router.refresh();
    } catch {
      toast.error('The comment could not be deleted. Check your connection.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <input type="hidden" name="commentId" value={commentId} />
      <input type="hidden" name="status" value={status} />

      <Input
        label="Moderation note"
        name="note"
        placeholder="Optional — why this decision was made."
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          loading={loading && status === 'APPROVED'}
          onClick={() => setStatus('APPROVED')}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Approve
        </Button>
        <Button
          type="submit"
          size="sm"
          variant="destructive"
          loading={loading && status === 'REJECTED'}
          onClick={() => setStatus('REJECTED')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Reject
        </Button>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          loading={loading && status === 'PENDING'}
          onClick={() => setStatus('PENDING')}
        >
          <Clock className="h-4 w-4" aria-hidden="true" />
          Back to pending
        </Button>
        {canDelete && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            loading={deleting}
            onClick={() => setConfirming(true)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete this comment?"
        description="It is removed permanently, along with any replies to it. Rejecting instead keeps it out of sight but recoverable."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </form>
  );
}
