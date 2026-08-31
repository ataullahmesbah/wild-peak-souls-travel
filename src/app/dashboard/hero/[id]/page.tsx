import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { ResourceForm } from '@/components/admin/resource-form';
import { heroSlideFields } from '@/lib/admin/forms';
import { loadForEdit, toFormValues } from '@/lib/data/admin-forms';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit hero slide',
  robots: { index: false, follow: false },
};

export default async function EditHeroPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.HERO_MANAGE);
  const { id } = await params;
  const record = await loadForEdit('heroSlide', id);

  return (
    <>
      <AdminPageHeader
        title={String(record.title ?? 'Edit hero slide')}
        description="The rotating banner at the top of the home page."
      />
      <ResourceForm
        endpoint={`/api/dashboard/hero-slides/${id}`}
        method="PATCH"
        groups={heroSlideFields()}
        values={toFormValues(record)}
        cancelHref="/dashboard/hero"
        redirectTo="/dashboard/hero"
        successMessage="Hero slide updated."
      />
    </>
  );
}
