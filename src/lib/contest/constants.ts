// src/lib/contest/constants.ts

/**
 * Where entrants' uploads live in Cloudinary.
 *
 * Kept separate from the staff media folders on purpose: everything under this
 * prefix arrived from a member of the public, so it can be reviewed, quota'd or
 * purged as a group without touching the agency's own images.
 */
export const CONTEST_UPLOAD_FOLDER = 'wild-peak-souls/contest-entries';

/** Fallbacks used when a contest does not override them. */
export const DEFAULT_MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_VIDEO_SECONDS = 20;
