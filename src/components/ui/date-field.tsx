'use client';

import * as React from 'react';
import { CalendarDays } from 'lucide-react';

import { FieldWrapper } from '@/components/ui/field';
import { cn, formatDateLong } from '@/lib/utils';

/**
 * A date input that says back what it heard.
 *
 * The control itself is the native `<input type="date">`, deliberately: it
 * gives a real calendar, works with a keyboard and a screen reader, and on a
 * phone opens the picker the person already knows. What it does not do is show
 * the date in a form anyone can read — `27/09/2026` is ambiguous to half the
 * world — so the chosen date is echoed underneath in full, which is where date
 * mistakes actually get caught.
 */
export function DateField({
  name,
  label,
  value,
  defaultValue,
  onChange,
  required,
  min,
  max,
  hint,
  error,
  withTime = false,
  className,
}: {
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  min?: string;
  max?: string;
  hint?: string;
  error?: string | string[];
  /** Use datetime-local when the time of day matters. */
  withTime?: boolean;
  className?: string;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? '');
  const current = value ?? internal;
  const id = `date-${name}`;

  const echo = current ? formatDateLong(current) : null;

  return (
    <FieldWrapper
      id={id}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={className}
    >
      <div className="relative">
        <CalendarDays
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id={id}
          name={name}
          type={withTime ? 'datetime-local' : 'date'}
          required={required}
          min={min}
          max={max}
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          onChange={(event) => {
            setInternal(event.target.value);
            onChange?.(event.target.value);
          }}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={echo ? `${id}-echo` : undefined}
          className={cn(
            'h-11 w-full rounded-field border border-border bg-input pl-10 pr-3.5 text-sm',
            'transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25',
            'aria-[invalid=true]:border-destructive',
          )}
        />
      </div>

      {echo && (
        <p id={`${id}-echo`} className="text-xs font-medium text-primary">
          {echo}
        </p>
      )}
    </FieldWrapper>
  );
}
