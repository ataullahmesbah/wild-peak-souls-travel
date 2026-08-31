import type { Prisma } from '@/generated/prisma';

/** Tiny classnames joiner — keeps components free of a clsx dependency. */
export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Prisma Decimal → number, safe for display maths only. */
export function toNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  return Number(value.toString());
}

export function formatCurrency(
  amount: Prisma.Decimal | number | string | null | undefined,
  currency = 'BDT',
): string {
  const value = toNumber(amount);
  try {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function formatDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    ...options,
    timeZone: 'Asia/Dhaka',
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  return formatDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): string {
  if (!start) return '—';
  if (!end) return formatDate(start);
  return `${formatDate(start, { day: 'numeric', month: 'short' })} – ${formatDate(end)}`;
}

/**
 * "12m ago", "in 3d", "just now".
 *
 * Handles future dates properly. The previous version subtracted in one
 * direction only, so a scheduled departure produced a negative difference,
 * fell through the first branch and rendered as "just now" — the one reading
 * that is actively misleading for a date that has not happened.
 */
export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';

  const diffMs = Date.now() - d.getTime();
  const past = diffMs >= 0;
  const minutes = Math.round(Math.abs(diffMs) / 60_000);
  const label = (value: string) => (past ? `${value} ago` : `in ${value}`);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return label(`${minutes}m`);

  const hours = Math.round(minutes / 60);
  if (hours < 24) return label(`${hours}h`);

  const days = Math.round(hours / 24);
  if (days < 30) return label(`${days}d`);

  return formatDate(d);
}

/** "Sunday, 27 September 2026" — the long form used to echo a chosen date. */
export function formatDateLong(date: Date | string | null | undefined): string {
  return formatDate(date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function minutesToDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Splits the newline/comma separated text fields used across the CMS. */
export function toLines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
}

export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function parsePageParam(value: string | undefined, fallback = 1): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 10_000);
}

/** Deterministic booking/invoice/token reference numbers. */
export function referenceNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(5, '0')}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  if (local.length <= 2) return `${local[0] ?? '*'}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}
