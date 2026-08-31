import type { Metadata } from 'next';
import { Suspense } from 'react';

import { OtpForm } from '@/components/forms/otp-form';
import { FormSkeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Verify Your Code',
  robots: { index: false, follow: false },
};

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={1} />}>
      <OtpForm />
    </Suspense>
  );
}
