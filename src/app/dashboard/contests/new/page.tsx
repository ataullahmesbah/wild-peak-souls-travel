// src/app/dashboard/contests/new/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { contestFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New contest',
  robots: { index: false, follow: false },
};

export default async function NewContestPage() {
  await requirePermissionPage(PERMISSIONS.CONTEST_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="New contest"
        description="Save it as a draft first. Prizes, judges, sponsors and the gallery are added once the contest exists."
      />
      <ResourceForm
        endpoint="/api/dashboard/contests"
        groups={contestFields()}
        values={{
          status: 'DRAFT',
          allowImages: true,
          allowVideos: true,
          maxImageBytes: 2097152,
          maxVideoSeconds: 20,
          maxEntriesPerUser: 1,
          publicVoteWeight: 25,
          shortlistSize: 10,
          featureOnHome: true,
        }}
        cancelHref="/dashboard/contests"
        redirectTo="/dashboard/contests"
        successMessage="Contest created. Add prizes and judges next."
      />
    </>
  );
}
