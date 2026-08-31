// src/components/contest/entry-form.tsx
'use client';

import * as React from 'react';
import { Film, ImagePlus, Loader2, Send, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormMessage, Input, Textarea } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';
import { useApiForm } from '@/hooks/use-api-form';
import { cn } from '@/lib/utils';

/**
 * The contest entry form.
 *
 * The file is checked twice on this side before anything is uploaded — size
 * for a photo, duration for a video, read out of a temporary <video> element.
 * Neither check is a security measure; both are a courtesy. Someone on a phone
 * connection should be told their 40-second clip is too long before they spend
 * four minutes uploading it, not after. The server re-reads both from
 * Cloudinary and is the only thing that actually decides.
 *
 * Upload happens on submit rather than on file selection, so abandoning a
 * half-filled form leaves nothing behind in the Cloudinary account.
 */

interface Props {
  contestId: string;
  allowImages: boolean;
  allowVideos: boolean;
  maxImageBytes: number;
  maxVideoSeconds: number;
  defaultName?: string;
  defaultEmail?: string;
  defaultPhone?: string;
}

type Picked = {
  file: File;
  kind: 'image' | 'video';
  previewUrl: string;
  detail: string;
};

/** Reads a video's length without uploading it. */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const element = document.createElement('video');
    element.preload = 'metadata';
    element.onloadedmetadata = () => {
      URL.revokeObjectURL(element.src);
      resolve(element.duration);
    };
    element.onerror = () => {
      URL.revokeObjectURL(element.src);
      reject(new Error('unreadable'));
    };
    element.src = URL.createObjectURL(file);
  });
}

export function ContestEntryForm({
  contestId,
  allowImages,
  allowVideos,
  maxImageBytes,
  maxVideoSeconds,
  defaultName,
  defaultEmail,
  defaultPhone,
}: Props) {
  const toast = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [picked, setPicked] = React.useState<Picked | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [done, setDone] = React.useState(false);

  const maxImageMb = (maxImageBytes / (1024 * 1024)).toFixed(0);

  const accept = [allowImages ? 'image/*' : '', allowVideos ? 'video/*' : '']
    .filter(Boolean)
    .join(',');

  // Revoke the object URL when the preview goes away, or the page leaks it.
  React.useEffect(() => {
    const url = picked?.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [picked?.previewUrl]);

  async function choose(file: File) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast.error('Choose a photo or a video.');
      return;
    }
    if (isImage && !allowImages) {
      toast.error('This contest accepts videos only.');
      return;
    }
    if (isVideo && !allowVideos) {
      toast.error('This contest accepts photos only.');
      return;
    }

    if (isImage) {
      if (file.size > maxImageBytes) {
        toast.error(
          `Photos must be ${maxImageMb} MB or smaller. Yours is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`,
        );
        return;
      }
      setPicked({
        file,
        kind: 'image',
        previewUrl: URL.createObjectURL(file),
        detail: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      });
      return;
    }

    let duration: number;
    try {
      duration = await readVideoDuration(file);
    } catch {
      toast.error('That video could not be read. Try a different file.');
      return;
    }
    if (duration > maxVideoSeconds + 0.5) {
      toast.error(
        `Videos must be ${maxVideoSeconds} seconds or shorter. Yours is ${Math.round(duration)} seconds.`,
      );
      return;
    }
    setPicked({
      file,
      kind: 'video',
      previewUrl: URL.createObjectURL(file),
      detail: `${Math.round(duration)}s · ${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    });
  }

  const { loading, error, success, fieldErrors, submit } = useApiForm('/api/contest/entries', {
    successMessage: 'Entry received — our team will review it shortly.',
    toast: false,
    onSuccess: () => setDone(true),
    // The file is uploaded here, between the form being filled in and the
    // entry being posted, so the payload carries a Cloudinary id the server
    // can verify rather than the bytes themselves.
    transform: (payload) => ({ ...payload, contestId }),
  });

  /**
   * Uploads the chosen file, then lets the normal form submission run with the
   * resulting public id attached.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!picked) {
      toast.error('Choose the photo or video you are entering.');
      return;
    }

    const form = event.currentTarget;
    setUploading(true);
    try {
      const signResponse = await fetch('/api/contest/upload-sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contestId, kind: picked.kind }),
      });
      const signBody = (await signResponse.json().catch(() => ({}))) as {
        error?: string;
        data?: {
          timestamp: number;
          signature: string;
          apiKey: string;
          cloudName: string;
          folder: string;
          resourceType: 'image' | 'video';
        };
      };
      if (!signResponse.ok || !signBody.data) {
        toast.error(signBody.error ?? 'Uploads are unavailable right now. Please try again later.');
        return;
      }

      const { timestamp, signature, apiKey, cloudName, folder, resourceType } = signBody.data;
      const upload = new FormData();
      upload.append('file', picked.file);
      upload.append('api_key', apiKey);
      upload.append('timestamp', String(timestamp));
      upload.append('signature', signature);
      upload.append('folder', folder);

      const cloudResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        { method: 'POST', body: upload },
      );
      const cloud = (await cloudResponse.json().catch(() => ({}))) as {
        error?: { message?: string };
        public_id?: string;
      };
      if (!cloudResponse.ok || !cloud.public_id) {
        toast.error(cloud.error?.message ?? 'The upload failed. Check your connection and try again.');
        return;
      }

      // Hand the id to the form and let the shared submit path run, so server
      // field errors land under the right inputs like everywhere else.
      const publicIdField = form.elements.namedItem('publicId') as HTMLInputElement | null;
      const kindField = form.elements.namedItem('kind') as HTMLInputElement | null;
      if (publicIdField) publicIdField.value = cloud.public_id;
      if (kindField) kindField.value = picked.kind;

      await submit(event);
    } catch {
      toast.error('The upload failed. Check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-card border border-success/40 bg-success-soft p-6">
        <h3 className="font-display text-lg font-semibold text-success">Entry received</h3>
        <p className="mt-2 text-sm text-foreground/80">
          Thank you. Our team reviews every entry before it appears on the site — you will hear
          from us at the email address you gave. Good luck.
        </p>
      </div>
    );
  }

  const busy = uploading || loading;

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="publicId" defaultValue="" />
      <input type="hidden" name="kind" defaultValue="image" />

      {/* Honeypot — off-screen, never announced, only a bot fills it. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="contest-website">Leave this empty</label>
        <input id="contest-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Your name" name="entrantName" required maxLength={120}
          defaultValue={defaultName} autoComplete="name" error={fieldErrors.entrantName} />
        <Input label="Email" name="entrantEmail" type="email" required maxLength={254}
          defaultValue={defaultEmail} autoComplete="email"
          hint="Not published. We use it to reach you if you win."
          error={fieldErrors.entrantEmail} />
        <Input label="Phone" name="entrantPhone" required maxLength={20}
          defaultValue={defaultPhone} autoComplete="tel"
          hint="Not published." error={fieldErrors.entrantPhone} />
        <Input label="Facebook or LinkedIn" name="socialUrl" maxLength={400}
          placeholder="https://facebook.com/yourprofile"
          hint="Optional. Shown with your entry if you win."
          error={fieldErrors.socialUrl} />
        <Input label="Where was this taken?" name="location" required maxLength={160}
          placeholder="Sajek Valley, Rangamati" error={fieldErrors.location}
          wrapperClassName="sm:col-span-2" />
      </div>

      <Textarea label="Tell us about it" name="description" required rows={4} maxLength={2000}
        placeholder="What is happening in this shot, and what made you take it?"
        error={fieldErrors.description} />

      {/* --- the file --- */}
      <div>
        <p className="mb-2 text-sm font-medium">Your entry</p>
        <input ref={fileRef} type="file" accept={accept} className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void choose(file);
            event.target.value = '';
          }} />

        {picked ? (
          <div className="flex flex-wrap items-start gap-4 rounded-field border border-border bg-card p-4">
            <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-field bg-muted">
              {picked.kind === 'video' ? (
                <video src={picked.previewUrl} className="h-full w-full object-cover"
                  muted playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={picked.previewUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{picked.file.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {picked.kind === 'video' ? 'Video' : 'Photo'} · {picked.detail}
              </p>
              <Button type="button" variant="ghost" size="sm" className="mt-2"
                onClick={() => setPicked(null)} disabled={busy}>
                <X className="h-4 w-4" aria-hidden="true" />
                Choose a different file
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className={cn(
              'flex w-full flex-col items-center gap-2 rounded-field border-2 border-dashed border-border',
              'bg-card px-6 py-10 text-center transition-colors hover:border-primary hover:bg-primary/5',
            )}>
            <span className="flex gap-2 text-primary">
              {allowImages && <ImagePlus className="h-6 w-6" aria-hidden="true" />}
              {allowVideos && <Film className="h-6 w-6" aria-hidden="true" />}
            </span>
            <span className="font-medium">Choose your entry</span>
            <span className="text-xs text-muted-foreground">
              {allowImages && `Photos up to ${maxImageMb} MB`}
              {allowImages && allowVideos && ' · '}
              {allowVideos && `Videos up to ${maxVideoSeconds} seconds`}
            </span>
          </button>
        )}
      </div>

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy} disabled={!picked}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Uploading…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit entry
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Every entry is reviewed before it appears on the site.
        </p>
      </div>
    </form>
  );
}
