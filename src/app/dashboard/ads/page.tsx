import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { RowActions } from '@/components/admin/row-actions';

import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Advertisements',
  robots: { index: false, follow: false },
};

export default async function AdminAdsPage() {
  const staff = await requirePermissionPage(PERMISSIONS.ADS_MANAGE);

  const ads = await prisma.advertisement.findMany({
    orderBy: [{ active: 'desc' }, { priority: 'desc' }],
    take: 50,
  });

  return (
    <>
      <AdminPageHeader
        title="Advertisements"
        description="Billboard, modal and banner placements across the site. Impression and click counters are recorded per creative."
        actions={
          <ButtonLink href="/dashboard/ads/new" size="sm">
            New advertisement
          </ButtonLink>
        }
      />

      <AdminCard title={`${ads.length} creative${ads.length === 1 ? '' : 's'}`}>
        {ads.length === 0 ? (
          <EmptyState
            title="No advertisements"
            description="Add a creative to fill a placement slot on the homepage or listings."
          />
        ) : (
          <DataTable
            headers={['Title', 'Placement', 'CTA', 'Window', 'Impressions', 'Clicks', 'CTR', 'Active', '']}
            minWidth="68rem"
          >
            {ads.map((ad) => {
              const ctr =
                ad.impressions > 0
                  ? `${((ad.clicks / ad.impressions) * 100).toFixed(1)}%`
                  : '—';
              return (
                <tr key={ad.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 pr-4">
                    <p className="max-w-48 truncate font-medium">{ad.title}</p>
                    {ad.description && (
                      <p className="max-w-48 truncate text-xs text-muted-foreground">
                        {ad.description}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">
                    {ad.placement.replace(/_/g, ' ').toLowerCase()}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {ad.ctaText ?? '—'}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {ad.startAt ? formatDate(ad.startAt) : 'Always'} →{' '}
                    {ad.endAt ? formatDate(ad.endAt) : 'No end'}
                  </td>
                  <td className="py-3 pr-4">{ad.impressions.toLocaleString()}</td>
                  <td className="py-3 pr-4">{ad.clicks.toLocaleString()}</td>
                  <td className="py-3 pr-4 font-medium">{ctr}</td>
                  <td className="py-3">
                    {ad.active ? (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Paused
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                  <RowActions
                    editHref={`/dashboard/ads/${ad.id}`}
                    deleteEndpoint={`/api/dashboard/advertisements/${ad.id}`}
                    label={ad.title}
                    canDelete={hasPermission(staff, PERMISSIONS.ADS_DELETE)}
                  />
                </td>
              </tr>
              );
            })}
          </DataTable>
        )}
      </AdminCard>
    </>
  );
}
