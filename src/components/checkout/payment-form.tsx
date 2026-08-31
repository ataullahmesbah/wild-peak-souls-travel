'use client';

import * as React from 'react';
import { Copy, Check, Smartphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormMessage, Input } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';
import { cn, formatCurrency } from '@/lib/utils';

export interface PaymentOption {
  method: 'BKASH' | 'NAGAD' | 'SSLCOMMERZ';
  label: string;
  number: string | null;
  instructions: string | null;
  available: boolean;
}

export function PaymentForm({
  bookingId,
  bookingNumber,
  total,
  options,
}: {
  bookingId: string;
  bookingNumber: string;
  total: number;
  options: PaymentOption[];
}) {
  const enabled = options.filter((o) => o.available);
  const [method, setMethod] = React.useState(enabled[0]?.method ?? 'BKASH');
  const [copied, setCopied] = React.useState(false);

  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/payments/submit',
    {
      resetForm: false,
      successMessage:
        'Payment details submitted. Our team verifies transactions during business hours and you will be notified as soon as it is confirmed.',
    },
  );

  const selected = enabled.find((o) => o.method === method);

  const copyNumber = async () => {
    if (!selected?.number) return;
    try {
      await navigator.clipboard.writeText(selected.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the number is visible on screen anyway.
    }
  };

  if (enabled.length === 0) {
    return (
      <div className="wps-card p-6">
        <h2 className="font-display text-lg font-semibold">Payment is temporarily closed</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No payment method is currently enabled. Your booking is held — contact our
          team and we will take payment directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="wps-card p-6" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="method" value={method} />

      <h2 className="font-display text-lg font-semibold">Pay {formatCurrency(total)}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Booking {bookingNumber}
      </p>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Choose a payment method</legend>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {enabled.map((option) => (
            <button
              key={option.method}
              type="button"
              onClick={() => setMethod(option.method)}
              aria-pressed={method === option.method}
              className={cn(
                'flex items-center gap-3 rounded-field border p-3.5 text-left transition-colors',
                method === option.method
                  ? 'border-primary bg-primary-soft'
                  : 'border-border hover:bg-muted',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  method === option.method
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Smartphone className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {selected && (
        <div className="mt-5 rounded-field bg-muted/60 p-5">
          <h3 className="font-display text-sm font-semibold">
            How to pay with {selected.label}
          </h3>

          {selected.number && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-field border border-border bg-card p-3.5">
              <div>
                <p className="text-xs text-muted-foreground">Send money to</p>
                <p className="font-display text-lg font-semibold tracking-wide">
                  {selected.number}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={copyNumber}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          )}

          <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2.5">
              <Step n={1} />
              Open your {selected.label} app and choose <strong>Send Money</strong>.
            </li>
            <li className="flex gap-2.5">
              <Step n={2} />
              Send exactly <strong>{formatCurrency(total)}</strong> to the number above.
            </li>
            <li className="flex gap-2.5">
              <Step n={3} />
              Copy the Transaction ID from the confirmation message.
            </li>
            <li className="flex gap-2.5">
              <Step n={4} />
              Enter it below so our team can verify it against the account.
            </li>
          </ol>

          {selected.instructions && (
            <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
              {selected.instructions}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 space-y-4">
        <Input
          label="Your sending number"
          name="senderNumber"
          type="tel"
          placeholder="01XXXXXXXXX"
          hint="The number you paid from — helps us match the transaction faster."
          error={fieldErrors.senderNumber}
        />
        <Input
          label="Transaction ID"
          name="transactionId"
          required
          placeholder="e.g. 8N7A2X9K1Q"
          error={fieldErrors.transactionId}
        />

        {error && <FormMessage tone="error">{error}</FormMessage>}
        {success && <FormMessage tone="success">{success}</FormMessage>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Submit payment details
        </Button>

        <p className="rounded-field bg-muted/60 p-3.5 text-xs leading-relaxed text-muted-foreground">
          Submitting this does not confirm the booking by itself. A member of our
          team checks the transaction against our merchant account and confirms it
          — you will get a notification either way. Never send money to any number
          other than the one shown here.
        </p>
      </div>
    </form>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[0.65rem] font-semibold text-primary"
      aria-hidden="true"
    >
      {n}
    </span>
  );
}
