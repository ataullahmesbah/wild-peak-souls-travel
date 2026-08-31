// src/app/(site)/guides/page.tsx
import { permanentRedirect } from 'next/navigation';

/**
 * The guides section is now the blog.
 *
 * A 308 rather than a second copy of the listing: two URLs serving the same
 * articles splits their search ranking, and every existing link — the old
 * footer, a bookmark, a search result — has to keep working.
 */
export default function GuidesIndexRedirect(): never {
  permanentRedirect('/blog');
}
