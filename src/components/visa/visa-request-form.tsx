'use client';

import { Button } from '@/components/ui/button';
import { FormMessage, Input, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function VisaRequestForm({
  visaTypeId,
  countryName,
  visaTypeName,
  defaults,
}: {
  visaTypeId: string;
  countryName: string;
  visaTypeName: string;
  defaults: { name: string; email: string; phone: string } | null;
}) {
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/visa/requests',
    {
      successMessage:
        'Request received. A visa specialist will contact you within one business day.',
    },
  );

  return (
    <form onSubmit={submit} className="wps-card p-6" noValidate>
      <input type="hidden" name="visaTypeId" value={visaTypeId} />

      <h2 className="font-display text-lg font-semibold">Request visa assistance</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {visaTypeName} · {countryName}
      </p>

      <div className="mt-5 space-y-4">
        <Input
          label="Full name"
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
        <Input
          label="Contact number"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          defaultValue={defaults?.phone}
          error={fieldErrors.phone}
        />
        <Input
          label="Nationality"
          name="nationality"
          required
          defaultValue="Bangladeshi"
          error={fieldErrors.nationality}
        />
        <Textarea
          label="Message"
          name="message"
          rows={4}
          placeholder="Travel dates, purpose of visit, previous visa history…"
          error={fieldErrors.message}
        />

        {/* Honeypot */}
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

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Request assistance
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          We never charge for an initial requirements review.
        </p>
      </div>
    </form>
  );
}
