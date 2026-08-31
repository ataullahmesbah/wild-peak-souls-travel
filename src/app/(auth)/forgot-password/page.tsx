import type { Metadata } from 'next';

import { ForgotPasswordForm } from '@/components/forms/password-reset-forms';

export const metadata: Metadata = {
  title: 'Forgot Password',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
