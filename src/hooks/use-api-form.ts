'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/toast';

export interface ApiFormState {
  loading: boolean;
  error: string | null;
  success: string | null;
  fieldErrors: Record<string, string[]>;
}

export interface SubmitOptions {
  /** POST creates, PATCH edits. Everything else about the flow is identical. */
  method?: 'POST' | 'PATCH' | 'PUT';
  successMessage?: string;
  redirectTo?: string;
  resetForm?: boolean;
  onSuccess?: (data: unknown) => void;
  /** Set false for forms that render their own prominent result panel. */
  toast?: boolean;
  /**
   * Last chance to reshape the payload before it is sent — used to turn the
   * flat strings a form produces into the numbers, booleans and nested arrays
   * the API expects.
   */
  transform?: (payload: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Single client-side submission path for every form in the product: posts
 * JSON, surfaces server-side field errors under the matching input, and keeps
 * loading/success/error states consistent.
 *
 * The server is always the validator — this only renders what it returns.
 */
export function useApiForm(endpoint: string, options: SubmitOptions = {}) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = React.useState<ApiFormState>({
    loading: false,
    error: null,
    success: null,
    fieldErrors: {},
  });

  const submit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formData = new FormData(form);

      const payload: Record<string, unknown> = {};
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) continue;
        if (key in payload) {
          const existing = payload[key];
          payload[key] = Array.isArray(existing)
            ? [...existing, value]
            : [existing, value];
        } else {
          payload[key] = value;
        }
      }
      // Unchecked checkboxes are absent from FormData; normalise them so the
      // server sees an explicit false rather than undefined.
      for (const element of Array.from(form.elements)) {
        if (
          element instanceof HTMLInputElement &&
          element.type === 'checkbox' &&
          element.name
        ) {
          payload[element.name] = element.checked;
        }
      }

      const body = options.transform ? options.transform(payload) : payload;

      setState({ loading: true, error: null, success: null, fieldErrors: {} });

      try {
        const response = await fetch(endpoint, {
          method: options.method ?? 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
          fieldErrors?: Record<string, string[]>;
          data?: unknown;
        };

        if (!response.ok) {
          const message = result.error ?? 'Something went wrong. Please try again.';
          setState({
            loading: false,
            error: message,
            success: null,
            fieldErrors: result.fieldErrors ?? {},
          });
          // Inline errors stay for field-level detail; the toast makes sure a
          // failure is never missed because the message scrolled out of view.
          if (options.toast !== false) toast.error(message);
          return;
        }

        const successMessage = options.successMessage ?? 'Saved successfully.';
        setState({
          loading: false,
          error: null,
          success: successMessage,
          fieldErrors: {},
        });
        if (options.toast !== false) toast.success(successMessage);

        // An edit form must keep showing what was just saved; only a create
        // form starts over.
        const shouldReset =
          options.resetForm ?? (options.method ?? 'POST') === 'POST';
        if (shouldReset) form.reset();
        options.onSuccess?.(result.data);

        if (options.redirectTo) {
          router.push(options.redirectTo);
          router.refresh();
        } else {
          router.refresh();
        }
      } catch {
        const message =
          'We could not reach the server. Check your connection and try again.';
        setState({
          loading: false,
          error: message,
          success: null,
          fieldErrors: {},
        });
        if (options.toast !== false) toast.error(message);
      }
    },
    [endpoint, options, router, toast],
  );

  return { ...state, submit };
}
