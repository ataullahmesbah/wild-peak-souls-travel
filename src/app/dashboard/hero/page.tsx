import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { AdminCard, AdminPageHeader, DataTable } from '@/components/admin/admin-ui';
import { RowActions } from '@/components/admin/row-actions';
import { prisma } from '@/lib/prisma';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Home page banner',
  robots: { index: false, follow: false },
};

export default async function AdminHeroPage() {
  const staff = await requirePermissionPage(PERMISSIONS.HERO_MANAGE);

  const slides = await prisma.heroSlide.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { media: { select: { url: true, altText: true } } },
  });

  const now = new Date();
  const live = slides.filter(
    (slide) =>
      slide.active &&
      (!slide.startAt || slide.startAt <= now) &&
      (!slide.endAt || slide.endAt >= now),
  );

  return (
    <>
      <AdminPageHeader
        title="Home page banner"
        description="The rotating banner at the top of the home page. Slides show in sort order; a slide outside its schedule is skipped."
        actions={
          <ButtonLink href="/dashboard/hero/new" size="sm">
            New slide
          </ButtonLink>
        }
      />

      {slides.length > 0 && live.length === 0 && (
        <p className="mb-5 rounded-field border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          No slide is showing right now, so the home page falls back to its
          built-in banner. Activate a slide, or check the scheduled dates.
        </p>
      )}

      <AdminCard title={`${slides.length} slide${slides.length === 1 ? '' : 's'}`}>
        {slides.length === 0 ? (
          <EmptyState
            title="No slides yet"
            description="Add a slide to control the headline, image and buttons at the top of the home page."
          />
        ) : (
          <DataTable
            headers={['Order', 'Headline', 'Buttons', 'Schedule', 'Showing now', '']}
            minWidth="58rem"
          >
            {slides.map((slide) => {
              const isLive = live.some((candidate) => candidate.id === slide.id);
              return (
                <tr key={slide.id} className="transition-colors hover:bg-muted/40">
                  <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                    {slide.sortOrder}
                  </td>
                  <td className="py-3 pr-4">
                    <p className="max-w-64 truncate font-medium">{slide.title}</p>
                    {slide.subtitle && (
                      <p className="max-w-64 truncate text-xs text-muted-foreground">
                        {slide.subtitle}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {slide.primaryCtaText ?? '—'}
                    {slide.secondaryCtaText && ` · ${slide.secondaryCtaText}`}
                  </td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {slide.startAt ? formatDate(slide.startAt) : 'Always'} →{' '}
                    {slide.endAt ? formatDate(slide.endAt) : 'No end'}
                  </td>
                  <td className="py-3 pr-4">
                    {isLive ? (
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
                        Live
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Not showing
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <RowActions
                      editHref={`/dashboard/hero/${slide.id}`}
                      deleteEndpoint={`/api/dashboard/hero-slides/${slide.id}`}
                      label={slide.title}
                      canDelete={hasPermission(staff, PERMISSIONS.HERO_MANAGE)}
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
