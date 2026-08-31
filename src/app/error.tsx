'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

/**
 * Root error boundary. The digest is shown so a customer can quote it to
 * support; the underlying error message is never rendered, since it can
 * contain internal detail.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[app] unhandled render error', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="max-w-lg text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive-soft text-destructive">
          <AlertTriangle className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-semibold">
          Something went wrong on our side
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This is not your fault. Our team has been notified. Try again, or head
          back and take a different route.
        </p>
        {error.digest && (
          <p className="mt-4 inline-block rounded-full bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-field bg-primary px-6 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-field border border-border px-6 text-sm font-medium hover:bg-muted"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
