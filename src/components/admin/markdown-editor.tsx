// src/components/admin/markdown-editor.tsx
'use client';

import * as React from 'react';
import {
  Bold,
  Code,
  Eye,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Quote,
  Table,
} from 'lucide-react';

import { FieldWrapper } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

/**
 * The blog body editor.
 *
 * A plain textarea with a toolbar rather than a rich-text editor, for one
 * reason that matters more than convenience: what is stored is exactly what
 * the writer typed. A WYSIWYG editor stores HTML, and HTML from a form has to
 * be sanitised on the way out — every time, correctly, forever. Markdown is
 * rendered to React elements by src/lib/markdown.tsx, which cannot emit a
 * script tag at all.
 *
 * "Insert image" runs the same signed three-step Cloudinary upload as the
 * cover-image field and writes `![alt](url)` at the cursor, so pictures can go
 * anywhere in the article rather than only at the top.
 */

type Selection = { start: number; end: number };

/**
 * The toolbar as data rather than a list of closures.
 *
 * Each button describes the edit it wants; `runTool` performs it from inside
 * the click handler. Building the closures during render would mean capturing
 * the textarea ref there, which is both what `react-hooks/refs` forbids and a
 * real staleness hazard.
 */
type Tool =
  | { kind: 'prefix'; title: string; icon: typeof Bold; prefix: string }
  | {
      kind: 'wrap';
      title: string;
      icon: typeof Bold;
      before: string;
      after: string;
      placeholder: string;
    }
  | { kind: 'insert'; title: string; icon: typeof Bold; text: string };

const TOOLS: Tool[] = [
  { kind: 'prefix', title: 'Heading', icon: Heading2, prefix: '## ' },
  { kind: 'prefix', title: 'Sub-heading', icon: Heading3, prefix: '### ' },
  { kind: 'wrap', title: 'Bold', icon: Bold, before: '**', after: '**', placeholder: 'bold text' },
  { kind: 'wrap', title: 'Italic', icon: Italic, before: '*', after: '*', placeholder: 'italic text' },
  {
    kind: 'wrap',
    title: 'Link',
    icon: Link2,
    before: '[',
    after: '](https://)',
    placeholder: 'link text',
  },
  { kind: 'prefix', title: 'Bullet list', icon: List, prefix: '- ' },
  { kind: 'prefix', title: 'Numbered list', icon: ListOrdered, prefix: '1. ' },
  { kind: 'prefix', title: 'Quote', icon: Quote, prefix: '> ' },
  {
    kind: 'wrap',
    title: 'Code block',
    icon: Code,
    before: '\n```\n',
    after: '\n```\n',
    placeholder: 'code',
  },
  {
    kind: 'insert',
    title: 'Table',
    icon: Table,
    text: '\n\n| Item | Detail |\n| --- | --- |\n| Bus | 800 BDT |\n\n',
  },
];

export function MarkdownEditor({
  name,
  label,
  defaultValue = '',
  hint,
  error,
  rows = 18,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  hint?: string;
  error?: string | string[];
  rows?: number;
  required?: boolean;
}) {
  const toast = useToast();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState(defaultValue);
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState(false);

  const fieldId = `md-${name}`;

  function selection(): Selection {
    const el = textareaRef.current;
    if (!el) return { start: value.length, end: value.length };
    return { start: el.selectionStart, end: el.selectionEnd };
  }

  /** Replaces the current selection and restores the caret after React re-renders. */
  function replaceSelection(text: string, caretOffset = text.length) {
    const { start, end } = selection();
    const next = value.slice(0, start) + text + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const caret = start + caretOffset;
      el.setSelectionRange(caret, caret);
    });
  }

  /** Wraps the selected words, or drops in a placeholder if nothing is selected. */
  function wrap(before: string, after: string, placeholder: string) {
    const { start, end } = selection();
    const selected = value.slice(start, end) || placeholder;
    replaceSelection(`${before}${selected}${after}`, before.length + selected.length);
  }

  /** Prefixes the line the caret is on, for headings, lists and quotes. */
  function prefixLine(prefix: string) {
    const { start } = selection();
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const next = `${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`;
    setValue(next);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const caret = start + prefix.length;
      el.setSelectionRange(caret, caret);
    });
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('That is not an image. Choose a JPEG, PNG, WebP or AVIF file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Images must be 8 MB or smaller. Try compressing it first.');
      return;
    }

    setUploading(true);
    try {
      const signResponse = await fetch('/api/dashboard/media/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'blog' }),
      });
      const signBody = (await signResponse.json().catch(() => ({}))) as {
        error?: string;
        data?: {
          timestamp: number;
          signature: string;
          apiKey: string;
          cloudName: string;
          folder: string;
        };
      };
      if (!signResponse.ok || !signBody.data) {
        toast.error(
          signBody.error ??
            'Image hosting is not configured. Add the Cloudinary keys to your environment.',
        );
        return;
      }

      const { timestamp, signature, apiKey, cloudName, folder } = signBody.data;
      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', folder);

      const cloudResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: form },
      );
      const cloud = (await cloudResponse.json().catch(() => ({}))) as {
        error?: { message?: string };
        public_id?: string;
        secure_url?: string;
        url?: string;
        width?: number;
        height?: number;
        bytes?: number;
        format?: string;
      };
      if (!cloudResponse.ok || !cloud.public_id) {
        toast.error(cloud.error?.message ?? 'Cloudinary rejected the upload.');
        return;
      }

      // The description becomes both the alt attribute and the caption under
      // the image, so it is worth asking for while the picture is fresh.
      const altText =
        window.prompt(
          'Describe this image. It becomes the caption and the alt text:',
          file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
        ) ?? '';

      const registerResponse = await fetch('/api/dashboard/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cloud.url ?? cloud.secure_url,
          secureUrl: cloud.secure_url,
          publicId: cloud.public_id,
          type: 'image',
          mimeType: cloud.format ? `image/${cloud.format}` : undefined,
          width: cloud.width,
          height: cloud.height,
          size: cloud.bytes,
          altText: altText.trim() || undefined,
          folder,
        }),
      });
      const registered = (await registerResponse.json().catch(() => ({}))) as {
        error?: string;
        data?: { id: string; url: string; secureUrl: string | null };
      };
      if (!registerResponse.ok || !registered.data) {
        toast.error(registered.error ?? 'The image uploaded but could not be saved.');
        return;
      }

      const src = registered.data.secureUrl ?? registered.data.url;
      // Blank lines either side so the renderer treats it as its own figure
      // rather than folding it into the surrounding paragraph.
      replaceSelection(`\n\n![${altText.trim()}](${src})\n\n`);
      toast.success('Image inserted. Remember to save the post.');
    } catch {
      toast.error('The upload failed. Check your connection and try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function runTool(tool: Tool) {
    if (tool.kind === 'prefix') prefixLine(tool.prefix);
    else if (tool.kind === 'wrap') wrap(tool.before, tool.after, tool.placeholder);
    else replaceSelection(tool.text);
  }

  return (
    <FieldWrapper
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      className="sm:col-span-2"
    >
      <div className="rounded-field border border-border bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.title}
              type="button"
              title={tool.title}
              onClick={() => runTool(tool)}
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <tool.icon className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">{tool.title}</span>
            </button>
          ))}

          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

          <button
            type="button"
            title="Insert image"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            {uploading ? 'Uploading…' : 'Insert image'}
          </button>

          <button
            type="button"
            onClick={() => setPreview(!preview)}
            aria-pressed={preview}
            className="ml-auto flex items-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {preview ? (
              <>
                <Pencil className="h-4 w-4" aria-hidden="true" /> Write
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" aria-hidden="true" /> Preview
              </>
            )}
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadImage(file);
          }}
        />

        {preview ? (
          // A rough preview only: the article page is the real renderer. Doing
          // the real thing here would mean shipping the renderer to the
          // browser for a screen that is glanced at for two seconds.
          <div className="min-h-64 space-y-2 p-4 text-sm">
            {value.trim() ? (
              value.split(/\n\n+/).map((block, index) => (
                <p key={index} className="whitespace-pre-wrap text-foreground/85">
                  {block}
                </p>
              ))
            ) : (
              <p className="text-muted-foreground">Nothing to preview yet.</p>
            )}
            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              This is a rough preview. Save as a draft and open the post to see
              the real formatting.
            </p>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            id={fieldId}
            name={name}
            required={required}
            rows={rows}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            spellCheck
            className={cn(
              'w-full resize-y bg-transparent p-4 font-mono text-sm leading-relaxed outline-none',
              'placeholder:text-muted-foreground',
            )}
            placeholder={
              'Write the article here.\n\n## A section heading\n\nA paragraph with **bold** and a [link](https://example.com).\n\n- a list item\n- another\n\nUse “Insert image” to place a picture anywhere.'
            }
          />
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Formatting is Markdown. The post title is the page’s H1, so headings in
        the body start at H2 — <code>##</code> through <code>######</code>.
      </p>
    </FieldWrapper>
  );
}
