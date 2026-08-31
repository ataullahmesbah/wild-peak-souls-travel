'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { FormMessage } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';
import { maskEmail } from '@/lib/utils';

const RESEND_COOLDOWN_SECONDS = 60;

export function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const identifier = searchParams.get('identifier') ?? '';
  const purpose = searchParams.get('purpose') ?? 'LOGIN';
  const next = searchParams.get('next') ?? '/account';

  const [cooldown, setCooldown] = React.useState(RESEND_COOLDOWN_SECONDS);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);
  const [resending, setResending] = React.useState(false);

  const { loading, error, fieldErrors, submit } = useApiForm('/api/auth/otp/verify', {
    resetForm: false,
    onSuccess: () => {
      router.push(next);
      router.refresh();
    },
  });

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    setResending(true);
    setResendMessage(null);
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, purpose }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setResendMessage(
        response.ok
          ? 'A new code has been sent.'
          : (body.error ?? 'Could not resend the code. Try again shortly.'),
      );
      if (response.ok) setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setResendMessage('Could not reach the server. Check your connection.');
    } finally {
      setResending(false);
    }
  };

  const display = identifier.includes('@') ? maskEmail(identifier) : identifier;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Enter your code</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We sent a 6-digit verification code to <strong>{display}</strong>.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <input type="hidden" name="identifier" value={identifier} />
        <input type="hidden" name="purpose" value={purpose} />

        <div>
          <label htmlFor="otp-code" className="block text-sm font-medium">
            Verification code <span className="text-destructive">*</span>
          </label>
          <input
            id="otp-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            aria-invalid={Boolean(fieldErrors.code) || undefined}
            className="mt-1.5 h-14 w-full rounded-field border border-border bg-input text-center font-display text-2xl tracking-[0.5em] focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25"
          />
          {fieldErrors.code?.[0] && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
              {fieldErrors.code[0]}
            </p>
          )}
        </div>

        {error && <FormMessage tone="error">{error}</FormMessage>}
        {resendMessage && <FormMessage tone="success">{resendMessage}</FormMessage>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Verify and continue
        </Button>
      </form>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        {cooldown > 0 ? (
          <span>Resend available in {cooldown}s</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="font-medium text-primary hover:underline disabled:opacity-60"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Codes expire after 10 minutes. Never share this code with anyone — our
        team will never ask you for it.
      </p>
    </div>
  );
}
