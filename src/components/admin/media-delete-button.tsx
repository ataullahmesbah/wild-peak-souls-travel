'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

/**
 * Deletes an image from Cloudinary as well as the database.
 *
 * The button is only offered on files nothing points at; the server enforces
 * the same rule, so an image that gets attached between page load and click is
 * refused there rather than breaking a live page.
 */
export function MediaDeleteButton({
  id,
  label,
  usageCount,
}: {
  id: string;
  label: string;
  usageCount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  if (usageCount > 0) {
    return (
      <span className="text-xs text-muted-foreground">
        Used in {usageCount} place{usageCount === 1 ? '' : 's'}
      </span>
    );
  }

  async function remove() {
    setDeleting(true);
    try {
      const response = await fetch(`/api/dashboard/media/${id}`, { method: 'DELETE' });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { removedRemotely?: boolean };
      };
      if (!response.ok) {
        toast.error(body.error ?? 'That image could not be deleted.');
        return;
      }
      toast.success(
        body.data?.removedRemotely
          ? 'Deleted from Cloudinary and the library.'
          : 'Removed from the library.',
      );
      setConfirming(false);
      router.refresh();
    } catch {
      toast.error('We could not reach the server. Check your connection.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="relative inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Delete
      </button>

      <ConfirmDialog
        open={confirming}
        title={`Delete ${label}?`}
        description="Nothing on the site uses this image. It will be removed from Cloudinary as well as the library, which frees the storage it was using. This cannot be undone."
        confirmLabel="Delete permanently"
        destructive
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
