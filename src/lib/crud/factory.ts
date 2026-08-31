import 'server-only';

import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';
import type { ZodType } from 'zod';

import { BusinessError, apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/rbac/guard';
import type { PermissionKey } from '@/lib/rbac/permissions';
import { recordAudit } from '@/lib/audit';

/**
 * Builds the create / update / delete handlers for a catalogue module.
 *
 * Every module in the dashboard needs the same seven things: permission check,
 * validation, slug uniqueness, transactional child rows, audit, cache
 * revalidation and a safe response. Writing that once means a new module cannot
 * accidentally omit the audit record or forget to revalidate — the two mistakes
 * that are invisible until they matter.
 */
export interface CrudConfig<TCreate, TUpdate> {
  /** Prisma delegate name, e.g. 'event'. */
  model: string;
  /** Human label used in audit records and messages. */
  label: string;
  createSchema: ZodType<TCreate>;
  updateSchema: ZodType<TUpdate>;
  permissions: {
    create: PermissionKey;
    update: PermissionKey;
    delete: PermissionKey;
  };
  /** Cache tags to revalidate on any write. `:id` is replaced with the record id. */
  tags: string[];
  /** Extra `where` narrowing for slug uniqueness (e.g. slugs unique per country). */
  slugScope?: (input: TCreate | TUpdate) => Record<string, unknown> | undefined;
  /** Relations that block a hard delete; the record is archived instead. */
  archiveInsteadOfDeleteWhen?: (id: string) => Promise<string | null>;
  /** Maps validated input to a Prisma create payload (handles nested writes). */
  toCreateData?: (input: TCreate) => Record<string, unknown>;
  toUpdateData?: (input: TUpdate) => Record<string, unknown>;
  /** Runs inside the same transaction after the record is written. */
  afterWrite?: (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    id: string,
    input: TCreate | TUpdate,
  ) => Promise<void>;
}

type Delegate = {
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ id: string }>;
  delete: (args: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
};

function delegateFor(model: string): Delegate {
  const client = prisma as unknown as Record<string, Delegate>;
  const delegate = client[model];
  if (!delegate) throw new Error(`Unknown Prisma model: ${model}`);
  return delegate;
}

function revalidate(tags: string[], id?: string) {
  for (const tag of tags) {
    // 'max' — content edits should surface as soon as the next request lands.
    revalidateTag(id ? tag.replace(':id', id) : tag, 'max');
  }
}

/** Ensures a slug is unique within its model, ignoring the record being edited. */
export async function assertSlugAvailable(
  model: string,
  slug: string,
  ignoreId?: string,
  scope?: Record<string, unknown>,
): Promise<void> {
  const client = prisma as unknown as Record<
    string,
    { findFirst: (args: unknown) => Promise<{ id: string } | null> }
  >;
  const existing = await client[model]?.findFirst({
    where: { slug, ...(scope ?? {}) },
    select: { id: true },
  });
  if (existing && existing.id !== ignoreId) {
    throw new BusinessError(
      'That URL slug is already in use. Choose a different one.',
      'SLUG_TAKEN',
      422,
    );
  }
}

export function createHandler<TCreate, TUpdate>(
  config: CrudConfig<TCreate, TUpdate>,
) {
  return apiHandler(async (request: NextRequest) => {
    const staff = await requirePermission(config.permissions.create);
    const body = await request.json().catch(() => ({}));
    const input = config.createSchema.parse(body);

    const data = config.toCreateData
      ? config.toCreateData(input)
      : (input as Record<string, unknown>);

    // Checked here rather than relying on the database's unique index, so the
    // editor gets "that slug is taken" instead of a constraint violation.
    if (typeof data.slug === 'string') {
      await assertSlugAvailable(config.model, data.slug, undefined, config.slugScope?.(input));
    }

    const record = await prisma.$transaction(async (tx) => {
      const client = tx as unknown as Record<string, Delegate>;
      const created = await client[config.model]!.create({
        data,
        select: { id: true },
      });
      await config.afterWrite?.(tx, created.id, input);
      return created;
    });

    await recordAudit({
      actorId: staff.id,
      action: `${config.model}.created`,
      entityType: config.label,
      entityId: record.id,
      metadata: { name: (data.title ?? data.name ?? '') as string },
    });

    revalidate(config.tags, record.id);
    return apiSuccess({ id: record.id }, 201);
  });
}

export function updateHandler<TCreate, TUpdate>(
  config: CrudConfig<TCreate, TUpdate>,
) {
  return apiHandler(
    async (request: NextRequest, context: { params: Promise<{ id: string }> }) => {
      const staff = await requirePermission(config.permissions.update);
      const { id } = await context.params;
      const body = await request.json().catch(() => ({}));
      const input = config.updateSchema.parse(body);

      const before = await delegateFor(config.model).findUnique({ where: { id } });
      if (!before) {
        throw new BusinessError(`${config.label} not found.`, 'NOT_FOUND', 404);
      }

      const data = config.toUpdateData
        ? config.toUpdateData(input)
        : (input as Record<string, unknown>);

      if (typeof data.slug === 'string') {
        await assertSlugAvailable(config.model, data.slug, id, config.slugScope?.(input));
      }

      await prisma.$transaction(async (tx) => {
        const client = tx as unknown as Record<string, Delegate>;
        await client[config.model]!.update({
          where: { id },
          data,
          select: { id: true },
        });
        await config.afterWrite?.(tx, id, input);
      });

      await recordAudit({
        actorId: staff.id,
        action: `${config.model}.updated`,
        entityType: config.label,
        entityId: id,
        metadata: { changed: Object.keys(data) },
      });

      revalidate(config.tags, id);
      return apiSuccess({ id });
    },
  );
}

export function deleteHandler<TCreate, TUpdate>(
  config: CrudConfig<TCreate, TUpdate>,
) {
  return apiHandler(
    async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
      const staff = await requirePermission(config.permissions.delete);
      const { id } = await context.params;

      const existing = await delegateFor(config.model).findUnique({ where: { id } });
      if (!existing) {
        throw new BusinessError(`${config.label} not found.`, 'NOT_FOUND', 404);
      }

      // A record something else depends on is archived, never destroyed —
      // deleting an event out from under a paid booking would corrupt history.
      const blocker = await config.archiveInsteadOfDeleteWhen?.(id);

      if (blocker) {
        await prisma.$transaction(async (tx) => {
          const client = tx as unknown as Record<string, Delegate>;
          await client[config.model]!.update({
            where: { id },
            data: { status: 'ARCHIVED' },
            select: { id: true },
          });
        });

        await recordAudit({
          actorId: staff.id,
          action: `${config.model}.archived`,
          entityType: config.label,
          entityId: id,
          metadata: { reason: blocker },
        });

        revalidate(config.tags, id);
        return apiSuccess({ id, archived: true, reason: blocker });
      }

      await delegateFor(config.model).delete({ where: { id } });

      await recordAudit({
        actorId: staff.id,
        action: `${config.model}.deleted`,
        entityType: config.label,
        entityId: id,
      });

      revalidate(config.tags, id);
      return apiSuccess({ id, deleted: true });
    },
  );
}
