'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CalendarCheck,
  CreditCard,
  FileCheck2,
  LifeBuoy,
  Megaphone,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn, relativeTime } from '@/lib/utils';

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const ICONS: Record<string, typeof Bell> = {
  BOOKING: CalendarCheck,
  PAYMENT: CreditCard,
  VISA: FileCheck2,
  SUPPORT: LifeBuoy,
  MESSAGE: MessageSquare,
  MARKETING: Megaphone,
  SECURITY: ShieldAlert,
  SYSTEM: Bell,
  ADMIN: Bell,
};

export function NotificationList({
  notifications,
}: {
  notifications: NotificationView[];
}) {
  const router = useRouter();
  // Optimistic local read state so the badge and row update immediately, with
  // the server call following behind.
  const [readIds, setReadIds] = React.useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = React.useState(false);

  const isRead = (n: NotificationView) => Boolean(n.readAt) || readIds.has(n.id);
  const unread = notifications.filter((n) => !isRead(n));

  const markRead = React.useCallback(
    async (id: string) => {
      setReadIds((prev) => new Set(prev).add(id));
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      }).catch(() => undefined);
      router.refresh();
    },
    [router],
  );

  const markAll = async () => {
    setMarkingAll(true);
    setReadIds(new Set(notifications.map((n) => n.id)));
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    }).catch(() => undefined);
    setMarkingAll(false);
    router.refresh();
  };

  return (
    <div>
      {unread.length > 0 && (
        <div className="mb-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={markAll} loading={markingAll}>
            Mark all as read
          </Button>
        </div>
      )}

      <ul className="divide-y divide-border">
        {notifications.map((notification) => {
          const Icon = ICONS[notification.type] ?? Bell;
          const read = isRead(notification);

          const inner = (
            <div
              className={cn(
                '-mx-2 flex gap-3 rounded-lg px-2 py-3.5 transition-colors',
                !read && 'bg-primary-soft/40',
                notification.link && 'hover:bg-muted/60',
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                  read
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-primary-soft text-primary',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn('text-sm', read ? 'font-normal' : 'font-semibold')}>
                  {notification.title}
                  {!read && (
                    <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {notification.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {relativeTime(notification.createdAt)}
                </p>
              </div>
              {!read && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void markRead(notification.id);
                  }}
                  className="shrink-0 self-start text-xs font-medium text-primary hover:underline"
                >
                  Mark read
                </button>
              )}
            </div>
          );

          return (
            <li key={notification.id}>
              {notification.link ? (
                <Link
                  href={notification.link}
                  onClick={() => {
                    if (!read) void markRead(notification.id);
                  }}
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
