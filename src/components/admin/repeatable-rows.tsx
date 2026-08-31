'use client';

import * as React from 'react';
import { Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/field';

export interface RowField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'money' | 'textarea' | 'hidden';
  required?: boolean;
  placeholder?: string;
  span?: 1 | 2;
}

/**
 * Add-and-remove child rows (itinerary days, room types, ticket options)
 * rendered as plain inputs named `group[index].field`.
 *
 * They stay inside the parent <form> rather than managing their own state
 * tree, which means the browser handles required-field validation and the
 * whole record — parent and children — is saved in one transaction on the
 * server. Rows are keyed by a stable id, not by index, so removing the second
 * of five rows does not shuffle the text of the ones below it.
 */
export function RepeatableRows({
  name,
  legend,
  description,
  fields,
  initialRows = [],
  addLabel = 'Add row',
  emptyLabel,
}: {
  name: string;
  legend: string;
  description?: string;
  fields: RowField[];
  initialRows?: Array<Record<string, string | number | null>>;
  addLabel?: string;
  emptyLabel?: string;
}) {
  const [rows, setRows] = React.useState<
    Array<{ key: string; values: Record<string, string | number | null> }>
  >(() =>
    initialRows.map((values, index) => ({ key: `initial-${index}`, values })),
  );
  const nextKey = React.useRef(0);

  const addRow = () => {
    nextKey.current += 1;
    setRows((current) => [...current, { key: `new-${nextKey.current}`, values: {} }]);
  };

  const removeRow = (key: string) =>
    setRows((current) => current.filter((row) => row.key !== key));

  return (
    <fieldset className="wps-card p-5 sm:p-6">
      <legend className="sr-only">{legend}</legend>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">{legend}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {addLabel}
        </Button>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-field border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyLabel ?? 'None yet.'}
        </p>
      ) : (
        <ol className="space-y-4">
          {rows.map((row, index) => (
            <li
              key={row.key}
              className="relative rounded-field border border-border p-4 pt-11 sm:pt-4"
            >
              <button
                type="button"
                onClick={() => removeRow(row.key)}
                aria-label={`Remove ${legend.toLowerCase()} row ${index + 1}`}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-field text-muted-foreground hover:bg-destructive-soft hover:text-destructive"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>

              <div className="grid gap-4 sm:grid-cols-2 sm:pr-10">
                {fields.map((field) => {
                  const inputName = `${name}[${index}].${field.name}`;
                  const value = row.values[field.name];
                  const defaultValue =
                    value === null || value === undefined ? undefined : value;
                  const span = field.span ?? (field.type === 'textarea' ? 2 : 1);

                  // Carries the existing child's id so a save updates that row
                  // rather than replacing it — never something to type into.
                  if (field.type === 'hidden') {
                    return defaultValue === undefined ? null : (
                      <input
                        key={field.name}
                        type="hidden"
                        name={inputName}
                        defaultValue={defaultValue}
                      />
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <Textarea
                        key={field.name}
                        name={inputName}
                        label={field.label}
                        rows={3}
                        required={field.required}
                        placeholder={field.placeholder}
                        defaultValue={defaultValue}
                        wrapperClassName={span === 2 ? 'sm:col-span-2' : undefined}
                      />
                    );
                  }

                  return (
                    <Input
                      key={field.name}
                      name={inputName}
                      label={field.label}
                      type={field.type === 'text' || !field.type ? 'text' : 'number'}
                      min={field.type === 'money' || field.type === 'number' ? 0 : undefined}
                      step={field.type === 'money' ? '0.01' : undefined}
                      required={field.required}
                      placeholder={field.placeholder}
                      defaultValue={defaultValue}
                      wrapperClassName={span === 2 ? 'sm:col-span-2' : undefined}
                    />
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}
    </fieldset>
  );
}
