'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { FormMessage, Input } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function ForgotPasswordForm() {
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/auth/password/forgot',
    {
      successMessage:
        'If an account exists for that email, a reset link is on its way. Check your inbox.',
    },
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter the email on your account and we will send you a reset link.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          error={fieldErrors.email}
        />

        {error && <FormMessage tone="error">{error}</FormMessage>}
        {success && <FormMessage tone="success">{success}</FormMessage>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const { loading, error, fieldErrors, submit } = useApiForm(
    '/api/auth/password/reset',
    {
      resetForm: false,
      onSuccess: () => router.push('/login?reset=1'),
    },
  );

  if (!token) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold">Link is not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This reset link is missing its token, or it has already been used. Request
          a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 flex h-11 w-full items-center justify-center rounded-field bg-primary text-sm font-medium text-primary-foreground"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signing in elsewhere will be ended once you set a new password.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4" noValidate>
        <input type="hidden" name="token" value={token} />
        <Input
          label="New password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          autoFocus
          hint="At least 8 characters, with an uppercase letter and a number."
          error={fieldErrors.password}
        />
        <Input
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />

        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Set new password
        </Button>
      </form>
    </div>
  );
}
