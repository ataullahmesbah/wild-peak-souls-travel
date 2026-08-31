// src/components/admin/resource-form.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Checkbox, FormMessage, Input, Select, Textarea } from '@/components/ui/field';
import { DateField } from '@/components/ui/date-field';
import { ImageField } from '@/components/admin/image-field';
import { MarkdownEditor } from '@/components/admin/markdown-editor';
import { useApiForm } from '@/hooks/use-api-form';
import { cn } from '@/lib/utils';

/**
 * A form described as data rather than markup.
 *
 * Twelve catalogue modules need the same form: a grid of typed fields, server
 * field errors under the right input, a save button and a cancel link. Writing
 * that twelve times guarantees twelve slightly different behaviours, so it is
 * written once and each module supplies only its field list.
 *
 * Types matter here because an HTML form only ever produces strings. A `number`
 * field must reach the API as a number or Zod rejects it, and an empty optional
 * field must be omitted rather than sent as "" — that is what `serialise` below
 * is for.
 */
export type FieldType =
  | 'text'
  | 'slug'
  | 'email'
  | 'url'
  | 'textarea'
  | 'number'
  | 'money'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'time'
  | 'image'
  | 'markdown';

export interface FieldSpec {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  /** Cloudinary sub-folder for an `image` field. */
  folder?:
  | 'destinations'
  | 'events'
  | 'tours'
  | 'activities'
  | 'stays'
  | 'hero'
  | 'ads'
  | 'blog'
  | 'contest'
  | 'misc';
  /** Column span within the 2-column grid. Defaults to 1, textareas to 2. */
  span?: 1 | 2;
}

export interface FieldGroup {
  title?: string;
  description?: string;
  fields: FieldSpec[];
}

export type ResourceValues = Record<string, string | number | boolean | null | undefined>;

/** Everything the browser sends is a string; the API expects real types. */
function serialise(
  payload: Record<string, unknown>,
  groups: FieldGroup[],
): Record<string, unknown> {
  const specs = new Map<string, FieldSpec>();
  for (const group of groups) {
    for (const field of group.fields) specs.set(field.name, field);
  }

  const out: Record<string, unknown> = {};
  // Repeatable child rows arrive as flat inputs named `itinerary[0].title`.
  // Collecting them here keeps everything inside one <form>, so the browser's
  // own validation, reset and submit behaviour still applies to child rows.
  const nested = new Map<string, Map<number, Record<string, unknown>>>();

  for (const [key, raw] of Object.entries(payload)) {
    const match = /^([A-Za-z]+)\[(\d+)\]\.([A-Za-z]+)$/.exec(key);
    if (match) {
      const [, group, index, field] = match as unknown as [string, string, string, string];
      const rows = nested.get(group) ?? new Map<number, Record<string, unknown>>();
      const row = rows.get(Number(index)) ?? {};
      const value = typeof raw === 'string' ? raw.trim() : raw;
      if (value !== '') row[field] = NUMERIC_CHILD_FIELDS.has(field) ? Number(value) : value;
      rows.set(Number(index), row);
      nested.set(group, rows);
      continue;
    }

    const spec = specs.get(key);
    if (!spec) {
      out[key] = raw;
      continue;
    }

    if (spec.type === 'checkbox') {
      out[key] = Boolean(raw);
      continue;
    }

    // An image field always submits, so an empty value is a deliberate
    // "remove the picture" and has to reach the API as null — omitting it
    // would leave the old image attached.
    if (spec.type === 'image') {
      const id = typeof raw === 'string' ? raw.trim() : '';
      out[key] = id === '' ? null : id;
      continue;
    }

    const value = typeof raw === 'string' ? raw.trim() : raw;

    // An untouched optional field is absent, not empty. Sending "" would fail
    // a string-format check (a URL, an email) that the user never filled in.
    if (value === '' || value === undefined) {
      if (spec.required) out[key] = value;
      continue;
    }

    if (spec.type === 'number' || spec.type === 'money') {
      const parsed = Number(value);
      out[key] = Number.isNaN(parsed) ? value : parsed;
      continue;
    }

    if (spec.type === 'datetime' && typeof value === 'string') {
      // <input type="datetime-local"> has no zone; the API wants an instant.
      const parsed = new Date(value);
      out[key] = Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
      continue;
    }

    if (spec.type === 'date' && typeof value === 'string') {
      out[key] = `${value}T00:00:00.000Z`;
      continue;
    }

    out[key] = value;
  }

  for (const [group, rows] of nested) {
    out[group] = [...rows.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, row]) => row)
      // A row the editor added and then left blank is not a row.
      .filter((row) => Object.keys(row).length > 0);
  }

  return out;
}

/** Child-row fields that must reach the API as numbers, not strings. */
const NUMERIC_CHILD_FIELDS = new Set([
  'dayNumber',
  'price',
  'capacity',
  'totalUnits',
]);

function defaultValue(
  field: FieldSpec,
  values: ResourceValues,
): string | number | undefined {
  const raw = values[field.name];
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === 'boolean') return undefined;

  if (field.type === 'datetime' && typeof raw === 'string') {
    // Trim an ISO instant back to what datetime-local accepts.
    return raw.slice(0, 16);
  }
  if (field.type === 'date' && typeof raw === 'string') return raw.slice(0, 10);
  return raw;
}

export function ResourceForm({
  endpoint,
  method = 'POST',
  groups,
  values = {},
  submitLabel,
  cancelHref,
  redirectTo,
  successMessage,
  children,
}: {
  endpoint: string;
  method?: 'POST' | 'PATCH';
  groups: FieldGroup[];
  values?: ResourceValues;
  submitLabel?: string;
  cancelHref: string;
  redirectTo?: string;
  successMessage?: string;
  children?: React.ReactNode;
}) {
  const transform = React.useCallback(
    (payload: Record<string, unknown>) => serialise(payload, groups),
    [groups],
  );

  const form = useApiForm(endpoint, {
    method,
    redirectTo,
    successMessage:
      successMessage ?? (method === 'POST' ? 'Created successfully.' : 'Changes saved.'),
    transform,
  });

  return (
    <form onSubmit={form.submit} className="space-y-6" noValidate>
      {groups.map((group, index) => (
        <section key={group.title ?? index} className="wps-card p-5 sm:p-6">
          {group.title && (
            <header className="mb-5">
              <h2 className="font-display text-base font-semibold">{group.title}</h2>
              {group.description && (
                <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
              )}
            </header>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            {group.fields.map((field) => (
              <FieldControl
                key={field.name}
                field={field}
                values={values}
                error={form.fieldErrors[field.name]}
              />
            ))}
          </div>
        </section>
      ))}

      {children}

      {form.error && <FormMessage tone="error">{form.error}</FormMessage>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={form.loading}>
          {submitLabel ?? (method === 'POST' ? 'Create' : 'Save changes')}
        </Button>
        <Link
          href={cancelHref}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function FieldControl({
  field,
  values,
  error,
}: {
  field: FieldSpec;
  values: ResourceValues;
  error?: string[];
}) {
  const type = field.type ?? 'text';
  const span = field.span ?? (type === 'textarea' ? 2 : 1);
  const wrapper = cn(span === 2 && 'sm:col-span-2');

  if (type === 'checkbox') {
    return (
      <div className={cn(wrapper, 'flex items-center')}>
        <Checkbox
          name={field.name}
          label={field.label}
          defaultChecked={Boolean(values[field.name])}
          error={error}
        />
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <Textarea
        name={field.name}
        label={field.label}
        rows={field.rows ?? 4}
        required={field.required}
        hint={field.hint}
        placeholder={field.placeholder}
        defaultValue={defaultValue(field, values)}
        error={error}
        wrapperClassName={wrapper}
      />
    );
  }

  if (type === 'select') {
    return (
      <Select
        name={field.name}
        label={field.label}
        required={field.required}
        hint={field.hint}
        defaultValue={defaultValue(field, values)}
        error={error}
        wrapperClassName={wrapper}
      >
        {!field.required && <option value="">— none —</option>}
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    );
  }

  if (type === 'image') {
    return (
      <ImageField
        name={field.name}
        label={field.label}
        folder={field.folder}
        hint={field.hint}
        defaultMediaId={
          typeof values[field.name] === 'string' ? String(values[field.name]) : null
        }
        // The edit page supplies the current image's URL under `<name>Url`,
        // which is why a preview appears on an existing record.
        defaultUrl={
          typeof values[`${field.name}Url`] === 'string'
            ? String(values[`${field.name}Url`])
            : null
        }
        error={error}
        className={cn(wrapper, 'sm:col-span-2')}
      />
    );
  }

  if (type === 'markdown') {
    return (
      <MarkdownEditor
        name={field.name}
        label={field.label}
        required={field.required}
        hint={field.hint}
        rows={field.rows ?? 18}
        error={error}
        defaultValue={
          defaultValue(field, values) === undefined
            ? ''
            : String(defaultValue(field, values))
        }
      />
    );
  }

  // Dates get the field that echoes the chosen day back in full — the place
  // where a mistyped year is actually noticed.
  if (type === 'date' || type === 'datetime') {
    return (
      <DateField
        name={field.name}
        label={field.label}
        withTime={type === 'datetime'}
        required={field.required}
        hint={field.hint}
        defaultValue={
          defaultValue(field, values) === undefined
            ? undefined
            : String(defaultValue(field, values))
        }
        error={error}
        className={wrapper}
      />
    );
  }

  // date and datetime are handled above by DateField.
  const inputType =
    type === 'money' || type === 'number'
      ? 'number'
      : type === 'time'
        ? 'time'
        : type === 'email'
          ? 'email'
          : type === 'url'
            ? 'url'
            : 'text';

  return (
    <Input
      name={field.name}
      label={field.label}
      type={inputType}
      required={field.required}
      hint={field.hint}
      placeholder={field.placeholder}
      min={field.min ?? (type === 'money' || type === 'number' ? 0 : undefined)}
      max={field.max}
      step={field.step ?? (type === 'money' ? '0.01' : undefined)}
      defaultValue={defaultValue(field, values)}
      error={error}
      wrapperClassName={wrapper}
      inputMode={type === 'money' || type === 'number' ? 'decimal' : undefined}
      pattern={type === 'slug' ? '[a-z0-9-]+' : undefined}
    />
  );
}
