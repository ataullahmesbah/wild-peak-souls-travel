'use client';

import { Button } from '@/components/ui/button';
import { FormMessage, Input, Select, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function SupportTokenForm() {
  const { loading, error, success, fieldErrors, submit } = useApiForm('/api/support', {
    successMessage: 'Token created. Our team has been notified and will reply here.',
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input
        label="Subject"
        name="subject"
        required
        placeholder="Payment not verified for WPS-XXXXX"
        error={fieldErrors.subject}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Category" name="category" error={fieldErrors.category}>
          <option value="GENERAL">General</option>
          <option value="BOOKING">Booking</option>
          <option value="PAYMENT">Payment</option>
          <option value="VISA">Visa</option>
          <option value="TECHNICAL">Technical / website</option>
          <option value="COMPLAINT">Complaint</option>
        </Select>
        <Select label="Priority" name="priority" error={fieldErrors.priority}>
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent — travelling soon</option>
        </Select>
      </div>
      <Textarea
        label="Describe the issue"
        name="description"
        required
        rows={5}
        placeholder="Include booking numbers, transaction IDs, dates and what you expected to happen."
        error={fieldErrors.description}
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <Button type="submit" loading={loading}>
        Create support token
      </Button>
    </form>
  );
}
