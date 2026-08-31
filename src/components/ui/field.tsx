'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

const fieldBase =
  'w-full rounded-field border border-border bg-input px-3.5 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/70 transition-colors duration-200 ' +
  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/25';

export interface FieldWrapperProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | string[];
  className?: string;
  children: React.ReactNode;
}

/**
 * Every form control in the product goes through this wrapper so that labels,
 * required markers, hints and error announcements are consistent and
 * screen-reader correct — placeholders are never the only label.
 */
export function FieldWrapper({
  id,
  label,
  required,
  hint,
  error,
  className,
  children,
}: FieldWrapperProps) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !message && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {message && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium text-destructive"
        >
          {message}
        </p>
      )}
    </div>
  );
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | string[];
  wrapperClassName?: string;
}

export function Input({
  id,
  label,
  hint,
  error,
  className,
  wrapperClassName,
  required,
  ...props
}: InputProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');
  const hasError = Boolean(error);
  return (
    <FieldWrapper
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={wrapperClassName}
    >
      <input
        id={fieldId}
        className={cn(fieldBase, 'h-11', className)}
        aria-invalid={hasError || undefined}
        aria-describedby={
          hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
        }
        required={required}
        {...props}
      />
    </FieldWrapper>
  );
}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string | string[];
  wrapperClassName?: string;
}

export function Textarea({
  id,
  label,
  hint,
  error,
  className,
  wrapperClassName,
  required,
  rows = 4,
  ...props
}: TextareaProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');
  const hasError = Boolean(error);
  return (
    <FieldWrapper
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={wrapperClassName}
    >
      <textarea
        id={fieldId}
        rows={rows}
        className={cn(fieldBase, 'py-2.5 resize-y', className)}
        aria-invalid={hasError || undefined}
        aria-describedby={
          hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
        }
        required={required}
        {...props}
      />
    </FieldWrapper>
  );
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string | string[];
  wrapperClassName?: string;
}

export function Select({
  id,
  label,
  hint,
  error,
  className,
  wrapperClassName,
  required,
  children,
  ...props
}: SelectProps) {
  const fieldId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, '-');
  const hasError = Boolean(error);
  return (
    <FieldWrapper
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      className={wrapperClassName}
    >
      <select
        id={fieldId}
        className={cn(fieldBase, 'h-11 pr-9 appearance-none bg-no-repeat', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundPosition: 'right 0.85rem center',
        }}
        aria-invalid={hasError || undefined}
        aria-describedby={
          hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
        }
        required={required}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}

export function Checkbox({
  id,
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: React.ReactNode;
  error?: string | string[];
}) {
  const fieldId = id ?? props.name ?? 'checkbox';
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2.5">
        <input
          id={fieldId}
          type="checkbox"
          className={cn(
            'mt-0.5 h-4.5 w-4.5 shrink-0 rounded border-border text-primary',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            className,
          )}
          aria-invalid={Boolean(message) || undefined}
          {...props}
        />
        <label htmlFor={fieldId} className="text-sm leading-snug text-foreground">
          {label}
        </label>
      </div>
      {message && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

/** Inline form-level status message (success or error). */
export function FormMessage({
  tone,
  children,
}: {
  tone: 'success' | 'error';
  children: React.ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-field border px-3.5 py-3 text-sm',
        tone === 'error'
          ? 'border-destructive/30 bg-destructive-soft text-destructive'
          : 'border-success/30 bg-success-soft text-success',
      )}
    >
      {children}
    </div>
  );
}
