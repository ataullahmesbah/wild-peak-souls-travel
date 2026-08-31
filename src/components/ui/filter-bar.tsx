'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  name: string;
  label: string;
  options: FilterOption[];
}

/**
 * Listing filters. Submitting rewrites the query string and lets the server
 * component re-query — no client-side filtering, so results stay consistent
 * with what the database actually permits the visitor to see.
 */
export function FilterBar({
  filters,
  searchPlaceholder = 'Search…',
}: {
  filters: FilterDefinition[];
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const currentQuery = searchParams.get('q') ?? '';
  const activeCount = filters.filter((f) => searchParams.get(f.name)).length;

  const apply = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    apply({ q: String(data.get('q') ?? '') });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <form onSubmit={handleSearch} className="relative flex-1" role="search">
          <label htmlFor="listing-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="listing-search"
            name="q"
            type="search"
            defaultValue={currentQuery}
            placeholder={searchPlaceholder}
            className="h-11 w-full rounded-field border border-border bg-input pl-10 pr-3.5 text-sm placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25"
          />
        </form>

        {filters.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="filter-panel"
            className="sm:w-auto"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        )}
      </div>

      {open && filters.length > 0 && (
        <div
          id="filter-panel"
          className="wps-card wps-animate-in grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {filters.map((filter) => (
            <div key={filter.name}>
              <label
                htmlFor={`filter-${filter.name}`}
                className="block text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {filter.label}
              </label>
              <select
                id={`filter-${filter.name}`}
                value={searchParams.get(filter.name) ?? ''}
                onChange={(e) => apply({ [filter.name]: e.target.value })}
                className="mt-1.5 h-10 w-full rounded-field border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25"
              >
                <option value="">All</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {(activeCount > 0 || currentQuery) && (
        <div className="flex flex-wrap items-center gap-2">
          {currentQuery && (
            <Chip label={`“${currentQuery}”`} onClear={() => apply({ q: '' })} />
          )}
          {filters.map((filter) => {
            const value = searchParams.get(filter.name);
            if (!value) return null;
            const option = filter.options.find((o) => o.value === value);
            return (
              <Chip
                key={filter.name}
                label={`${filter.label}: ${option?.label ?? value}`}
                onClear={() => apply({ [filter.name]: '' })}
              />
            );
          })}
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pl-3 pr-1.5 text-xs font-medium text-primary',
      )}
    >
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove filter ${label}`}
        className="rounded-full p-0.5 hover:bg-primary/15"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}
