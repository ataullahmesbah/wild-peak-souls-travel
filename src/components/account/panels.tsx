import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('wps-card', className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className="text-sm font-medium text-primary hover:underline"
          >
            {action.label}
          </Link>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatTile({
  icon: Icon,
  label,
  value,
  href,
  tone = 'primary',
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  href?: string;
  tone?: 'primary' | 'warning' | 'success' | 'info';
}) {
  const toneClass = {
    primary: 'bg-primary-soft text-primary',
    warning: 'bg-warning-soft text-warning',
    success: 'bg-success-soft text-success',
    info: 'bg-info-soft text-info',
  }[tone];

  const content = (
    <div className="wps-card flex items-center gap-4 p-5 transition-colors hover:border-primary/30">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', toneClass)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1.5 truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

/** Definition row used across booking and payment detail views. */
export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
