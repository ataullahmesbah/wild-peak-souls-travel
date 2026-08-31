'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, Megaphone, ShieldAlert, X } from 'lucide-react';

import { Container } from '@/components/ui/section';
import { cn } from '@/lib/utils';

interface Notice {
  id: string;
  title: string;
  message: string;
  type: string;
  ctaText: string | null;
  ctaUrl: string | null;
}

const TONE: Record<string, { className: string; Icon: typeof Info }> = {
  INFO: { className: 'bg-info-soft text-info', Icon: Info },
  SUCCESS: { className: 'bg-success-soft text-success', Icon: Megaphone },
  WARNING: { className: 'bg-warning-soft text-warning', Icon: AlertTriangle },
  IMPORTANT: { className: 'bg-primary-soft text-primary', Icon: Megaphone },
  MAINTENANCE: { className: 'bg-destructive-soft text-destructive', Icon: ShieldAlert },
};

const STORAGE_KEY = 'wps-dismissed-notices';
const DISMISS_EVENT = 'wps-notice-dismissed';

/**
 * Dismissed notices live in localStorage, which is an external store. Reading
 * it through `useSyncExternalStore` gives the correct value on the first client
 * render — no effect, and no flash of an already-dismissed notice.
 */
const dismissedStore = {
  subscribe(onChange: () => void): () => void {
    window.addEventListener('storage', onChange);
    window.addEventListener(DISMISS_EVENT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(DISMISS_EVENT, onChange);
    };
  },
  getSnapshot(): string {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? '[]';
    } catch {
      // Storage unavailable — showing all notices is the safe default.
      return '[]';
    }
  },
  // The server cannot know what this visitor dismissed; the first client render
  // corrects it immediately.
  getServerSnapshot(): string {
    return '[]';
  },
};

export function NoticeBar({ notices }: { notices: Notice[] }) {
  const raw = React.useSyncExternalStore(
    dismissedStore.subscribe,
    dismissedStore.getSnapshot,
    dismissedStore.getServerSnapshot,
  );

  const dismissed = React.useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }, [raw]);

  const dismiss = (id: string) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...dismissed, id].slice(-40)),
      );
    } catch {
      // Non-fatal — the notice simply reappears next visit.
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  };

  const visible = notices.filter((n) => !dismissed.includes(n.id));
  if (visible.length === 0) return null;

  return (
    <div>
      {visible.map((notice) => {
        const tone = TONE[notice.type] ?? TONE.INFO!;
        const Icon = tone.Icon;
        return (
          <div key={notice.id} className={cn('border-b border-border', tone.className)}>
            <Container>
              <div className="flex items-center gap-3 py-2.5 text-sm">
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="min-w-0 flex-1">
                  <span className="font-medium">{notice.title}</span>
                  <span className="ml-2">{notice.message}</span>
                  {notice.ctaUrl && notice.ctaText && (
                    <Link
                      href={notice.ctaUrl}
                      className="ml-2 font-medium underline underline-offset-2"
                    >
                      {notice.ctaText}
                    </Link>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => dismiss(notice.id)}
                  aria-label={`Dismiss notice: ${notice.title}`}
                  className="shrink-0 rounded p-1 transition-opacity hover:opacity-70"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </Container>
          </div>
        );
      })}
    </div>
  );
}
