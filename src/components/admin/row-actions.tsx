'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';

/**
 * Edit and delete for one row of a catalogue list.
 *
 * Delete always goes through a confirmation naming the record, and the result
 * is reported honestly: the API archives rather than destroys anything another
 * record still depends on, and when it does the toast says so instead of
 * claiming a deletion that did not happen.
 */
export function RowActions({
  editHref,
  deleteEndpoint,
  label,
  canDelete = true,
  previewHref,
}: {
  editHref: string;
  deleteEndpoint?: string;
  label: string;
  canDelete?: boolean;
  previewHref?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    if (!deleteEndpoint) return;
    setDeleting(true);
    try {
      const response = await fetch(deleteEndpoint, { method: 'DELETE' });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { archived?: boolean; reason?: string };
      };

      if (!response.ok) {
        toast.error(body.error ?? 'That could not be deleted.');
        return;
      }

      if (body.data?.archived) {
        toast.warning(
          `${label} was archived rather than deleted — ${body.data.reason}. It is hidden from the public site but its history is intact.`,
        );
      } else {
        toast.success(`${label} deleted.`);
      }
      setConfirming(false);
      router.refresh();
    } catch {
      toast.error('We could not reach the server. Check your connection.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {previewHref && (
        <Link
          href={previewHref}
          target="_blank"
          className="rounded-field px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Preview
        </Link>
      )}
      <Link
        href={editHref}
        className="flex items-center gap-1.5 rounded-field px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-muted"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Edit
      </Link>
      {canDelete && deleteEndpoint && (
        /*
         * `relative` matters: the visually-hidden label is absolutely
         * positioned, and with no positioned ancestor it anchors to the page
         * instead — which widens the document from inside a scrolling table
         * and gives the whole site a phantom horizontal scrollbar on mobile.
         */
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="relative flex items-center gap-1.5 rounded-field px-2.5 py-1.5 text-sm font-medium text-destructive hover:bg-destructive-soft"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Delete</span>
        </button>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Delete ${label}?`}
        description={
          <>
            This removes it from the public site. If bookings, requests or other
            records still refer to it, it is archived instead of destroyed so
            that history stays intact.
          </>
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
