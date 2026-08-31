'use client';

import * as React from 'react';

import { ButtonLink } from '@/components/ui/button';
import { Container } from '@/components/ui/section';
import { HeroSearch } from '@/components/home/hero-search';
import { cn } from '@/lib/utils';

export interface HeroSlideView {
  id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  overlayOpacity: number;
  textAlign: string;
  primaryCtaText: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaText: string | null;
  secondaryCtaUrl: string | null;
  showSearch: boolean;
  imageUrl: string | null;
}

const ROTATE_MS = 7000;

/**
 * The home page banner, driven entirely from the dashboard.
 *
 * The first slide is rendered as ordinary server-sent markup and its image is
 * eager — it is the largest paint on the site, and lazy-loading it is the
 * difference between a fast home page and a slow one. Later slides are only
 * cross-faded in once JavaScript is running, so with scripting off the page
 * still shows a complete, readable banner rather than an empty box.
 *
 * Rotation stops on hover, on focus, and for anyone who has asked for reduced
 * motion — a carousel that keeps moving while you are reading it is a bug, not
 * a feature.
 */
export function HeroBanner({ slides }: { slides: HeroSlideView[] }) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (slides.length < 2 || paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  const slide = slides[index] ?? slides[0];
  if (!slide) return null;

  const align =
    slide.textAlign === 'left'
      ? 'text-left items-start'
      : slide.textAlign === 'right'
        ? 'text-right items-end ml-auto'
        : 'text-center items-center mx-auto';

  return (
    <section
      className="wps-aurora relative overflow-hidden"
      aria-roledescription={slides.length > 1 ? 'carousel' : undefined}
      aria-label={slides.length > 1 ? 'Highlights' : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slide.imageUrl && (
        <>
          {/*
            A branded gradient sits behind the photo, so a slow or missing image
            leaves a deliberate-looking banner rather than raw alt text on bare
            background. alt="" because the headline already carries the meaning
            — the photo is decoration, and announcing it twice helps nobody.
          */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-secondary via-primary to-secondary"
            aria-hidden="true"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={slide.id}
            src={slide.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: Math.min(90, Math.max(0, slide.overlayOpacity)) / 100 }}
            aria-hidden="true"
          />
        </>
      )}

      <Container className="relative pb-10 pt-14 sm:pb-14 sm:pt-20">
        <div
          className={cn('flex max-w-3xl flex-col gap-5', align)}
          aria-live={slides.length > 1 ? 'polite' : undefined}
        >
          {slide.subtitle && (
            <span
              className={cn(
                'inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium',
                slide.imageUrl
                  ? 'border-white/25 bg-black/30 text-white backdrop-blur-sm'
                  : 'border-border bg-card text-primary',
              )}
            >
              {slide.subtitle}
            </span>
          )}

          <h1
            className={cn(
              'font-display text-3xl font-semibold leading-[1.15] sm:text-5xl',
              slide.imageUrl && 'text-white drop-shadow-sm',
            )}
          >
            {slide.title}
          </h1>

          {slide.body && (
            <p
              className={cn(
                'max-w-2xl text-base leading-relaxed sm:text-lg',
                slide.imageUrl ? 'text-white/90' : 'text-muted-foreground',
              )}
            >
              {slide.body}
            </p>
          )}

          {(slide.primaryCtaUrl || slide.secondaryCtaUrl) && (
            <div className="flex flex-wrap gap-3">
              {slide.primaryCtaUrl && slide.primaryCtaText && (
                <ButtonLink href={slide.primaryCtaUrl}>{slide.primaryCtaText}</ButtonLink>
              )}
              {slide.secondaryCtaUrl && slide.secondaryCtaText && (
                <ButtonLink
                  href={slide.secondaryCtaUrl}
                  variant={slide.imageUrl ? 'secondary' : 'outline'}
                >
                  {slide.secondaryCtaText}
                </ButtonLink>
              )}
            </div>
          )}
        </div>

        {slide.showSearch && (
          <div className="relative mx-auto mt-9 max-w-4xl">
            <HeroSearch />
          </div>
        )}

        {slides.length > 1 && (
          <div className="relative mt-6 flex justify-center gap-1">
            {slides.map((candidate, position) => (
              /*
               * The dot is small; the button is not. A bare 8px control fails
               * the 24px minimum touch target and is genuinely hard to hit on a
               * phone, so the hit area is padded out around the visual dot.
               */
              <button
                key={candidate.id}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Show slide ${position + 1}: ${candidate.title}`}
                aria-current={position === index ? 'true' : undefined}
                className="flex h-11 w-6 items-center justify-center rounded-field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'block h-2 rounded-full transition-all',
                    position === index
                      ? 'w-7 bg-primary'
                      : 'w-2 bg-muted-foreground/50',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

/** The banner shown when no slide is scheduled, so the page is never headless. */
export function HeroFallback({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="wps-aurora relative overflow-hidden">
      <Container className="pb-10 pt-14 sm:pb-14 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-3xl font-semibold leading-[1.15] sm:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
        </div>
        <div className="mx-auto mt-9 max-w-4xl">
          <HeroSearch />
        </div>
        {children}
      </Container>
    </section>
  );
}
