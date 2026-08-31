import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { RoleName } from '@/generated/prisma';

const schema = z.object({
  // Every page the form rendered, so an unticked box is an explicit deny
  // rather than an omission we cannot distinguish from "not shown".
  entries: z
    .array(
      z.object({
        roleId: z.string().min(1),
        pageId: z.string().min(1),
        allowed: z.boolean(),
      }),
    )
    .max(2000),
});

/**
 * Saves which roles may open which dashboard pages.
 *
 * Guarded by page-access.manage, which is deliberately excluded from ADMIN:
 * whoever can edit this table can change what every other role sees, so it
 * belongs with the owner. SUPER_ADMIN is never written — the owner's own way
 * back in must not be something a mis-click can close.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.PAGE_ACCESS_MANAGE);
  const body = await request.json().catch(() => ({}));
  const { entries } = schema.parse(body);

  const superAdmin = await prisma.role.findUnique({
    where: { name: RoleName.SUPER_ADMIN },
    select: { id: true },
  });

  const writable = entries.filter((entry) => entry.roleId !== superAdmin?.id);

  await prisma.$transaction(async (tx) => {
    // Only denials are stored; allowed is the absence of a row, so a page
    // added later is visible by default instead of hidden from everyone.
    const pageIds = [...new Set(writable.map((entry) => entry.pageId))];
    const roleIds = [...new Set(writable.map((entry) => entry.roleId))];

    await tx.rolePageAccess.deleteMany({
      where: { pageId: { in: pageIds }, roleId: { in: roleIds } },
    });

    const denials = writable.filter((entry) => !entry.allowed);
    if (denials.length > 0) {
      await tx.rolePageAccess.createMany({
        data: denials.map((entry) => ({
          roleId: entry.roleId,
          pageId: entry.pageId,
          allowed: false,
        })),
        skipDuplicates: true,
      });
    }
  });

  const deniedCount = writable.filter((entry) => !entry.allowed).length;

  await recordAudit({
    actorId: staff.id,
    action: 'settings.page-access.updated',
    entityType: 'RolePageAccess',
    metadata: { pagesHidden: deniedCount, rolesAffected: new Set(writable.map((e) => e.roleId)).size },
  });

  return apiSuccess({ hidden: deniedCount });
});
