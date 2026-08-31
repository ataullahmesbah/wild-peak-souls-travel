import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { AuthError } from '@/lib/rbac/guard';

export interface ApiErrorBody {
  error: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function apiError(
  message: string,
  status = 400,
  extra: Omit<ApiErrorBody, 'error'> = {},
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/**
 * Wraps a route handler so that no raw stack or Prisma error text can ever
 * reach a client. Known error shapes map to safe messages; everything else
 * becomes a generic 500 while the detail is logged server-side.
 */
export function apiHandler<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof AuthError) {
        return apiError(error.message, error.status);
      }
      if (error instanceof ZodError) {
        return apiError('Please check the highlighted fields.', 422, {
          code: 'VALIDATION_ERROR',
          fieldErrors: flattenZodError(error),
        });
      }
      if (error instanceof BusinessError) {
        return apiError(error.message, error.status, { code: error.code });
      }
      const prismaError = asPrismaError(error);
      if (prismaError) {
        return apiError(prismaError.message, prismaError.status, {
          code: prismaError.code,
        });
      }
      console.error('[api] unhandled error', error);
      return apiError(
        'Something went wrong on our side. Please try again.',
        500,
      );
    }
  };
}

/** Expected, user-facing failures (sold out, already booked, bad state). */
export class BusinessError extends Error {
  constructor(
    message: string,
    readonly code: string = 'BUSINESS_RULE',
    readonly status = 409,
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

export function flattenZodError(error: ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}


/**
 * Translates the handful of Prisma failures that are really user mistakes.
 *
 * Handlers check uniqueness and existence up front, but two editors saving the
 * same slug a millisecond apart still race past that check. Without this the
 * loser of the race sees a 500 and assumes the site is broken, when the honest
 * answer is "someone just took that slug". Prisma's own message is never
 * forwarded — it names tables and columns.
 */
function asPrismaError(
  error: unknown,
): { message: string; status: number; code: string } | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string' || !/^P\d{4}$/.test(code)) return null;

  switch (code) {
    case 'P2002':
      return {
        message: 'That value is already in use. Choose a different one.',
        status: 422,
        code: 'DUPLICATE',
      };
    case 'P2003':
      return {
        message: 'A linked record is missing or still in use.',
        status: 422,
        code: 'FOREIGN_KEY',
      };
    case 'P2025':
      return { message: 'Record not found.', status: 404, code: 'NOT_FOUND' };
    default:
      console.error('[api] prisma error', code, error);
      return null;
  }
}
