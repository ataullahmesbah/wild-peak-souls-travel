'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Checkbox, FormMessage, Input } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/account';

  const { loading, error, fieldErrors, submit } = useApiForm('/api/auth/register', {
    resetForm: false,
    onSuccess: (data) => {
      const result = data as { otpRequired?: boolean; identifier?: string } | undefined;
      if (result?.otpRequired) {
        router.push(
          `/verify-otp?identifier=${encodeURIComponent(result.identifier ?? '')}&purpose=SIGNUP&next=${encodeURIComponent(next)}`,
        );
        return;
      }
      router.push(next);
      router.refresh();
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One account for bookings, payments, visas and support.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <Input
          label="Full name"
          name="name"
          required
          autoComplete="name"
          autoFocus
          error={fieldErrors.name}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          error={fieldErrors.email}
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          required
          autoComplete="tel"
          placeholder="+8801XXXXXXXXX"
          error={fieldErrors.phone}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          hint="At least 8 characters, with an uppercase letter and a number."
          error={fieldErrors.password}
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />

        <Checkbox
          name="acceptTerms"
          label={
            <>
              I agree to the{' '}
              <Link href="/policies/terms" className="text-primary hover:underline">
                terms
              </Link>{' '}
              and{' '}
              <Link href="/policies/privacy" className="text-primary hover:underline">
                privacy policy
              </Link>
              .
            </>
          }
          error={fieldErrors.acceptTerms}
        />

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <a
            href={`/api/auth/google?next=${encodeURIComponent(next)}`}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-field border border-border bg-card text-sm font-medium transition-colors hover:bg-muted"
          >
            Continue with Google
          </a>
        </>
      )}

      <p className="mt-7 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
