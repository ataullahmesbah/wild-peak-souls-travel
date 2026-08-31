import { Prisma, PrismaClient } from '@/generated/prisma';

/**
 * One PrismaClient per Node.js process, cached on `globalThis`.
 *
 * Each PrismaClient owns its own connection pool. Creating a second client
 * doubles the connections this process holds open, so the instance is cached
 * in *every* environment, not only in development:
 *
 *   - dev: Next.js re-evaluates modules on each hot reload;
 *   - serverless (Vercel, Netlify, Lambda): a warm container re-runs module
 *     initialisation on some code paths, and a fresh pool per invocation is
 *     what produces "too many connections" under load.
 *
 * Pool size comes from the connection string, not from here — see
 * `connection_limit` in .env.example and docs/DEPLOYMENT.md. Prisma defaults
 * to (CPU cores x 2) + 1 when the parameter is absent, which is right for a
 * long-running server and far too large for serverless.
 */

/**
 * Log a warning for any query slower than this many milliseconds.
 * Unset or 0 disables the listener entirely, so there is no cost in production
 * until you deliberately turn it on.
 */
function slowQueryThreshold(): number {
  const raw = process.env.SLOW_QUERY_MS;
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * Prisma logs the *prepared statement*, so the text already contains `$1`
 * placeholders rather than values. This strips quoted literals as well, so
 * that a query built with an inlined constant can never put customer data
 * into the server log. `params` is never read at all.
 */
function redact(sql: string): string {
  const stripped = sql.replace(/'(?:[^']|'')*'/g, "'?'");
  return stripped.length > 300 ? `${stripped.slice(0, 300)}…` : stripped;
}

function createPrismaClient(): PrismaClient {
  const threshold = slowQueryThreshold();

  const log: Prisma.LogDefinition[] = [{ emit: 'stdout', level: 'error' }];
  if (process.env.NODE_ENV === 'development') {
    log.push({ emit: 'stdout', level: 'warn' });
  }
  if (threshold > 0) {
    log.push({ emit: 'event', level: 'query' });
  }

  const client = new PrismaClient({ log });

  if (threshold > 0) {
    // The `query` event is only emitted because of the definition pushed
    // above; the cast tells TypeScript about a log config it cannot infer
    // from a runtime-built array.
    (
      client as unknown as {
        $on: (
          event: 'query',
          callback: (e: { query: string; duration: number }) => void,
        ) => void;
      }
    ).$on('query', (event) => {
      if (event.duration < threshold) return;
      console.warn(
        `[slow-query] ${event.duration}ms ${redact(event.query)}`,
      );
    });
  }

  return client;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
