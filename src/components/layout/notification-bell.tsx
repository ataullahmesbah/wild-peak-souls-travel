// src/components/layout/notification-bell.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2 } from 'lucide-react';

import { cn, relativeTime } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * The bell opens a popup rather than navigating away.
 *
 * Someone checking whether anything needs them should not lose the page they
 * were working on to find out. The feed is fetched when the popup is first
 * opened — not on every page load — so the badge count rendered by the server
 * is what people see until they ask for detail.
 *
 * Opening the popup marks the listed notifications read, which is what clears
 * the badge. That is deliberate: seeing them is the point, and a count that
 * survives being read is a count people learn to ignore.
 */
export function NotificationBell({
  initialUnread,
  allHref = '/dashboard/notifications',
}: {
  initialUnread: number;
  allHref?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(initialUnread);
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // The server's count is the source of truth on every navigation; local state
  // only carries the change made since this popup was last opened. Adjusting it
  // during render (React's own pattern for state derived from a prop) rather
  // than in an effect avoids a second render pass on every page load.
  const [lastServerCount, setLastServerCount] = React.useState(initialUnread);
  if (initialUnread !== lastServerCount) {
    setLastServerCount(initialUnread);
    setUnread(initialUnread);
  }

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next) {
      setOffsetLeft(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { items: NotificationItem[]; unread: number };
      };
      const feed = body.data?.items ?? [];
      setItems(feed);

      if ((body.data?.unread ?? 0) > 0) {
        await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ all: true }),
        });
        setUnread(0);
        router.refresh();
      } else {
        setUnread(body.data?.unread ?? 0);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  // Where the panel sits horizontally, measured rather than assumed.
  //
  // Anchoring it to the button's right edge put it 124px off the left of a
  // 390px screen, because the bell is not the rightmost thing in the header —
  // a theme toggle and an avatar come after it. Measuring and clamping to the
  // viewport is the only approach that survives both headers and any brand
  // name length.
  //
  // Done in a ref callback rather than an effect: the measurement happens as
  // the panel attaches, so it is positioned before the browser paints it, and
  // there is no second render pass.
  const [offsetLeft, setOffsetLeft] = React.useState<number | null>(null);

  const placePanel = React.useCallback((panel: HTMLDivElement | null) => {
    const button = buttonRef.current;
    if (!panel || !button) return;

    const rect = button.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(352, window.innerWidth - margin * 2);

    // Right-aligned to the bell where there is room, pulled back inside the
    // screen where there is not.
    const preferred = rect.right - width;
    const clamped = Math.max(
      margin,
      Math.min(preferred, window.innerWidth - width - margin),
    );

    setOffsetLeft(clamped - rect.left);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex h-10 w-10 items-center justify-center rounded-field text-foreground transition-colors hover:bg-muted"
      >
        <Bell className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={placePanel}
          role="menu"
          aria-label="Notifications"
          className={cn(
            'wps-animate-in absolute top-full z-50 mt-2 overflow-hidden rounded-card border border-border bg-card shadow-lift',
            // Hidden until measured, so it never paints in the wrong place.
            offsetLeft === null && 'invisible',
          )}
          style={{
            left: offsetLeft ?? 0,
            width: 'min(22rem, calc(100vw - 1.5rem))',
          }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <Link
              href={allHref}
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              See all
            </Link>
          </div>

          <div className="max-h-[22rem] overflow-y-auto">
            {loading && items === null ? (
              <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading
              </p>
            ) : items && items.length > 0 ? (
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const body = (
                    <>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {item.message}
                      </p>
                      <p className="mt-1 text-[0.7rem] text-muted-foreground">
                        {relativeTime(item.createdAt)}
                      </p>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {item.link ? (
                        <Link
                          href={item.link}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-3 transition-colors hover:bg-muted/60"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="px-4 py-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
                <Check className="h-5 w-5 text-success" aria-hidden="true" />
                Nothing new. You are all caught up.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
