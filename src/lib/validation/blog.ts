// src/lib/validation/blog.ts
import { z } from 'zod';

import {
  cuidSchema,
  emailSchema,
  optionalText,
  partialForUpdate,
  slugSchema,
} from '@/lib/validation/common';

/**
 * Write schemas for the blog.
 *
 * Two fields are deliberately absent from every editor schema: `views`, which
 * the article page owns, and `authorId`, which is taken from the signed-in
 * session. Letting a form set either would make the byline and the trending
 * list forgeable by anyone who can write a post.
 */

const contentStatus = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

const nullableCuid = z
  .string()
  .trim()
  .max(64)
  .optional()
  .nullable()
  .transform((v) => (v === '' || v === undefined ? null : v));

// --- Posts ------------------------------------------------------------------

export const postCreateSchema = z.object({
  title: z.string().trim().min(3, 'Give the post a title').max(200),
  slug: slugSchema,
  excerpt: optionalText(500),
  body: z.string().trim().min(20, 'A post needs at least a short paragraph').max(120_000),
  coverMediaId: nullableCuid,
  categoryId: nullableCuid,
  tags: optionalText(300),
  // Left blank the article page computes it from the body, which is both more
  // accurate and one less thing for the writer to maintain.
  readMinutes: z.coerce.number().int().min(0).max(240).optional(),
  featured: z.coerce.boolean().optional(),
  commentsOpen: z.coerce.boolean().optional(),
  status: contentStatus.default('DRAFT'),
  publishedAt: z.string().trim().optional().nullable(),
  seoTitle: optionalText(160),
  seoDescription: optionalText(300),
});

export const postUpdateSchema = partialForUpdate(postCreateSchema);

// --- Categories -------------------------------------------------------------

export const postCategoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: optionalText(400),
  position: z.coerce.number().int().min(0).max(999).optional(),
  status: contentStatus.default('PUBLISHED'),
});

export const postCategoryUpdateSchema = partialForUpdate(postCategoryCreateSchema);

// --- Comments ---------------------------------------------------------------

export const commentCreateSchema = z.object({
  postId: cuidSchema,
  parentId: nullableCuid,
  authorName: z.string().trim().min(2, 'Tell us your name').max(80),
  authorEmail: emailSchema,
  body: z
    .string()
    .trim()
    .min(2, 'Write a comment first')
    // Capped well below the post body: a comment box is not a publishing tool,
    // and an unbounded one is an invitation to paste spam.
    .max(4000, 'Comments are limited to 4000 characters'),
  // Honeypot. A real person never sees this field, so anything in it is a bot.
  website: z.string().max(200).optional(),
});

export const commentModerateSchema = z.object({
  commentId: cuidSchema,
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
  note: z.string().trim().max(500).optional(),
});

export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
