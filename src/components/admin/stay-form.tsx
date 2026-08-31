'use client';

import { RepeatableRows } from '@/components/admin/repeatable-rows';
import { ResourceForm, type FieldGroup, type ResourceValues } from '@/components/admin/resource-form';

/**
 * The stay editor. Room types carry a hidden id so an edit updates the
 * existing room rather than replacing it — losing a room's id would orphan
 * every booking that points at it.
 */
export function StayForm({
  endpoint,
  method,
  groups,
  values,
  roomTypes,
}: {
  endpoint: string;
  method?: 'POST' | 'PATCH';
  groups: FieldGroup[];
  values?: ResourceValues;
  roomTypes?: Array<Record<string, string | number | null>>;
}) {
  return (
    <ResourceForm
      endpoint={endpoint}
      method={method}
      groups={groups}
      values={values}
      cancelHref="/dashboard/stays"
      redirectTo="/dashboard/stays"
      successMessage={method === 'PATCH' ? 'Property updated.' : 'Property created.'}
    >
      <RepeatableRows
        name="roomTypes"
        legend="Room types"
        description="Each room type is sold separately. Removing one that already has bookings archives it instead of deleting it, and the number of units cannot drop below the units booked on any future date."
        addLabel="Add room type"
        emptyLabel="No room types yet. A property with no rooms cannot be booked."
        fields={[
          { name: 'id', label: 'Reference', type: 'hidden' },
          { name: 'name', label: 'Room name', required: true, placeholder: 'Deluxe sea view' },
          { name: 'capacity', label: 'Sleeps', type: 'number' },
          { name: 'price', label: 'Price per night (BDT)', type: 'money', required: true },
          { name: 'totalUnits', label: 'Rooms available', type: 'number' },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'amenities', label: 'Amenities', type: 'textarea' },
        ]}
        initialRows={roomTypes}
      />
    </ResourceForm>
  );
}
