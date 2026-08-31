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
});

/**
 * Moves a FlightInquiry through its workflow.
 *
 * Workflow states: NEW, CONTACTED, QUOTED, CONFIRMED, COMPLETED, CANCELLED.
 * Every transition is audited against the acting staff member.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.FLIGHTS_MANAGE);
  const body = await request.json().catch(() => ({}));
  const input = schema.parse(body);

  const existing = await prisma.flightInquiry.findUnique({
    where: { id: input.requestId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new BusinessError('Request not found.', 'NOT_FOUND', 404);
  }

  await prisma.flightInquiry.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      ...(input.assignToMe ? { assignedToId: staff.id } : {}),
      ...(input.unassign ? { assignedToId: null } : {}),
    },
  });

  await recordAudit({
    actorId: staff.id,
    action: 'leads.flight.status.updated',
    entityType: 'FlightInquiry',
    entityId: existing.id,
    metadata: { from: existing.status, to: input.status },
  });

  return apiSuccess({ updated: true, status: input.status });
});
