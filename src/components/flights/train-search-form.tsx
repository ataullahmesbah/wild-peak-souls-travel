'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function TrainSearchForm({
  stations,
  defaults,
}: {
  stations: string[];
  defaults: { from?: string; to?: string };
}) {
  const router = useRouter();
  const [from, setFrom] = React.useState(defaults.from ?? '');
  const [to, setTo] = React.useState(defaults.to ?? '');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    router.push(qs ? `/train-schedule?${qs}` : '/train-schedule');
  };

  const fieldClass =
    'mt-1.5 h-11 w-full rounded-field border border-border bg-input px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25';

  return (
    <form
      onSubmit={handleSubmit}
      className="wps-card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <div>
        <label htmlFor="train-from" className="block text-sm font-medium">
          From station
        </label>
        <select id="train-from" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClass}>
          <option value="">Any station</option>
          {stations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="train-to" className="block text-sm font-medium">
          To station
        </label>
        <select id="train-to" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClass}>
          <option value="">Any station</option>
          {stations
            .filter((s) => s !== from)
            .map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
        </select>
      </div>
      <Button type="submit" size="lg">
        <Search className="h-4 w-4" aria-hidden="true" />
        Find trains
      </Button>
    </form>
  );
}
