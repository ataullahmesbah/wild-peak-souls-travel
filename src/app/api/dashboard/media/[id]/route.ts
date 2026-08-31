import type { NextRequest } from 'next/server';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { deleteAsset } from '@/lib/cloudinary';
import { isCloudinaryConfigured } from '@/lib/env';

const USAGE_LABELS: Record<string, string> = {
  destinationCovers: 'destination cover',
  destinationGallery: 'destination gallery',
  eventCovers: 'event cover',
  eventGallery: 'event gallery',
  tourCovers: 'tour cover',
  activityCovers: 'activity cover',
  accommodationCovers: 'property cover',
  roomTypeCovers: 'room type cover',
  visaCountryFlags: 'visa country flag',
  advertisements: 'advertisement',
  expenseReceipts: 'expense receipt',
  postCovers: 'guide cover',
  heroSlides: 'home page slide',
};

/**
 * Deletes an image for real — from Cloudinary as well as the database.
 *
 * Removing only the database row is what leaves an account quietly filling up
 * with files nothing points at, which is the problem this endpoint exists to
 * solve. An image still attached to something is refused rather than deleted,
 * because the alternative is a live page rendering a broken image.
 *
 * The order matters: Cloudinary first, then the row. If Cloudinary fails we
 * still have the record and can retry; the reverse would lose the public id and
 * strand the file forever.
 */
export const DELETE = apiHandler(
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const staff = await requirePermission(PERMISSIONS.MEDIA_DELETE);
    const { id } = await context.params;

    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: {
        id: true,
        publicId: true,
        folder: true,
        size: true,
        _count: {
          select: {
            destinationCovers: true,
            destinationGallery: true,
            eventCovers: true,
            eventGallery: true,
            tourCovers: true,
            activityCovers: true,
            accommodationCovers: true,
            roomTypeCovers: true,
            visaCountryFlags: true,
            advertisements: true,
            expenseReceipts: true,
            postCovers: true,
            heroSlides: true,
          },
        },
      },
    });

    if (!asset) throw new BusinessError('Image not found.', 'NOT_FOUND', 404);

    const inUse = Object.entries(asset._count)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => `${count} ${USAGE_LABELS[key] ?? key}${count === 1 ? '' : 's'}`);

    if (inUse.length > 0) {
      throw new BusinessError(
        `This image is still used as ${inUse.join(', ')}. Replace it there first, then delete it.`,
        'IN_USE',
        409,
      );
    }

    let removedRemotely = false;
    if (asset.publicId && isCloudinaryConfigured()) {
      try {
        await deleteAsset(asset.publicId);
        removedRemotely = true;
      } catch (error) {
        // Reported rather than swallowed: a caller told "deleted" while the
        // file is still costing storage has been told something untrue.
        console.error('[media] cloudinary delete failed', asset.publicId, error);
        throw new BusinessError(
          'The image could not be removed from Cloudinary, so it has been left in place. Try again in a moment.',
          'REMOTE_DELETE_FAILED',
          502,
        );
      }
    }

    await prisma.mediaAsset.delete({ where: { id: asset.id } });

    await recordAudit({
      actorId: staff.id,
      action: 'media.deleted',
      entityType: 'MediaAsset',
      entityId: asset.id,
      metadata: {
        publicId: asset.publicId ?? undefined,
        bytesFreed: asset.size ?? 0,
        removedFromCloudinary: removedRemotely,
      },
    });

    return apiSuccess({ id: asset.id, deleted: true, removedRemotely });
  },
);
