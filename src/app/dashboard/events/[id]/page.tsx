// src/app/dashboard/events/[id]/page.tsx
import type { Metadata } from 'next';

import { AdminPageHeader } from '@/components/admin/admin-ui';
import { EventForm } from '@/components/admin/event-form';
import { eventFields } from '@/lib/admin/forms';
import { destinationOptions, toFormValues } from '@/lib/data/admin-forms';
import { prisma } from '@/lib/prisma';
import { requirePermissionPage } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit event',
  robots: { index: false, follow: false },
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermissionPage(PERMISSIONS.EVENTS_UPDATE);
  const { id } = await params;

  const [event, destinations] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        itinerary: { orderBy: { dayNumber: 'asc' } },
        options: { orderBy: { price: 'asc' } },
        policies: true,
        // Supplies the cover image preview on the edit form.
        coverMedia: { select: { url: true, secureUrl: true } },
      },
    }),
    destinationOptions(),
  ]);

  if (!event) notFound();

  const { itinerary, options, policies, ...scalars } = event;

  return (
    <>
      <AdminPageHeader
        title={event.title}
        description={`/events/${event.slug}`}
      />
      <EventForm
        endpoint={`/api/dashboard/events/${id}`}
        method="PATCH"
        groups={eventFields(destinations)}
        values={toFormValues(scalars)}
        reservedSeats={event.reservedSeats}
        itinerary={itinerary.map((day) => ({
          dayNumber: day.dayNumber,
          title: day.title,
          description: day.description,
        }))}
        options={options.map((option) => ({
          title: option.title,
          price: option.price.toNumber(),
          description: option.description,
        }))}
        policies={policies.map((policy) => ({
          title: policy.title,
          content: policy.content,
        }))}
      />
    </>
  );
}
