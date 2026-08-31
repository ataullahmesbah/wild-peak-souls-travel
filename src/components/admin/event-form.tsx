'use client';

import { RepeatableRows } from '@/components/admin/repeatable-rows';
import { ResourceForm, type FieldGroup, type ResourceValues } from '@/components/admin/resource-form';

/**
 * The event editor: the standard field grid plus the three child collections
 * an event owns — its itinerary, its paid options and its policies.
 *
 * Seats already sold never appear as an input. The booking engine owns that
 * number, and the API rejects a capacity below it rather than letting an edit
 * here oversell a departure.
 */
export function EventForm({
  endpoint,
  method,
  groups,
  values,
  itinerary,
  options,
  policies,
  reservedSeats,
}: {
  endpoint: string;
  method?: 'POST' | 'PATCH';
  groups: FieldGroup[];
  values?: ResourceValues;
  itinerary?: Array<Record<string, string | number | null>>;
  options?: Array<Record<string, string | number | null>>;
  policies?: Array<Record<string, string | number | null>>;
  reservedSeats?: number;
}) {
  return (
    <ResourceForm
      endpoint={endpoint}
      method={method}
      groups={groups}
      values={values}
      cancelHref="/dashboard/events"
      redirectTo="/dashboard/events"
      successMessage={method === 'PATCH' ? 'Event updated.' : 'Event created.'}
    >
      {reservedSeats !== undefined && reservedSeats > 0 && (
        <p className="rounded-field border border-info/30 bg-info-soft px-4 py-3 text-sm text-info">
          {reservedSeats} seat{reservedSeats === 1 ? ' is' : 's are'} already booked.
          Capacity can be raised, but not lowered below that number.
        </p>
      )}

      <RepeatableRows
        name="itinerary"
        legend="Itinerary"
        description="One entry per day. Days are shown in the order of their day number."
        addLabel="Add day"
        emptyLabel="No itinerary yet. Add the first day to start."
        fields={[
          { name: 'dayNumber', label: 'Day', type: 'number', required: true },
          { name: 'title', label: 'Title', required: true, placeholder: 'Dhaka to Teknaf' },
          { name: 'description', label: 'What happens', type: 'textarea' },
        ]}
        initialRows={itinerary}
      />

      <RepeatableRows
        name="options"
        legend="Paid options"
        description="Extras a traveller can add at checkout, such as a single room or an airport pickup."
        addLabel="Add option"
        emptyLabel="No paid options."
        fields={[
          { name: 'title', label: 'Option', required: true },
          { name: 'price', label: 'Extra cost (BDT)', type: 'money' },
          { name: 'description', label: 'Description', type: 'textarea' },
        ]}
        initialRows={options}
      />

      <RepeatableRows
        name="policies"
        legend="Policies"
        description="Cancellation, refund and conduct terms shown on the booking page."
        addLabel="Add policy"
        emptyLabel="No policies. The site-wide defaults will apply."
        fields={[
          { name: 'title', label: 'Policy', required: true, placeholder: 'Cancellation' },
          { name: 'content', label: 'Terms', type: 'textarea', required: true },
        ]}
        initialRows={policies}
      />
    </ResourceForm>
  );
}
