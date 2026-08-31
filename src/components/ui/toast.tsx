'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  action?: ToastAction;
  /** 0 keeps the toast until dismissed. Errors default to 0. */
  duration: number;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
  update: (id: string, patch: Partial<Omit<Toast, 'id'>>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/** Errors stay until dismissed — a failure the user missed is a failure repeated. */
const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 0,
  loading: 0,
};

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const schedule = React.useCallback(
    (id: string, duration: number) => {
      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
    },
    [dismiss],
  );

  const push = React.useCallback<ToastContextValue['push']>(
    (input) => {
      const id = `t${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
      const duration = input.duration ?? DEFAULT_DURATION[input.variant];
      setToasts((prev) => [...prev, { ...input, id, duration }]);
      schedule(id, duration);
      return id;
    },
    [schedule],
  );

  const update = React.useCallback<ToastContextValue['update']>(
    (id, patch) => {
      setToasts((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const next = { ...t, ...patch };
          if (patch.variant && patch.duration === undefined) {
            next.duration = DEFAULT_DURATION[patch.variant];
          }
          return next;
        }),
      );
      const duration =
        patch.duration ??
        (patch.variant ? DEFAULT_DURATION[patch.variant] : undefined);
      if (duration !== undefined) schedule(id, duration);
    },
    [schedule],
  );

  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  const value = React.useMemo(
    () => ({ toasts, push, dismiss, update }),
    [toasts, push, dismiss, update],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const ICONS: Record<ToastVariant, typeof Info> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const TONE: Record<ToastVariant, string> = {
  success: 'border-success/30 bg-success-soft text-success',
  error: 'border-destructive/30 bg-destructive-soft text-destructive',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  info: 'border-info/30 bg-info-soft text-info',
  loading: 'border-border bg-card text-muted-foreground',
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  const visible = toasts.slice(-MAX_VISIBLE);
  const hidden = toasts.length - visible.length;

  if (toasts.length === 0) return null;

  return (
    <div
      // Bottom-right on desktop; top-centre on mobile so it clears both the
      // thumb zone and the AI assistant launcher.
      className={cn(
        'pointer-events-none fixed z-[100] flex flex-col gap-2 p-4',
        'inset-x-0 top-0 items-center',
        'sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-auto sm:items-end',
      )}
    >
      {hidden > 0 && (
        <p className="pointer-events-none rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          +{hidden} more
        </p>
      )}
      {visible.map((toast) => (
        <ToastRow key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const Icon = ICONS[toast.variant];
  const touchStart = React.useRef<number | null>(null);

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      onTouchStart={(e) => {
        touchStart.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const end = e.changedTouches[0]?.clientX;
        // Swipe either way past a threshold dismisses.
        if (start !== null && end !== undefined && Math.abs(end - start) > 80) {
          onDismiss(toast.id);
        }
        touchStart.current = null;
      }}
      className={cn(
        'wps-animate-in pointer-events-auto flex w-full max-w-sm items-start gap-3',
        'rounded-field border p-4 shadow-lift',
        'backdrop-blur-sm',
        TONE[toast.variant],
      )}
    >
      <Icon
        className={cn('mt-0.5 h-4.5 w-4.5 shrink-0', toast.variant === 'loading' && 'animate-spin')}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{toast.description}</p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="mt-2 text-sm font-medium underline underline-offset-2 hover:opacity-80"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      {toast.variant !== 'loading' && (
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-opacity hover:opacity-70"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');

  const { push, dismiss, update } = ctx;

  return React.useMemo(
    () => ({
      success: (title: string, description?: string) =>
        push({ variant: 'success', title, description }),
      error: (title: string, description?: string) =>
        push({ variant: 'error', title, description }),
      warning: (title: string, description?: string) =>
        push({ variant: 'warning', title, description }),
      info: (title: string, description?: string) =>
        push({ variant: 'info', title, description }),
      loading: (title: string, description?: string) =>
        push({ variant: 'loading', title, description }),
      dismiss,
      update,
      custom: push,
      /**
       * Drives one toast through an async action: pending → success or error.
       * Keeps the loading and result states in a single visual slot.
       */
      promise: async <T,>(
        work: Promise<T>,
        messages: {
          loading: string;
          success: string | ((value: T) => string);
          error: string | ((error: unknown) => string);
        },
      ): Promise<T> => {
        const id = push({ variant: 'loading', title: messages.loading });
        try {
          const value = await work;
          update(id, {
            variant: 'success',
            title:
              typeof messages.success === 'function'
                ? messages.success(value)
                : messages.success,
          });
          return value;
        } catch (error) {
          update(id, {
            variant: 'error',
            title:
              typeof messages.error === 'function'
                ? messages.error(error)
                : messages.error,
          });
          throw error;
        }
      },
    }),
    [push, dismiss, update],
  );
}
