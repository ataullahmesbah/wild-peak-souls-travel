// scripts/check-db-urls.ts
/**
 * Preflight for the two database connection strings.
 *
 * Getting these wrong is quiet rather than loud: a missing `pgbouncer=true`
 * shows up weeks later as an intermittent "prepared statement already exists",
 * and a `-pooler` host on the migrate command fails only at deploy time. This
 * checks the shape of both strings, then actually connects with each and does
 * the thing that string is for — a query on the pooled one, a CREATE/DROP on
 * the direct one.
 *
 * It never prints a password.
 *
 *   npm run db:check
 */

import { PrismaClient } from '../src/generated/prisma';

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

let problems = 0;
let warnings = 0;

function ok(message: string) {
  console.log(`  ${GREEN}ok${RESET}    ${message}`);
}
function bad(message: string, fix?: string) {
  console.log(`  ${RED}wrong${RESET} ${message}`);
  if (fix) console.log(`        ${DIM}→ ${fix}${RESET}`);
  problems += 1;
}
function warn(message: string, fix?: string) {
  console.log(`  ${YELLOW}check${RESET} ${message}`);
  if (fix) console.log(`        ${DIM}→ ${fix}${RESET}`);
  warnings += 1;
}

interface Parsed {
  raw: string;
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
  params: URLSearchParams;
}

function parse(raw: string): Parsed | null {
  try {
    const url = new URL(raw);
    return {
      raw,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port,
      database: url.pathname.replace(/^\//, ''),
      params: url.searchParams,
    };
  } catch {
    return null;
  }
}

/** Shared checks that apply to any connection string. */
function checkCommon(label: string, p: Parsed) {
  if (/\s/.test(p.password)) {
    bad(
      `${label}: the password contains a space or newline`,
      'Copy it again from the provider — a stray space breaks authentication.',
    );
  }
  if (/\s/.test(p.host)) {
    bad(`${label}: the hostname contains whitespace`);
  }
  if (!p.database) {
    bad(`${label}: no database name after the host`, 'It should end with /neondb (or your database name).');
  }
  if (p.host.endsWith('.neon.tech') && !/^ep-[a-z0-9-]+/.test(p.host)) {
    bad(
      `${label}: the Neon endpoint should start with "ep-" and a hyphen`,
      `got "${p.host.split('.')[0]}"`,
    );
  }
  if (p.params.get('sslmode') !== 'require') {
    warn(`${label}: sslmode is not "require"`, 'Managed providers need TLS; keep sslmode=require.');
  }
}

async function probe(label: string, url: string, ddl: boolean): Promise<void> {
  const client = new PrismaClient({ datasources: { db: { url } } });
  try {
    const rows = await client.$queryRaw<Array<{ v: string }>>`SELECT version() AS v`;
    ok(`${label}: connected — ${rows[0]!.v.split(',')[0]}`);

    if (ddl) {
      // The whole point of the direct string. A transaction-mode pooler
      // cannot reliably carry this.
      await client.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS _wps_url_check (id int)');
      await client.$executeRawUnsafe('DROP TABLE _wps_url_check');
      ok(`${label}: can create and drop a table (migrations will work)`);
    }
  } catch (error) {
    const message = (error as Error).message.split('\n').filter(Boolean).slice(0, 3).join(' ');
    bad(`${label}: could not connect — ${message}`);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  console.log('\nChecking the database connection strings\n');

  const pooledRaw = process.env.DATABASE_URL ?? '';
  const directRaw = process.env.DIRECT_DATABASE_URL ?? '';

  if (!pooledRaw) {
    bad('DATABASE_URL is not set');
    process.exit(1);
  }

  const pooled = parse(pooledRaw);
  if (!pooled) {
    bad('DATABASE_URL is not a valid URL', 'Check for a stray space or a missing quote.');
    process.exit(1);
  }

  // --- DATABASE_URL -------------------------------------------------------
  console.log(`DATABASE_URL  ${DIM}${pooled.user}@${pooled.host}/${pooled.database}${RESET}`);
  checkCommon('DATABASE_URL', pooled);

  const isNeon = pooled.host.endsWith('.neon.tech');
  const looksPooled =
    pooled.host.includes('-pooler') || pooled.port === '6543' || pooled.raw.startsWith('prisma://');

  if (looksPooled) {
    ok('DATABASE_URL points at the pooled endpoint');
    if (pooled.params.get('pgbouncer') !== 'true') {
      bad(
        'DATABASE_URL is pooled but has no pgbouncer=true',
        'Without it you get intermittent "prepared statement s0 already exists".',
      );
    } else {
      ok('pgbouncer=true is set');
    }

    const limit = pooled.params.get('connection_limit');
    if (limit !== '1') {
      warn(
        `connection_limit is ${limit ?? 'not set'}`,
        'On serverless use 1 — each function instance keeps its own pool.',
      );
    } else {
      ok('connection_limit=1');
    }

    if (!pooled.params.get('pool_timeout')) {
      warn('no pool_timeout', 'pool_timeout=20 queues at a traffic spike instead of erroring.');
    } else {
      ok(`pool_timeout=${pooled.params.get('pool_timeout')}`);
    }
  } else {
    warn(
      'DATABASE_URL does not look like a pooled endpoint',
      'Fine for a VPS or local. On Vercel/Netlify use the pooled host.',
    );
  }

  await probe('DATABASE_URL', pooledRaw, false);

  // --- DIRECT_DATABASE_URL ------------------------------------------------
  console.log('');
  if (!directRaw) {
    if (looksPooled) {
      warn(
        'DIRECT_DATABASE_URL is empty',
        'Migrations cannot run through a transaction pooler. Set it before deploying.',
      );
    } else {
      ok('DIRECT_DATABASE_URL is empty — not needed when DATABASE_URL is already direct');
    }
  } else {
    const direct = parse(directRaw);
    if (!direct) {
      bad('DIRECT_DATABASE_URL is not a valid URL', 'Check for a stray space or a missing quote.');
    } else {
      console.log(
        `DIRECT_DATABASE_URL  ${DIM}${direct.user}@${direct.host}/${direct.database}${RESET}`,
      );
      checkCommon('DIRECT_DATABASE_URL', direct);

      const directIsPooled = direct.host.includes('-pooler') || direct.port === '6543';
      if (directIsPooled) {
        bad(
          'DIRECT_DATABASE_URL still points at the pooled endpoint',
          'Remove "-pooler" from the hostname (Neon), or use port 5432 (Supabase).',
        );
      } else {
        ok('DIRECT_DATABASE_URL points at the direct endpoint');
      }

      for (const forbidden of ['pgbouncer', 'connection_limit', 'pool_timeout']) {
        if (direct.params.has(forbidden)) {
          bad(
            `DIRECT_DATABASE_URL carries ${forbidden}`,
            'Those belong only on the pooled string. Remove it.',
          );
        }
      }

      // The two strings must be the same database, or you would migrate one
      // and serve another — the failure mode is "my new table does not exist".
      if (direct.user !== pooled.user) {
        bad('the two URLs use different usernames', 'They must be the same database.');
      } else if (direct.password !== pooled.password) {
        bad('the two URLs use different passwords', 'They must be the same database.');
      } else if (direct.database !== pooled.database) {
        bad(
          `different database names (${pooled.database} vs ${direct.database})`,
          'They must be the same database.',
        );
      } else {
        ok('same user, password and database as DATABASE_URL');
      }

      // Skipped when we already said it is the pooled host — one message for
      // one mistake.
      if (isNeon && !directIsPooled) {
        const stripped = pooled.host.replace('-pooler', '');
        if (direct.host !== stripped) {
          warn(
            'the hostnames differ by more than "-pooler"',
            `expected ${stripped}, got ${direct.host}`,
          );
        } else {
          ok('hostname differs from DATABASE_URL only by "-pooler"');
        }
      }

      await probe('DIRECT_DATABASE_URL', directRaw, true);
    }
  }

  console.log('');
  if (problems > 0) {
    console.log(`${RED}${problems} problem${problems === 1 ? '' : 's'} to fix${RESET}` +
      (warnings > 0 ? `, ${warnings} to look at` : '') + '\n');
    process.exit(1);
  }
  if (warnings > 0) {
    console.log(`${YELLOW}No errors, ${warnings} thing${warnings === 1 ? '' : 's'} to look at${RESET}\n`);
    return;
  }
  console.log(`${GREEN}Both connection strings are correct.${RESET}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
