import type { Metadata } from 'next';

import { ForbiddenState } from '@/components/ui/states';

export const metadata: Metadata = {
  title: 'Access denied',
  robots: { index: false, follow: false },
};

export default function AdminForbiddenPage() {
  return (
    <div className="mx-auto max-w-2xl py-12">
      <ForbiddenState />
    </div>
  );
}
