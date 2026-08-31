import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, Compass, Lock, SearchX, ShieldAlert } from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
  tone?: 'neutral' | 'warning' | 'destructive';
}

/**
 * The single empty/error/forbidden presentation used across every data screen,
 * so customers never see a blank panel or a raw server message.
 */
export function StateMessage({
  icon: Icon = Compass,
  title,
  description,
  actionLabel,
  actionHref,
  className,
  tone = 'neutral',
}: StateProps) {
  const toneClasses = {
    neutral: 'bg-primary-soft text-primary',
    warning: 'bg-warning-soft text-warning',
    destructive: 'bg-destructive-soft text-destructive',
  }[tone];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card',
        'border border-dashed border-border bg-card/50 px-6 py-14 text-center',
        className,
      )}
    >
      <div className={cn('flex h-14 w-14 items-center justify-center rounded-full', toneClasses)}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {actionLabel && actionHref && (
        <ButtonLink href={actionHref} className="mt-6" size="sm">
          {actionLabel}
        </ButtonLink>
      )}
    </div>
  );
}

export function EmptyState(props: Omit<StateProps, 'tone'>) {
  return <StateMessage {...props} tone="neutral" />;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this right now. Please try again in a moment.',
  ...props
}: Partial<StateProps>) {
  return (
    <StateMessage
      icon={AlertTriangle}
      title={title}
      description={description}
      tone="destructive"
      {...props}
    />
  );
}

export function NotFoundState({
  title = 'We could not find that page',
  description = 'The link may be broken or the trip may have been archived.',
}: Partial<StateProps>) {
  return (
    <StateMessage
      icon={SearchX}
      title={title}
      description={description}
      actionLabel="Back to home"
      actionHref="/"
      tone="warning"
    />
  );
}

export function ForbiddenState({
  title = 'You do not have access',
  description = 'Your account does not have permission to view this area. Contact an administrator if you believe this is a mistake.',
}: Partial<StateProps>) {
  return (
    <StateMessage
      icon={ShieldAlert}
      title={title}
      description={description}
      actionLabel="Back to dashboard"
      actionHref="/dashboard"
      tone="destructive"
    />
  );
}

export function UnauthorizedState() {
  return (
    <StateMessage
      icon={Lock}
      title="Please sign in"
      description="You need to be signed in to view this page."
      actionLabel="Sign in"
      actionHref="/login"
      tone="warning"
    />
  );
}
