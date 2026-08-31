import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { heroSlideFields } from '@/lib/admin/forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'New hero slide',
  robots: { index: false, follow: false },
};

export default async function NewHeroPage() {
  await requirePermissionPage(PERMISSIONS.HERO_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="New hero slide"
        description="The rotating banner at the top of the home page."
      />
      <ResourceForm
        endpoint="/api/dashboard/hero-slides"
        groups={heroSlideFields()}
        cancelHref="/dashboard/hero"
        redirectTo="/dashboard/hero"
        successMessage="Hero slide created."
      />
    </>
  );
}
