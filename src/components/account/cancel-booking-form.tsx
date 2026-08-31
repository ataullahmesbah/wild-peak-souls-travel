'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { FormMessage, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function CancelBookingForm({ bookingId }: { bookingId: string }) {
  const [confirming, setConfirming] = React.useState(false);
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/bookings/cancel',
    {
      resetForm: false,
      successMessage: 'Your booking has been cancelled.',
    },
  );

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Cancel booking
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <Textarea
        label="Why are you cancelling?"
        name="reason"
        required
        rows={3}
        placeholder="Change of plans, date conflict, found another trip…"
        error={fieldErrors.reason}
        hint="This helps us improve, and gives our team context if a refund is due."
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      {!success && (
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
            Keep booking
          </Button>
          <Button type="submit" variant="destructive" loading={loading}>
            Confirm cancellation
          </Button>
        </div>
      )}
    </form>
  );
}
