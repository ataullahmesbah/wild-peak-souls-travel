import * as React from 'react';

import { cn } from '@/lib/utils';

type Tone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'accent';

const tones: Record<Tone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  destructive: 'bg-destructive-soft text-destructive',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent/12 text-accent',
};

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Maps every workflow status in the product to a consistent colour tone. */
export function statusTone(status: string): Tone {
  switch (status) {
    case 'PUBLISHED':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'PAID':
    case 'APPROVED':
    case 'RESOLVED':
    case 'ACTIVE':
    case 'VERIFIED':
      return 'success';
    case 'PENDING':
    case 'PAYMENT_PENDING':
    case 'PENDING_VERIFICATION':
    case 'DOCUMENTS_REQUESTED':
    case 'NEW':
    case 'DRAFT':
      return 'warning';
    case 'CANCELLED':
    case 'REJECTED':
    case 'FAILED':
    case 'SUSPENDED':
    case 'EXPIRED':
    case 'SOLD_OUT':
      return 'destructive';
    case 'IN_PROGRESS':
    case 'PROCESSING':
    case 'CONTACTED':
    case 'NEGOTIATING':
    case 'QUOTED':
      return 'info';
    case 'REFUNDED':
    case 'ARCHIVED':
    case 'CLOSED':
      return 'neutral';
    default:
      return 'neutral';
  }
}

/** `PAYMENT_PENDING` → `Payment pending` */
export function humanizeStatus(status: string): string {
  const lower = status.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{humanizeStatus(status)}</Badge>;
}
