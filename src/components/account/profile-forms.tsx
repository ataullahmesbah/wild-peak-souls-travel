'use client';

import { Button } from '@/components/ui/button';
import { FormMessage, Input } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function ProfileForm({
  defaults,
}: {
  defaults: { name: string; phone: string; image: string };
}) {
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/account/profile',
    { resetForm: false, successMessage: 'Profile updated.' },
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input
        label="Full name"
        name="name"
        required
        defaultValue={defaults.name}
        autoComplete="name"
        error={fieldErrors.name}
      />
      <Input
        label="Phone"
        name="phone"
        type="tel"
        defaultValue={defaults.phone}
        autoComplete="tel"
        error={fieldErrors.phone}
      />
      <Input
        label="Profile image URL"
        name="image"
        type="url"
        defaultValue={defaults.image}
        placeholder="https://…"
        hint="Optional. Paste a link to an image."
        error={fieldErrors.image}
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <Button type="submit" loading={loading}>
        Save changes
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/account/password',
    { successMessage: 'Password changed. Other sessions have been signed out.' },
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input
        label="Current password"
        name="currentPassword"
        type="password"
        required
        autoComplete="current-password"
        error={fieldErrors.currentPassword}
      />
      <Input
        label="New password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
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
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <Button type="submit" loading={loading}>
        Change password
      </Button>
    </form>
  );
}
