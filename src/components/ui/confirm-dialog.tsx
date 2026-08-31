'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';

/**
 * A modal confirmation built on <dialog>, so focus trapping, Escape and the
 * top layer come from the platform rather than from a scroll-lock hack.
 *
 * Destructive confirmations deliberately describe what will happen in plain
 * words — "Delete Saint Martins Island?" rather than "Are you sure?" — because
 * a generic prompt trains people to click through it.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onCancel();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !loading) onCancel();
      }}
      aria-labelledby="confirm-title"
      className="wps-dialog"
    >
      <div className="p-5 sm:p-6">
        <h2 id="confirm-title" className="font-display text-base font-semibold">
          {title}
        </h2>
        {description && (
          <div className="mt-2 text-sm text-muted-foreground">{description}</div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2.5">
          <Button variant="outline" onClick={onCancel} disabled={loading} type="button">
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            type="button"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
