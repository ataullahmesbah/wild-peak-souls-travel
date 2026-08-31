// src/components/admin/image-field.tsx
'use client';

import * as React from 'react';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';

import { FieldWrapper } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface LibraryItem {
  id: string;
  url: string;
  altText: string | null;
  folder: string | null;
}

/**
 * Picks the cover image for a catalogue record.
 *
 * The file goes straight from the browser to Cloudinary using a signature this
 * server produces — the API secret is never sent to the page. Three steps:
 * ask our server to sign an upload, POST the file to Cloudinary, then tell our
 * server what landed so it gets a MediaAsset row. Only the resulting id is
 * submitted with the form, in a hidden input, which is why this drops into
 * ResourceForm without it needing to know anything about uploads.
 *
 * Alt text is asked for on upload rather than left blank. An image with no
 * description is invisible to a screen reader and to a search engine, and
 * nobody ever goes back to add it later.
 */
export function ImageField({
  name,
  label,
  folder = 'misc',
  defaultMediaId,
  defaultUrl,
  hint,
  error,
  className,
}: {
  /** Form field name, e.g. `coverMediaId`. */
  name: string;
  label: string;
  /** Cloudinary sub-folder; must be one the sign endpoint allows. */
  folder?: 'destinations' | 'events' | 'tours' | 'activities' | 'stays' | 'hero' | 'ads' | 'blog' | 'contest' | 'misc';
  defaultMediaId?: string | null;
  defaultUrl?: string | null;
  hint?: string;
  error?: string | string[];
  className?: string;
}) {
  const toast = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [mediaId, setMediaId] = React.useState(defaultMediaId ?? '');
  const [preview, setPreview] = React.useState(defaultUrl ?? '');
  const [busy, setBusy] = React.useState(false);
  const [libraryOpen, setLibraryOpen] = React.useState(false);

  async function upload(file: File) {
    // Checked here so an oversized file is refused before it is uploaded,
    // rather than after the customer's connection has carried all of it.
    if (!file.type.startsWith('image/')) {
      toast.error('That is not an image. Choose a JPEG, PNG, WebP or AVIF file.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Images must be 8 MB or smaller. Try compressing it first.');
      return;
    }

    setBusy(true);
    try {
      const signResponse = await fetch('/api/dashboard/media/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder }),
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

      const { timestamp, signature, apiKey, cloudName, folder: signedFolder } = signBody.data;

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', apiKey);
      form.append('timestamp', String(timestamp));
      form.append('signature', signature);
      form.append('folder', signedFolder);

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

      // Ask for a description now, while the person still has the picture in
      // mind. Cancelling is allowed — a missing description should not cost
      // them the upload they just waited for.
      const altText =
        window.prompt(
          'Describe this image in a few words, for screen readers and search engines:',
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
          folder: signedFolder,
        }),
      });
      const registered = (await registerResponse.json().catch(() => ({}))) as {
        error?: string;
        data?: { id: string; url: string; secureUrl: string | null };
      };

      if (!registerResponse.ok || !registered.data) {
        toast.error(
          registered.error ??
          'The image uploaded but could not be saved to the library. Try again.',
        );
        return;
      }

      setMediaId(registered.data.id);
      setPreview(registered.data.secureUrl ?? registered.data.url);
      toast.success('Image uploaded. Remember to save the form.');
    } catch {
      toast.error('The upload failed. Check your connection and try again.');
    } finally {
      setBusy(false);
      // Clear the input so choosing the same file twice still fires a change.
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const fieldId = `image-${name}`;

  return (
    <FieldWrapper id={fieldId} label={label} hint={hint} error={error} className={className}>
      {/* The only thing the form actually submits. */}
      <input type="hidden" name={name} value={mediaId} />

      <div className="rounded-field border border-border bg-card p-3">
        {preview ? (
          <div className="flex flex-wrap items-start gap-4">
            <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-field bg-muted">
              {/* Cloudinary and seed hosts vary, so a plain img avoids pinning
                  every one of them in next.config remotePatterns. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                This image is used as the cover wherever this record appears.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="rounded-field border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryOpen(true)}
                  disabled={busy}
                  className="rounded-field border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  Choose from library
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaId('');
                    setPreview('');
                  }}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-field px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive-soft disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <p className="text-sm text-muted-foreground">
              {busy ? 'Uploading…' : 'No image yet'}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="rounded-field bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Upload an image
              </button>
              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                disabled={busy}
                className="rounded-field border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                Choose from library
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP or AVIF · up to 8 MB · landscape works best
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {libraryOpen && (
        <MediaLibraryPicker
          onClose={() => setLibraryOpen(false)}
          onPick={(item) => {
            setMediaId(item.id);
            setPreview(item.url);
            setLibraryOpen(false);
          }}
        />
      )}
    </FieldWrapper>
  );
}

/**
 * Reuses an image that is already in the library.
 *
 * Uploading the same photo again for a second record would cost storage twice
 * and leave two rows to keep in step, so picking an existing one is offered
 * alongside uploading rather than buried.
 */
function MediaLibraryPicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (item: LibraryItem) => void;
}) {
  const [items, setItems] = React.useState<LibraryItem[] | null>(null);
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    void fetch('/api/dashboard/media/library', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body: { data?: { items: LibraryItem[] } }) => {
        if (!cancelled) setItems(body.data?.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const visible = (items ?? []).filter((item) => {
    if (!query.trim()) return true;
    const haystack = `${item.altText ?? ''} ${item.folder ?? ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Choose an image"
        className="wps-animate-in flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-card bg-card sm:rounded-card"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-border p-4">
          <h2 className="font-display text-base font-semibold">Choose an image</h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by description…"
            className="ml-auto h-9 w-40 rounded-field border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none sm:w-56"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-field text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {items === null ? (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading the library
            </p>
          ) : visible.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? 'The library is empty. Upload an image instead.'
                : 'Nothing matches that description.'}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onPick(item)}
                    className={cn(
                      'group w-full overflow-hidden rounded-field border border-border text-left',
                      'transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    )}
                  >
                    <span className="block aspect-[4/3] bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="block truncate px-2.5 py-2 text-xs text-muted-foreground">
                      {item.altText || item.folder || 'Untitled'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
