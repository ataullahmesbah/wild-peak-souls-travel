import type { NextRequest } from 'next/server';

import { z } from 'zod';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { LeadStatus } from '@/generated/prisma';

const schema = z.object({
  requestId: z.string().min(1),
  status: z.nativeEnum(LeadStatus),
  assignToMe: z.boolean().optional(),
  unassign: z.boolean().optional(),
  staffNotes: z.string().max(8000).optional(),
  quotedAmount: z.coerce.number().min(0).max(100_000_000).optional().nullable(),
});

/**
 * Moves a CustomTourRequest through its workflow.
 *
 * Workflow states: NEW, CONTACTED, QUOTED, NEGOTIATING, CONFIRMED, COMPLETED, CANCELLED.
 * Every transition is audited against the acting staff member.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.LEADS_MANAGE);
  const body = await request.json().catch(() => ({}));
  const input = schema.parse(body);

  const existing = await prisma.customTourRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, status: true, staffNotes: true, quotedAmount: true },
  });

  if (!existing) {
    throw new BusinessError('Request not found.', 'NOT_FOUND', 404);
  }

  await prisma.customTourRequest.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      ...(input.assignToMe ? { assignedToId: staff.id } : {}),
      ...(input.unassign ? { assignedToId: null } : {}),
      ...(input.staffNotes !== undefined ? { staffNotes: input.staffNotes || null } : {}),
      ...(input.quotedAmount !== undefined ? { quotedAmount: input.quotedAmount } : {}),
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'leads.custom-tour.status.updated',
    entityType: 'CustomTourRequest',
    entityId: existing.id,
    metadata: { from: existing.status, to: input.status, notesChanged: input.staffNotes !== undefined, quotedAmount: input.quotedAmount ?? undefined },
  });

  return apiSuccess({ updated: true, status: input.status });
});
