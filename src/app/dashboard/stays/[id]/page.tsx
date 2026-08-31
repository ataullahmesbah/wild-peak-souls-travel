// src/app/dashboard/stays/[id]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { StayForm } from '@/components/admin/stay-form';
import { stayFields } from '@/lib/admin/forms';
import { destinationOptions, toFormValues } from '@/lib/data/admin-forms';
import { prisma } from '@/lib/prisma';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit property',
  robots: { index: false, follow: false },
};

export default async function EditStayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.STAYS_MANAGE);
  const { id } = await params;

  const [stay, destinations] = await Promise.all([
    prisma.accommodation.findUnique({
      where: { id },
      include: {
        roomTypes: { orderBy: { price: 'asc' } },
        coverMedia: { select: { url: true, secureUrl: true } },
      },
    }),
    destinationOptions(),
  ]);

  if (!stay) notFound();

  const { roomTypes, ...scalars } = stay;

  return (
    <>
      <AdminPageHeader title={stay.name} description={`/stays/${stay.slug}`} />
      <StayForm
        endpoint={`/api/dashboard/stays/${id}`}
        method="PATCH"
        groups={stayFields(destinations)}
        values={toFormValues(scalars)}
        roomTypes={roomTypes.map((room) => ({
          id: room.id,
          name: room.name,
          capacity: room.capacity,
          price: room.price.toNumber(),
          totalUnits: room.totalUnits,
          description: room.description,
          amenities: room.amenities,
        }))}
      />
    </>
  );
}
