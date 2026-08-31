import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { StayForm } from '@/components/admin/stay-form';
import { stayFields } from '@/lib/admin/forms';
import { destinationOptions } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New property',
  robots: { index: false, follow: false },
};

export default async function NewStayPage() {
  await requirePermissionPage(PERMISSIONS.STAYS_MANAGE);
  const destinations = await destinationOptions();

  return (
    <>
      <AdminPageHeader
        title="New property"
        description="Hotels, resorts, homestays and camps. A property needs at least one room type before travellers can book it."
      />
      <StayForm endpoint="/api/dashboard/stays" groups={stayFields(destinations)} />
    </>
  );
}
