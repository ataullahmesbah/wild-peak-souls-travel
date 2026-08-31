'use client';

import { Button } from '@/components/ui/button';
import { FormMessage, Select, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

const STATUSES = [
  'PENDING',
  'PAYMENT_PENDING',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'EXPIRED',
] as const;

export function BookingStatusForm({
  bookingId,
  currentStatus,
}: {
  bookingId: string;
  currentStatus: string;
}) {
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/dashboard/bookings/status',
    { resetForm: false, successMessage: 'Booking status updated.' },
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />

      <Select
        label="Status"
        name="status"
        defaultValue={currentStatus}
        required
        error={fieldErrors.status}
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {status.replace(/_/g, ' ').toLowerCase()}
          </option>
        ))}
      </Select>

      <Textarea
        label="Reason / note"
        name="reason"
        rows={2}
        placeholder="Recorded in the audit log."
        error={fieldErrors.reason}
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <Button type="submit" loading={loading} className="w-full">
        Update status
      </Button>
    </form>
  );
}
