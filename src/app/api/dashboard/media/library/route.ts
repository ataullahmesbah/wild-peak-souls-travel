// src/app/api/dashboard/media/library/route.ts
import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

/**
 * Images already in the library, for the picker in the catalogue forms.
 *
 * Reusing an existing image rather than uploading the same photo twice keeps
 * one row to maintain instead of two, and does not pay for the storage again.
 *
 * Deliberately narrow: id, url, description and folder. Nothing about who
 * uploaded it or what it costs — the picker does not need that, and this
 * endpoint is reachable by anyone who can edit content.
 */
export const GET = apiHandler(async () => {
  await requirePermission(PERMISSIONS.MEDIA_READ);

  const items = await prisma.mediaAsset.findMany({
    where: { type: 'image' },
    select: { id: true, url: true, secureUrl: true, altText: true, folder: true },
    orderBy: { createdAt: 'desc' },
    take: 120,
  });

  return apiSuccess({
    items: items.map((item) => ({
      id: item.id,
      url: item.secureUrl ?? item.url,
      altText: item.altText,
      folder: item.folder,
    })),
  });
});
