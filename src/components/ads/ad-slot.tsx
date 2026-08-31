'use client';

import * as React from 'react';

/**
 * Shows an advertisement at most as often as its frequency cap allows.
 *
 * The count is kept per browser rather than per account, because the same cap
 * has to apply to visitors who are not signed in — most of them. A SESSION cap
 * uses sessionStorage so it resets with the tab; DAY, WEEK and EVER use
 * localStorage with the counting window stored alongside the count.
 *
 * The decision cannot be made on the server, which has no per-viewer storage
 * to read, so the slot renders nothing until the client has checked. Rendering
 * the ad and then removing it would flash a creative at someone who has
 * already hit their cap, which is worse than never showing it.
 *
 * Storage that throws (private mode, blocked site data) is treated as "show
 * it": failing open on an advert is a marketing question, not a safety one.
 */
export function AdSlot({
  adId,
  frequency,
  window: cap,
  children,
}: {
  adId: string;
  /** 0 means no limit. */
  frequency: number;
  window: 'SESSION' | 'DAY' | 'WEEK' | 'EVER';
  children: React.ReactNode;
}) {
  const storageKey = `wps.ad.${adId}`;

  // The cap lives in browser storage, which is an external store rather than
  // React state — reading it with useSyncExternalStore instead of an effect
  // means one render pass and no server/client mismatch. Nothing subscribes,
  // so the answer is settled on mount and does not change underfoot while the
  // creative is on screen.
  const underCap = React.useSyncExternalStore(
    noSubscribe,
    () => isUnderCap(storageKey, frequency, cap),
    () => false,
  );

  React.useEffect(() => {
    if (!underCap) return;
    recordImpression(storageKey, cap);

    // Fire and forget: a failed impression count must never hold up a page.
    void fetch('/api/ads/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adId }),
      keepalive: true,
    }).catch(() => {});
  }, [underCap, storageKey, cap, adId]);

  if (!underCap) return null;
  return <div className="wps-animate-in">{children}</div>;
}

/** Storage never changes while a page is open, so there is nothing to watch. */
function noSubscribe(): () => void {
  return () => {};
}

function storeFor(cap: string): Storage | null {
  try {
    return cap === 'SESSION' ? window.sessionStorage : window.localStorage;
  } catch {
    // Private mode or blocked site data.
    return null;
  }
}

function isUnderCap(
  key: string,
  frequency: number,
  cap: 'SESSION' | 'DAY' | 'WEEK' | 'EVER',
): boolean {
  if (frequency <= 0) return true;

  const store = storeFor(cap);
  if (!store) return true;

  try {
    const raw = store.getItem(key);
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { bucket: string; seen: number };
    if (parsed.bucket !== currentBucket(cap)) return true;
    return parsed.seen < frequency;
  } catch {
    return true;
  }
}

function recordImpression(key: string, cap: 'SESSION' | 'DAY' | 'WEEK' | 'EVER'): void {
  const store = storeFor(cap);
  if (!store) return;

  try {
    const bucket = currentBucket(cap);
    const raw = store.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as { bucket: string; seen: number }) : null;
    const seen = parsed && parsed.bucket === bucket ? parsed.seen : 0;
    store.setItem(key, JSON.stringify({ bucket, seen: seen + 1 }));
  } catch {
    // Nothing to do — the cap simply will not hold for this viewer.
  }
}

/** The identifier for the current counting window. */
function currentBucket(cap: 'SESSION' | 'DAY' | 'WEEK' | 'EVER'): string {
  if (cap === 'EVER' || cap === 'SESSION') return 'all';

  const now = new Date();
  if (cap === 'DAY') return now.toISOString().slice(0, 10);

  // ISO week, so the window rolls on the same day for everyone rather than
  // seven days after each viewer's own first impression.
  const target = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${target.getUTCFullYear()}-W${week}`;
}
