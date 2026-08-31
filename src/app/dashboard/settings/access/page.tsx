import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { AdminCard, AdminPageHeader } from '@/components/admin/admin-ui';
import { PageAccessMatrix } from '@/components/admin/page-access-matrix';
import { listPageAccessMatrix } from '@/lib/rbac/page-access';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Page access',
  robots: { index: false, follow: false },
};

export default async function PageAccessSettingsPage() {
  await requirePermissionPage(PERMISSIONS.PAGE_ACCESS_MANAGE);
  const { pages, roles, denied } = await listPageAccessMatrix();

  return (
    <>
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to settings
      </Link>

      <AdminPageHeader
        title="Page access"
        description="Choose which dashboard pages each role can open. This can only take access away — a role that does not hold a page's permission cannot use it however this grid is set."
      />

      <AdminCard
        title="Roles and pages"
        description="Unticking a box hides that page from that role and redirects them away if they type the address directly."
      >
        <PageAccessMatrix
          pages={pages.map((page) => ({
            id: page.id,
            label: page.label,
            group: page.group,
            path: page.path,
          }))}
          roles={roles}
          deniedKeys={[...denied]}
        />
      </AdminCard>
    </>
  );
}
