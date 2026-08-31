// src/lib/markdown.tsx
import * as React from 'react';

/**
 * A small, deliberately closed Markdown renderer for blog post bodies.
 *
 * It returns React elements. Nothing here ever goes through
 * `dangerouslySetInnerHTML`, and raw HTML in the source is rendered as text
 * rather than parsed. That is the whole security argument: a post author —
 * which now includes the MODERATOR role — cannot inject a script tag, an
 * onerror attribute, or a `javascript:` link, because there is no code path
 * that turns their input into markup. A general-purpose Markdown library plus
 * a sanitiser would need to be right every time; this cannot be wrong.
 *
 * Supported, because a real article needs it:
 *   ## … ######   headings (with anchor ids)
 *   paragraphs, **bold**, *italic*, `code`, [links](…)
 *   ![alt](url)   images, on their own line, rendered as a figure
 *   - / 1.        bullet and numbered lists
 *   >             block quotes
 *   ```           fenced code blocks
 *   ---           horizontal rule
 *   | a | b |     tables
 *
 * Heading levels start at h2 on purpose. The post title is the page's only
 * h1; a second one is an accessibility and SEO defect, so a single `#` in the
 * body is rendered as an h2 rather than competing with the title.
 */

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i;
const SAFE_IMAGE = /^(https?:\/\/|\/(?!\/))/i;

/** Only schemes that cannot execute. Anything else becomes plain text. */
function safeHref(raw: string): string | null {
  const href = raw.trim();
  return SAFE_LINK.test(href) ? href : null;
}

function safeImageSrc(raw: string): string | null {
  const src = raw.trim();
  return SAFE_IMAGE.test(src) ? src : null;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ঀ-৿\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Inline
// ---------------------------------------------------------------------------

/**
 * Splits a line into inline nodes. Written as one ordered scan rather than a
 * chain of string replacements so that a `[` inside a code span, or a `*`
 * inside a URL, cannot start a new token.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let buffer = '';
  let i = 0;
  let key = 0;

  const flush = () => {
    if (buffer) {
      nodes.push(buffer);
      buffer = '';
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);

    // `code`
    const code = /^`([^`]+)`/.exec(rest);
    if (code) {
      flush();
      nodes.push(
        <code
          key={`${keyPrefix}-c${key++}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
        >
          {code[1]}
        </code>,
      );
      i += code[0].length;
      continue;
    }

    // ![alt](src) — an inline image, e.g. a small badge mid-sentence.
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
    if (image) {
      const src = safeImageSrc(image[2]!);
      flush();
      if (src) {
        nodes.push(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${keyPrefix}-i${key++}`}
            src={src}
            alt={image[1] ?? ''}
            loading="lazy"
            decoding="async"
            className="inline-block max-h-6 w-auto align-text-bottom"
          />,
        );
      } else {
        nodes.push(image[1] ?? '');
      }
      i += image[0].length;
      continue;
    }

    // [text](href)
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (link) {
      const href = safeHref(link[2]!);
      flush();
      if (href) {
        const external = /^https?:\/\//i.test(href);
        nodes.push(
          <a
            key={`${keyPrefix}-l${key++}`}
            href={href}
            className="font-medium text-primary underline underline-offset-2 hover:no-underline"
            {...(external
              ? { target: '_blank', rel: 'noopener noreferrer nofollow' }
              : {})}
          >
            {link[1]}
          </a>,
        );
      } else {
        // An unsafe scheme keeps its label and loses the link entirely.
        nodes.push(link[1] ?? '');
      }
      i += link[0].length;
      continue;
    }

    // **bold**
    const bold = /^\*\*([^*]+)\*\*/.exec(rest);
    if (bold) {
      flush();
      nodes.push(<strong key={`${keyPrefix}-b${key++}`}>{bold[1]}</strong>);
      i += bold[0].length;
      continue;
    }

    // *italic* or _italic_
    const italic = /^(?:\*([^*\s][^*]*)\*|_([^_\s][^_]*)_)/.exec(rest);
    if (italic) {
      flush();
      nodes.push(<em key={`${keyPrefix}-e${key++}`}>{italic[1] ?? italic[2]}</em>);
      i += italic[0].length;
      continue;
    }

    buffer += text[i];
    i += 1;
  }

  flush();
  return nodes;
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/;

export interface MarkdownHeading {
  id: string;
  level: number;
  text: string;
}

/** Headings, for a table of contents. Same rules as the renderer. */
export function extractHeadings(source: string): MarkdownHeading[] {
  const out: MarkdownHeading[] = [];
  let inFence = false;

  for (const line of (source ?? '').split('\n')) {
    if (line.trimStart().startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!match) continue;
    const text = match[2]!.trim();
    if (!text) continue;
    out.push({
      id: slugifyHeading(text),
      level: Math.max(2, match[1]!.length),
      text,
    });
  }
  return out;
}

export function renderMarkdown(source: string): React.ReactNode[] {
  const lines = (source ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Fenced code
    if (trimmed.startsWith('```')) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) {
        body.push(lines[i]!);
        i += 1;
      }
      i += 1; // closing fence
      blocks.push(
        <pre
          key={`k${key++}`}
          className="overflow-x-auto rounded-field bg-muted p-4 text-sm"
        >
          <code className="font-mono">{body.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={`k${key++}`} className="my-10 border-border" />);
      i += 1;
      continue;
    }

    // Heading
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const text = heading[2]!.trim();
      const level = Math.max(2, heading[1]!.length);
      const Tag = `h${level}` as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      blocks.push(
        <Tag key={`k${key++}`} id={slugifyHeading(text)} className="scroll-mt-28">
          {renderInline(text, `h${key}`)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    // A standalone image becomes a figure, with the alt text doubling as the
    // caption — one piece of writing serving both sighted and screen readers.
    const imageOnly = IMAGE_LINE.exec(trimmed);
    if (imageOnly) {
      const src = safeImageSrc(imageOnly[2]!);
      if (src) {
        const alt = imageOnly[1] ?? '';
        blocks.push(
          <figure key={`k${key++}`} className="my-8">
            {/* Body images come from Cloudinary or wherever the author pasted
                them from; a plain img avoids pinning every host in
                next.config remotePatterns. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              className="w-full rounded-card border border-border"
            />
            {alt && (
              <figcaption className="mt-2 text-center text-xs text-muted-foreground">
                {alt}
              </figcaption>
            )}
          </figure>,
        );
        i += 1;
        continue;
      }
    }

    // Blockquote
    if (trimmed.startsWith('>')) {
      const body: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('>')) {
        body.push(lines[i]!.trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push(
        <blockquote
          key={`k${key++}`}
          className="my-6 border-l-4 border-primary pl-5 italic text-foreground/85"
        >
          {renderInline(body.join(' '), `q${key}`)}
        </blockquote>,
      );
      continue;
    }

    // Table: a header row, a separator row, then body rows.
    if (trimmed.startsWith('|') && /^\|[\s:|-]+\|$/.test(lines[i + 1]?.trim() ?? '')) {
      const cells = (row: string) =>
        row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const header = cells(trimmed);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('|')) {
        body.push(cells(lines[i]!));
        i += 1;
      }
      blocks.push(
        <div key={`k${key++}`} className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {header.map((cell, c) => (
                  <th
                    key={c}
                    className="border-b border-border px-3 py-2 text-left font-semibold"
                  >
                    {renderInline(cell, `th${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-border px-3 py-2 align-top">
                      {renderInline(cell, `td${r}-${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Lists
    const bullet = /^[-*+]\s+/;
    const numbered = /^\d+[.)]\s+/;
    if (bullet.test(trimmed) || numbered.test(trimmed)) {
      const ordered = numbered.test(trimmed);
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i]!.trim();
        const matcher = ordered ? numbered : bullet;
        if (!matcher.test(current)) break;
        items.push(current.replace(matcher, ''));
        i += 1;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      blocks.push(
        <ListTag key={`k${key++}`}>
          {items.map((item, index) => (
            <li key={index}>{renderInline(item, `li${key}-${index}`)}</li>
          ))}
        </ListTag>,
      );
      continue;
    }

    // Paragraph: consecutive non-blank lines that start no other block.
    //
    // `startIndex` guarantees forward progress. A line can look like the start
    // of a block and still not be consumed by one — a `|` row with no
    // separator beneath it, or an image whose URL was rejected. Without the
    // check at the bottom, the paragraph loop would break immediately, `i`
    // would never advance, and the render would spin forever.
    const startIndex = i;
    const paragraph: string[] = [];
    while (i < lines.length) {
      const current = lines[i]!;
      const currentTrimmed = current.trim();
      if (
        !currentTrimmed ||
        currentTrimmed.startsWith('```') ||
        currentTrimmed.startsWith('>') ||
        currentTrimmed.startsWith('|') ||
        /^#{1,6}\s/.test(currentTrimmed) ||
        bullet.test(currentTrimmed) ||
        numbered.test(currentTrimmed) ||
        IMAGE_LINE.test(currentTrimmed) ||
        /^(-{3,}|\*{3,}|_{3,})$/.test(currentTrimmed)
      ) {
        break;
      }
      paragraph.push(currentTrimmed);
      i += 1;
    }
    if (paragraph.length > 0) {
      blocks.push(<p key={`k${key++}`}>{renderInline(paragraph.join(' '), `p${key}`)}</p>);
    } else if (i === startIndex) {
      // Nothing claimed this line. Render it as prose and move on, so that
      // unusual input degrades to text instead of hanging the request.
      blocks.push(<p key={`k${key++}`}>{renderInline(trimmed, `p${key}`)}</p>);
      i += 1;
    }
  }

  return blocks;
}

/**
 * Markdown reduced to prose, for meta descriptions, card excerpts and the
 * reading-time estimate. Markup characters are stripped rather than rendered.
 */
export function markdownToPlainText(source: string, limit?: number): string {
  const text = (source ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/[*_`|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!limit || text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

/** ~200 words per minute, floored at one. */
export function estimateReadMinutes(source: string): number {
  const words = markdownToPlainText(source).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
