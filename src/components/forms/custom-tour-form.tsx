'use client';

import { Button } from '@/components/ui/button';
import { FormMessage, Input, Select, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function CustomTourForm({
  defaults,
}: {
  defaults: { name: string; email: string; phone: string } | null;
}) {
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/custom-tours',
    {
      successMessage:
        'Request received. A trip planner will read it and come back with an itinerary and quote.',
    },
  );

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={submit} className="wps-card p-6 sm:p-8" noValidate>
      <fieldset className="space-y-4">
        <legend className="font-display text-base font-semibold">Your details</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Name"
            name="name"
            required
            autoComplete="name"
            defaultValue={defaults?.name}
            error={fieldErrors.name}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={defaults?.email}
            error={fieldErrors.email}
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            defaultValue={defaults?.phone}
            error={fieldErrors.phone}
          />
        </div>
      </fieldset>

      <fieldset className="mt-8 space-y-4 border-t border-border pt-6">
        <legend className="font-display text-base font-semibold">The trip</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Destination"
            name="destination"
            placeholder="Bandarban, Sajek, Nepal…"
            error={fieldErrors.destination}
          />
          <Input
            label="Preferred start date"
            name="preferredDate"
            type="date"
            min={today}
            error={fieldErrors.preferredDate}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Number of travellers"
            name="travelers"
            type="number"
            min={1}
            max={200}
            defaultValue={2}
            required
            error={fieldErrors.travelers}
          />
          <Input
            label="Trip duration"
            name="duration"
            placeholder="3 days / 1 week"
            error={fieldErrors.duration}
          />
          <Input
            label="Budget per person"
            name="budget"
            placeholder="৳15,000 – ৳25,000"
            error={fieldErrors.budget}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Travel style" name="travelStyle" error={fieldErrors.travelStyle}>
            <option value="">No preference</option>
            <option value="Adventure">Adventure</option>
            <option value="Relaxed">Relaxed</option>
            <option value="Family">Family</option>
            <option value="Honeymoon">Honeymoon</option>
            <option value="Group / corporate">Group / corporate</option>
            <option value="Photography">Photography</option>
            <option value="Budget backpacking">Budget backpacking</option>
          </Select>
          <Select
            label="Accommodation"
            name="accommodationPreference"
            error={fieldErrors.accommodationPreference}
          >
            <option value="">No preference</option>
            <option value="Budget">Budget</option>
            <option value="Standard">Standard</option>
            <option value="Premium resort">Premium resort</option>
            <option value="Homestay">Homestay</option>
            <option value="Camping">Camping</option>
          </Select>
          <Select label="Transport" name="transport" error={fieldErrors.transport}>
            <option value="">No preference</option>
            <option value="Bus">Bus</option>
            <option value="Private car">Private car</option>
            <option value="Microbus">Microbus</option>
            <option value="Train">Train</option>
            <option value="Flight">Flight</option>
            <option value="Mixed">Mixed</option>
          </Select>
        </div>
        <Textarea
          label="Activities you want"
          name="activities"
          rows={3}
          placeholder="Trekking, waterfalls, boat ride, night camping…"
          error={fieldErrors.activities}
        />
        <Textarea
          label="Anything else we should know"
          name="notes"
          rows={4}
          placeholder="Dietary needs, accessibility, celebrations, must-see places…"
          error={fieldErrors.notes}
        />

        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute h-0 w-0 opacity-0"
        />
      </fieldset>

      <div className="mt-6 space-y-4">
        {error && <FormMessage tone="error">{error}</FormMessage>}
        {success && <FormMessage tone="success">{success}</FormMessage>}
        <Button type="submit" size="lg" loading={loading}>
          Send my trip request
        </Button>
        <p className="text-xs text-muted-foreground">
          No payment is taken now. We reply with a plan and a quote, and you decide
          from there.
        </p>
      </div>
    </form>
  );
}
