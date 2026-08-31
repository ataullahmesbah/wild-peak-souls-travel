import type { Metadata } from 'next';
import { Image as ImageIcon, HardDrive, Layers, Trash2 } from 'lucide-react';

import { EmptyState } from '@/components/ui/states';
import { Pagination } from '@/components/ui/pagination';
import { AdminCard, AdminPageHeader } from '@/components/admin/admin-ui';
import { hasPermission, requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { MetricCard } from '@/components/admin/admin-ui';
import { MediaDeleteButton } from '@/components/admin/media-delete-button';
import { getMediaUsage, listMediaAssets } from '@/lib/data/admin';
import { isCloudinaryConfigured } from '@/lib/env';
import { formatDate, parsePageParam } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Media Library',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function fileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const staff = await requirePermissionPage(PERMISSIONS.MEDIA_READ);

  const params = await searchParams;
  const page = parsePageParam(first(params.page));
  const [result, usage] = await Promise.all([listMediaAssets(page), getMediaUsage()]);
  const cloudinaryReady = isCloudinaryConfigured();
  const canDelete = hasPermission(staff, PERMISSIONS.MEDIA_DELETE);

  return (
    <>
      <AdminPageHeader
        title="Media library"
        description="Images used across the site. Uploads go straight to Cloudinary using a signed request, so the API secret never reaches the browser. Deleting here removes the file from Cloudinary too, which is what actually frees the storage."
      />

      {!cloudinaryReady && (
        <div className="mb-6 rounded-card border border-warning/30 bg-warning-soft p-5">
          <p className="font-medium text-warning">Cloudinary is not configured</p>
          <p className="mt-1 text-sm text-foreground/80">
            Set <code className="rounded bg-muted px-1">CLOUDINARY_CLOUD_NAME</code>,{' '}
            <code className="rounded bg-muted px-1">CLOUDINARY_API_KEY</code> and{' '}
            <code className="rounded bg-muted px-1">CLOUDINARY_API_SECRET</code> in your
            environment to enable uploads. Existing image URLs still render.
          </p>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={Layers}
          label="Files"
          value={usage.totalFiles.toLocaleString()}
          hint="Everything in the library"
        />
        <MetricCard
          icon={HardDrive}
          label="Storage used"
          value={fileSize(usage.totalBytes)}
          hint="What this site is responsible for"
          tone="info"
        />
        <MetricCard
          icon={Trash2}
          label="Unused files"
          value={usage.unusedFiles.toLocaleString()}
          hint={
            usage.unusedFiles > 0
              ? `${fileSize(usage.unusedBytes)} you can safely free`
              : 'Nothing to clean up'
          }
          tone={usage.unusedFiles > 0 ? 'warning' : 'success'}
        />
      </div>

      {usage.byFolder.length > 1 && (
        <AdminCard title="Where the space goes" className="mb-6">
          <ul className="space-y-2.5">
            {usage.byFolder.map((row) => {
              const share = usage.totalBytes > 0 ? (row.bytes / usage.totalBytes) * 100 : 0;
              return (
                <li key={row.folder}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate font-medium">{row.folder}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {row.files} file{row.files === 1 ? '' : 's'} · {fileSize(row.bytes)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(1, Math.round(share))}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminCard>
      )}

      <AdminCard title={`${result.total} asset${result.total === 1 ? '' : 's'}`}>
        {result.items.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No media uploaded"
            description="Images attached to destinations, events and tours are catalogued here."
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {result.items.map((asset) => (
                <li key={asset.id} className="overflow-hidden rounded-field border border-border">
                  <div className="relative aspect-[4/3] bg-muted">
                    {/* Assets come from arbitrary configured hosts, so a plain
                        img avoids pinning every one in next.config. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.secureUrl ?? asset.url}
                      alt={asset.altText ?? ''}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-medium">
                      {asset.altText ?? asset.folder ?? 'Untitled'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {asset.width && asset.height
                        ? `${asset.width}×${asset.height} · `
                        : ''}
                      {fileSize(asset.size)}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(asset.createdAt)}
                      {asset.createdBy ? ` · ${asset.createdBy.name}` : ''}
                    </p>
                    {canDelete && (
                      <div className="mt-2">
                        <MediaDeleteButton
                          id={asset.id}
                          label={asset.altText ?? asset.folder ?? 'this image'}
                          usageCount={Object.values(asset._count).reduce(
                            (sum, count) => sum + count,
                            0,
                          )}
                        />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              basePath="/dashboard/media"
            />
          </>
        )}
      </AdminCard>
    </>
  );
}
