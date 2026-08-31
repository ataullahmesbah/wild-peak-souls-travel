// src/components/contest/entry-media.tsx
import { Play } from 'lucide-react';

import { CoverImage, mediaSrc } from '@/components/ui/media';

export interface EntryMediaRef {
  secureUrl?: string | null;
  url?: string | null;
  altText?: string | null;
  type?: string | null;
  width?: number | null;
  height?: number | null;
}

/**
 * One entrant's photo or video.
 *
 * Videos are `preload="metadata"` and carry no `autoPlay`: a voting page can
 * hold ten of them, and ten videos deciding to buffer at once on a phone in
 * Bangladesh is a page nobody waits for. The poster frame Cloudinary generates
 * is what loads; the file itself only downloads when someone presses play.
 *
 * `controlsList="nodownload"` and `onContextMenu` are a courtesy to entrants,
 * not a protection — anything the browser can play can be saved. The real
 * safeguard is that entries carry a visible name.
 */
export function EntryMedia({
  media,
  alt,
  priority = false,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px',
}: {
  media: EntryMediaRef | null | undefined;
  alt: string;
  priority?: boolean;
  sizes?: string;
}) {
  const src = mediaSrc(media);
  const isVideo = media?.type === 'video';

  if (isVideo && src) {
    // Cloudinary renders a still from the video by swapping the extension.
    const poster = src.replace(/\.[a-z0-9]+$/i, '.jpg');
    return (
      <video
        src={src}
        poster={poster}
        controls
        preload="metadata"
        playsInline
        controlsList="nodownload"
        className="h-full w-full bg-black object-cover"
        aria-label={alt}
      >
        Your browser cannot play this video.
      </video>
    );
  }

  return <CoverImage media={media} alt={alt} priority={priority} sizes={sizes} />;
}

/** Small corner marker so a video is recognisable before it loads. */
export function VideoBadge() {
  return (
    <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white">
      <Play className="h-3 w-3 fill-current" aria-hidden="true" />
      Video
    </span>
  );
}
