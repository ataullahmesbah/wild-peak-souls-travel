import type { NextRequest } from 'next/server';

import { z } from 'zod';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';
import { VisaRequestStatus } from '@/generated/prisma';

const schema = z.object({
  requestId: z.string().min(1),
  status: z.nativeEnum(VisaRequestStatus),
  assignToMe: z.boolean().optional(),
  unassign: z.boolean().optional(),
  staffNotes: z.string().max(8000).optional(),
});

/**
 * Moves a VisaRequest through its workflow.
 *
 * Workflow states: NEW, CONTACTED, DOCUMENTS_REQUESTED, DOCUMENTS_RECEIVED, PROCESSING, COMPLETED, CANCELLED.
 * Every transition is audited against the acting staff member.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.VISA_REQUESTS_MANAGE);
  const body = await request.json().catch(() => ({}));
  const input = schema.parse(body);

  const existing = await prisma.visaRequest.findUnique({
    where: { id: input.requestId },
    select: { id: true, status: true, staffNotes: true },
  });

  if (!existing) {
    throw new BusinessError('Request not found.', 'NOT_FOUND', 404);
  }

  await prisma.visaRequest.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      ...(input.assignToMe ? { assignedToId: staff.id } : {}),
      ...(input.unassign ? { assignedToId: null } : {}),
      ...(input.staffNotes !== undefined ? { staffNotes: input.staffNotes || null } : {}),
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'leads.visa.status.updated',
    entityType: 'VisaRequest',
    entityId: existing.id,
    metadata: { from: existing.status, to: input.status, notesChanged: input.staffNotes !== undefined },
  });

  return apiSuccess({ updated: true, status: input.status });
});
