import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';

const schema = z.object({
  url: z.string().url(),
  secureUrl: z.string().url().optional(),
  publicId: z.string().min(1).max(300),
  type: z.string().max(40).default('image'),
  mimeType: z.string().max(120).optional(),
  width: z.coerce.number().int().min(0).max(50_000).optional(),
  height: z.coerce.number().int().min(0).max(50_000).optional(),
  size: z.coerce.number().int().min(0).optional(),
  altText: z.string().max(300).optional(),
  folder: z.string().max(200).optional(),
});

/** Records an asset the browser has just uploaded to Cloudinary. */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.MEDIA_UPLOAD);
  const body = await request.json().catch(() => ({}));
  const input = schema.parse(body);

  const asset = await prisma.mediaAsset.create({
    data: { ...input, createdById: staff.id },
    select: { id: true, url: true, secureUrl: true },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'media.uploaded',
    entityType: 'MediaAsset',
    entityId: asset.id,
    metadata: { publicId: input.publicId, size: input.size },
  });

  return apiSuccess(asset, 201);
});
