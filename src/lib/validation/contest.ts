// src/lib/validation/contest.ts
import { z } from 'zod';

import {
  cuidSchema,
  emailSchema,
  optionalText,
  partialForUpdate,
  phoneSchema,
  slugSchema,
} from '@/lib/validation/common';

/**
 * Write schemas for the contest.
 *
 * Nothing an entrant posts decides anything about their standing. `status`,
 * `judgeScore`, `rank` and `voteCount` are absent from the entry schema
 * entirely — they belong to staff and to the vote table — so a crafted request
 * cannot promote an entry to WINNER or hand itself a hundred votes.
 */

const contestStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

const isoDate = z
  .string()
  .trim()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date and time');

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v === '' || v === undefined ? null : v))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), 'Enter a valid date and time');

const nullableId = z
  .string()
  .trim()
  .max(64)
  .optional()
  .nullable()
  .transform((v) => (v === '' || v === undefined ? null : v));

// --- The contest itself -----------------------------------------------------

export const contestCreateSchema = z
  .object({
    title: z.string().trim().min(3, 'Give the contest a title').max(160),
    slug: slugSchema,
    tagline: optionalText(200),
    description: z.string().trim().min(20, 'Describe the contest').max(40_000),
    theme: optionalText(160),
    rules: optionalText(20_000),
    prizeSummary: optionalText(400),
    coverMediaId: nullableId,
    status: contestStatus.default('DRAFT'),

    startAt: isoDate,
    entryDeadline: isoDate,
    votingStartAt: optionalIsoDate,
    votingEndAt: optionalIsoDate,
    resultsAt: optionalIsoDate,

    allowImages: z.coerce.boolean().optional(),
    allowVideos: z.coerce.boolean().optional(),
    maxEntriesPerUser: z.coerce.number().int().min(1).max(20).optional(),
    maxImageBytes: z.coerce.number().int().min(100_000).max(20_000_000).optional(),
    maxVideoSeconds: z.coerce.number().int().min(5).max(300).optional(),

    publicVoteWeight: z.coerce.number().int().min(0).max(50).optional(),
    shortlistSize: z.coerce.number().int().min(3).max(100).optional(),
    featureOnHome: z.coerce.boolean().optional(),

    seoTitle: optionalText(160),
    seoDescription: optionalText(300),
  })
  // A timeline that runs backwards would let the phase logic produce a
  // contest that is simultaneously open and finished, so it is rejected at
  // the edge rather than reasoned about later.
  .refine((v) => Date.parse(v.entryDeadline) > Date.parse(v.startAt), {
    message: 'The entry deadline must be after the opening date',
    path: ['entryDeadline'],
  })
  .refine(
    (v) => !v.votingStartAt || Date.parse(v.votingStartAt) >= Date.parse(v.entryDeadline),
    { message: 'Voting cannot open before entries close', path: ['votingStartAt'] },
  )
  .refine(
    (v) => !v.votingEndAt || !v.votingStartAt || Date.parse(v.votingEndAt) > Date.parse(v.votingStartAt),
    { message: 'Voting must close after it opens', path: ['votingEndAt'] },
  )
  .refine(
    (v) => !v.resultsAt || Date.parse(v.resultsAt) >= Date.parse(v.entryDeadline),
    { message: 'Results cannot be announced before entries close', path: ['resultsAt'] },
  )
  .refine((v) => v.allowImages !== false || v.allowVideos !== false, {
    message: 'Allow images, videos, or both — a contest that accepts neither cannot be entered',
    path: ['allowImages'],
  });

/**
 * The partial form for PATCH.
 *
 * `partialForUpdate` rebuilds the object from its shape, which drops the
 * cross-field rules above along with the defaults — correct, because a PATCH
 * that names only `votingEndAt` cannot be judged against a `votingStartAt` it
 * did not send. The rules are re-stated below in a form that only fires when
 * both halves of a pair are actually present.
 */
type ContestDateFields = {
  startAt?: string;
  entryDeadline?: string;
  votingStartAt?: string | null;
  votingEndAt?: string | null;
};

export const contestUpdateSchema = partialForUpdate(contestCreateSchema)
  .refine(
    (raw) => {
      const v = raw as ContestDateFields;
      return !v.startAt || !v.entryDeadline || Date.parse(v.entryDeadline) > Date.parse(v.startAt);
    },
    { message: 'The entry deadline must be after the opening date', path: ['entryDeadline'] },
  )
  .refine(
    (raw) => {
      const v = raw as ContestDateFields;
      return (
        !v.votingStartAt ||
        !v.entryDeadline ||
        Date.parse(v.votingStartAt) >= Date.parse(v.entryDeadline)
      );
    },
    { message: 'Voting cannot open before entries close', path: ['votingStartAt'] },
  )
  .refine(
    (raw) => {
      const v = raw as ContestDateFields;
      return (
        !v.votingEndAt ||
        !v.votingStartAt ||
        Date.parse(v.votingEndAt) > Date.parse(v.votingStartAt)
      );
    },
    { message: 'Voting must close after it opens', path: ['votingEndAt'] },
  );

// --- Child records ----------------------------------------------------------

export const contestPrizeCreateSchema = z.object({
  contestId: cuidSchema,
  position: z.coerce.number().int().min(0).max(50).optional(),
  title: z.string().trim().min(2).max(160),
  description: optionalText(1000),
  value: optionalText(120),
  mediaId: nullableId,
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});
export const contestPrizeUpdateSchema = partialForUpdate(contestPrizeCreateSchema);

export const contestJudgeCreateSchema = z.object({
  contestId: cuidSchema,
  name: z.string().trim().min(2).max(120),
  role: optionalText(160),
  bio: optionalText(2000),
  profileUrl: optionalText(400),
  mediaId: nullableId,
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});
export const contestJudgeUpdateSchema = partialForUpdate(contestJudgeCreateSchema);

export const contestSponsorCreateSchema = z.object({
  contestId: cuidSchema,
  name: z.string().trim().min(2).max(120),
  tier: optionalText(60),
  websiteUrl: optionalText(400),
  mediaId: nullableId,
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});
export const contestSponsorUpdateSchema = partialForUpdate(contestSponsorCreateSchema);

export const contestGalleryCreateSchema = z.object({
  contestId: cuidSchema,
  mediaId: cuidSchema,
  caption: optionalText(300),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});
export const contestGalleryUpdateSchema = partialForUpdate(contestGalleryCreateSchema);

// --- What the public posts --------------------------------------------------

/** Asks the server to sign one upload. Nothing is stored at this point. */
export const contestUploadSignSchema = z.object({
  contestId: cuidSchema,
  kind: z.enum(['image', 'video']),
});

export const contestEntryCreateSchema = z.object({
  contestId: cuidSchema,
  entrantName: z.string().trim().min(2, 'Tell us your name').max(120),
  entrantEmail: emailSchema,
  entrantPhone: phoneSchema,
  socialUrl: optionalText(400),
  location: z.string().trim().min(2, 'Where was this taken?').max(160),
  description: z
    .string()
    .trim()
    .min(10, 'Tell us a little about your entry')
    .max(2000, 'Keep the description under 2000 characters'),
  // What Cloudinary reported. Every field here is re-read from Cloudinary
  // server-side before the entry is accepted — see the entries route.
  publicId: z.string().trim().min(1).max(300),
  kind: z.enum(['image', 'video']),
  website: z.string().max(200).optional(),
});

export const contestVoteSchema = z.object({
  entryId: cuidSchema,
});

// --- Staff actions on entries -----------------------------------------------

export const contestEntryModerateSchema = z.object({
  entryId: cuidSchema,
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'SHORTLISTED', 'WINNER']),
  note: z.string().trim().max(500).optional(),
});

export const contestEntryScoreSchema = z.object({
  entryId: cuidSchema,
  judgeScore: z.coerce.number().int().min(0).max(100).nullable().optional(),
  rank: z.coerce.number().int().min(1).max(3).nullable().optional(),
});

export type ContestEntryCreateInput = z.infer<typeof contestEntryCreateSchema>;
