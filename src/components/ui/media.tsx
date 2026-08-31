import Image from 'next/image';

import { cn } from '@/lib/utils';

export interface MediaRef {
  secureUrl?: string | null;
  url?: string | null;
  altText?: string | null;
}

export function mediaSrc(media: MediaRef | null | undefined): string | null {
  return media?.secureUrl ?? media?.url ?? null;
}

/**
 * Image with an always-present branded fallback.
 *
 * The gradient placeholder is painted underneath rather than swapped in, so it
 * covers both cases with no client JavaScript: a record with no cover image
 * yet, and a URL that fails to load (dead CDN link, blocked host, offline).
 * A card never shows a broken-image box.
 */
export function CoverImage({
  media,
  alt,
  className,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw',
  priority = false,
  fill = true,
}: {
  media: MediaRef | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
}) {
  const src = mediaSrc(media);

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-0 flex items-center justify-center',
          'bg-gradient-to-br from-primary-soft to-muted',
        )}
      >
        <span className="px-4 text-center font-display text-sm font-medium text-primary/50">
          {alt.slice(0, 40)}
        </span>
      </span>

      {src && (
        <Image
          src={src}
          alt={media?.altText ?? alt}
          fill={fill}
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          className={cn('object-cover', className)}
        />
      )}
    </>
  );
}
