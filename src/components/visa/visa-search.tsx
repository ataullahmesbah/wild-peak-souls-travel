'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Country {
  slug: string;
  name: string;
  types: Array<{ slug: string; name: string }>;
}

/** Country → visa type → go. The type list narrows to the chosen country. */
export function VisaSearch({ countries }: { countries: Country[] }) {
  const router = useRouter();
  const [countrySlug, setCountrySlug] = React.useState('');
  const [typeSlug, setTypeSlug] = React.useState('');

  const country = countries.find((c) => c.slug === countrySlug);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (countrySlug && typeSlug) {
      router.push(`/visa/${countrySlug}/${typeSlug}`);
    }
  };

  if (countries.length === 0) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="wps-card grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
    >
      <div>
        <label htmlFor="visa-country" className="block text-sm font-medium">
          Country
        </label>
        <select
          id="visa-country"
          value={countrySlug}
          onChange={(e) => {
            setCountrySlug(e.target.value);
            setTypeSlug('');
          }}
          className="mt-1.5 h-11 w-full rounded-field border border-border bg-input px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25"
        >
          <option value="">Select a country</option>
          {countries.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="visa-type" className="block text-sm font-medium">
          Visa type
        </label>
        <select
          id="visa-type"
          value={typeSlug}
          onChange={(e) => setTypeSlug(e.target.value)}
          disabled={!country}
          className="mt-1.5 h-11 w-full rounded-field border border-border bg-input px-3.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-55"
        >
          <option value="">
            {country ? 'Select a visa type' : 'Choose a country first'}
          </option>
          {country?.types.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" size="lg" disabled={!countrySlug || !typeSlug}>
        <Search className="h-4 w-4" aria-hidden="true" />
        Search
      </Button>
    </form>
  );
}
