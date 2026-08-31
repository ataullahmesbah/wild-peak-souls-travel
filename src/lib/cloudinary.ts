// src/lib/cloudinary.ts
import 'server-only';

import { v2 as cloudinary } from 'cloudinary';

import { cloudinaryConfigProblem, cloudinaryCredentials } from '@/lib/env';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  const credentials = cloudinaryCredentials();
  if (!credentials) {
    throw new Error(cloudinaryConfigProblem() ?? 'Cloudinary is not configured.');
  }
  cloudinary.config({
    cloud_name: credentials.cloudName,
    api_key: credentials.apiKey,
    api_secret: credentials.apiSecret,
    secure: true,
  });
  configured = true;
}

export const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Signs an upload so the browser can post directly to Cloudinary without ever
 * seeing the API secret. The signature pins the folder and timestamp, so a
 * leaked signature cannot be reused to write elsewhere.
 */
export function signUpload(folder: string): {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
} {
  ensureConfigured();
  // Read through the resolver, not process.env: with the credentials supplied
  // as a single CLOUDINARY_URL the individual variables are unset, and signing
  // with `undefined` produces a signature Cloudinary rejects.
  const credentials = cloudinaryCredentials();
  if (!credentials) {
    throw new Error(cloudinaryConfigProblem() ?? 'Cloudinary is not configured.');
  }

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    credentials.apiSecret,
  );
  return {
    timestamp,
    signature,
    apiKey: credentials.apiKey,
    cloudName: credentials.cloudName,
    folder,
  };
}

export type CloudinaryResourceType = 'image' | 'video';

export async function deleteAsset(
  publicId: string,
  resourceType: CloudinaryResourceType = 'image',
): Promise<void> {
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Signs an upload for a specific resource type. Videos go to a different
 * Cloudinary endpoint from images and must be signed for it.
 */
export function signUploadFor(
  folder: string,
  resourceType: CloudinaryResourceType,
): {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: CloudinaryResourceType;
} {
  return { ...signUpload(folder), resourceType };
}

export interface VerifiedAsset {
  publicId: string;
  url: string;
  secureUrl: string;
  resourceType: string;
  format: string;
  bytes: number;
  width: number | null;
  height: number | null;
  /** Whole seconds, videos only. */
  durationSeconds: number | null;
  folder: string;
}

/**
 * Reads an asset back from Cloudinary.
 *
 * This exists because nothing the browser reports about an upload can be
 * trusted. A page can claim a 40 MB video is 900 KB and two seconds long; the
 * only authority on what was actually stored is Cloudinary. Every entry is
 * checked against this before it is accepted, and anything that fails the
 * contest's rules is deleted rather than left sitting in the account.
 *
 * Returns null when the asset does not exist, which is also the answer for a
 * public id someone invented.
 */
export async function fetchAsset(
  publicId: string,
  resourceType: CloudinaryResourceType,
): Promise<VerifiedAsset | null> {
  ensureConfigured();
  try {
    const resource = (await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
    })) as {
      public_id: string;
      url: string;
      secure_url: string;
      resource_type: string;
      format: string;
      bytes: number;
      width?: number;
      height?: number;
      duration?: number;
      folder?: string;
      asset_folder?: string;
    };

    return {
      publicId: resource.public_id,
      url: resource.url,
      secureUrl: resource.secure_url,
      resourceType: resource.resource_type,
      format: resource.format,
      bytes: resource.bytes,
      width: resource.width ?? null,
      height: resource.height ?? null,
      durationSeconds:
        typeof resource.duration === 'number' ? Math.ceil(resource.duration) : null,
      folder: resource.folder ?? resource.asset_folder ?? '',
    };
  } catch {
    return null;
  }
}

/**
 * Builds a responsive Cloudinary URL. Cards must never load an original —
 * always request an explicit width with automatic format and quality.
 */
export function cloudinaryUrl(
  url: string,
  options: { width?: number; height?: number; crop?: string } = {},
): string {
  if (!url.includes('/upload/')) return url;
  const { width = 800, height, crop = 'fill' } = options;
  const parts = [`w_${width}`, 'f_auto', 'q_auto'];
  if (height) parts.push(`h_${height}`, `c_${crop}`);
  return url.replace('/upload/', `/upload/${parts.join(',')}/`);
}

/** Server-side validation of an uploaded file before it is recorded. */
export function validateImageUpload(file: {
  type: string;
  size: number;
}): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED_IMAGE_MIME.includes(file.type)) {
    return { ok: false, reason: 'Only JPEG, PNG, WebP and AVIF images are allowed.' };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'Images must be 8 MB or smaller.' };
  }
  return { ok: true };
}
