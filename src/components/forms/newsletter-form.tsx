'use client';

import { Button } from '@/components/ui/button';
import { useApiForm } from '@/hooks/use-api-form';

export function NewsletterForm() {
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/newsletter',
    { successMessage: 'You are on the list. Watch your inbox.' },
  );

  return (
    <form onSubmit={submit} className="w-full" noValidate>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(fieldErrors.email) || undefined}
          className="h-11 flex-1 rounded-field border border-border bg-input px-3.5 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25"
        />
        {/* Honeypot — hidden from humans, tempting to bots. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute h-0 w-0 opacity-0"
        />
        <Button type="submit" loading={loading} className="sm:w-auto">
          Subscribe
        </Button>
      </div>
      {(error ?? fieldErrors.email?.[0]) && (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error ?? fieldErrors.email?.[0]}
        </p>
      )}
      {success && (
        <p role="status" className="mt-2 text-xs font-medium text-success">
          {success}
        </p>
      )}
    </form>
  );
}
