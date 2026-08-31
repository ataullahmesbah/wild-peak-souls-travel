'use client';

import { Button } from '@/components/ui/button';
import { FormMessage, Input, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function ContactForm({
  defaults,
}: {
  defaults: { name: string; email: string; phone: string } | null;
}) {
  const { loading, error, success, fieldErrors, submit } = useApiForm('/api/contact', {
    successMessage:
      'Thank you — your message is with our team. We reply within one business day.',
  });

  return (
    <form onSubmit={submit} className="wps-card p-6 sm:p-8" noValidate>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Name"
            name="name"
            required
            autoComplete="name"
            defaultValue={defaults?.name}
            error={fieldErrors.name}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={defaults?.email}
            error={fieldErrors.email}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            defaultValue={defaults?.phone}
            error={fieldErrors.phone}
          />
          <Input label="Subject" name="subject" error={fieldErrors.subject} />
        </div>
        <Textarea
          label="How can we help?"
          name="description"
          required
          rows={6}
          error={fieldErrors.description}
        />

        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute h-0 w-0 opacity-0"
        />

        {error && <FormMessage tone="error">{error}</FormMessage>}
        {success && <FormMessage tone="success">{success}</FormMessage>}

        <Button type="submit" size="lg" loading={loading}>
          Send message
        </Button>
      </div>
    </form>
  );
}
