'use client';

import * as React from 'react';

/**
 * Counts up when scrolled into view. Respects reduced-motion by rendering the
 * final value immediately rather than animating.
 */
function useCountUp(target: number, durationMs = 1200): number {
  // Reduced-motion and zero targets need no animation at all, so the final
  // value is the initial state rather than something an effect writes back.
  const [prefersReducedMotion] = React.useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const skipAnimation = prefersReducedMotion || target === 0;

  const [value, setValue] = React.useState(() => (skipAnimation ? target : 0));

  React.useEffect(() => {
    if (skipAnimation) return;

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // Ease-out cubic so the number decelerates into place.
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, skipAnimation]);

  return value;
}

function Stat({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  const [visible, setVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-3xl font-semibold text-primary sm:text-4xl">
        {visible ? <Counter target={value} /> : 0}
        {suffix}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function Counter({ target }: { target: number }) {
  const value = useCountUp(target);
  return <>{value.toLocaleString()}</>;
}

export function StatsBand({
  stats,
}: {
  stats: { destinations: number; events: number; tours: number; travellers: number };
}) {
  return (
    <div className="grid grid-cols-2 gap-6 rounded-card border border-border bg-card p-8 sm:grid-cols-4">
      <Stat value={stats.destinations} label="Destinations covered" suffix="+" />
      <Stat value={stats.tours} label="Curated tour packages" suffix="+" />
      <Stat value={stats.events} label="Group departures run" suffix="+" />
      <Stat value={stats.travellers} label="Confirmed travellers" suffix="+" />
    </div>
  );
}
