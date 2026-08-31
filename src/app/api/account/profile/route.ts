import type { NextRequest } from 'next/server';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/rbac/guard';
import { profileUpdateSchema } from '@/lib/validation/auth';

export const POST = apiHandler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const input = profileUpdateSchema.parse(body);

  // Changing a phone number must not let one account take over another's.
  if (input.phone) {
    const clash = await prisma.user.findFirst({
      where: { phone: input.phone, id: { not: user.id } },
      select: { id: true },
    });
    if (clash) {
      throw new BusinessError(
        'That phone number is already registered to another account.',
        'PHONE_TAKEN',
      );
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: input.name,
      phone: input.phone ?? null,
      image: input.image || null,
    },
  });

  return apiSuccess({ updated: true });
});
