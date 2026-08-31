'use client';

import * as React from 'react';
import { Check, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormMessage, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function PaymentVerifyForm({
  paymentId,
  amount,
  transactionId,
  method,
}: {
  paymentId: string;
  amount: string;
  transactionId: string;
  method: string;
}) {
  const [decision, setDecision] = React.useState<'VERIFY' | 'REJECT'>('VERIFY');

  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/dashboard/payments/verify',
    {
      resetForm: false,
      successMessage: 'Decision recorded and the customer has been notified.',
    },
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input type="hidden" name="paymentId" value={paymentId} />
      <input type="hidden" name="decision" value={decision} />

      <dl className="space-y-2 rounded-field bg-muted/60 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Method</dt>
          <dd className="font-medium">{method}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-medium">{amount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Transaction ID</dt>
          <dd className="break-all text-right font-mono text-xs">{transactionId}</dd>
        </div>
      </dl>

      <Textarea
        label="Verification note"
        name="note"
        rows={2}
        placeholder="Matched in merchant statement / amount mismatch / TrxID not found…"
        hint="Shown to the customer if you reject the payment."
        error={fieldErrors.note}
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      {!success && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="submit"
            loading={loading && decision === 'VERIFY'}
            onClick={() => setDecision('VERIFY')}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            Verify
          </Button>
          <Button
            type="submit"
            variant="destructive"
            loading={loading && decision === 'REJECT'}
            onClick={() => setDecision('REJECT')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Reject
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Verifying confirms the booking, records the income and issues the invoice.
        Every decision is written to the audit log against your account.
      </p>
    </form>
  );
}
