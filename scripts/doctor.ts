// scripts/doctor.ts
/**
 * One command that checks the things people actually get stuck on.
 *
 * Every check reports what is wrong AND what to do about it. Nothing here
 * prints a secret — only whether one is present and whether it parses.
 *
 *   npm run doctor
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '../src/generated/prisma';
import {
  cloudinaryConfigProblem,
  cloudinaryCredentials,
  isCloudinaryConfigured,
} from '../src/lib/env';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

let problems = 0;
let warnings = 0;

const ok = (m: string) => console.log(`  ${GREEN}ok${RESET}     ${m}`);
const bad = (m: string, fix?: string) => {
  console.log(`  ${RED}broken${RESET} ${m}`);
  if (fix) console.log(`         ${DIM}→ ${fix}${RESET}`);
  problems += 1;
};
const warn = (m: string, fix?: string) => {
  console.log(`  ${YELLOW}check${RESET}  ${m}`);
  if (fix) console.log(`         ${DIM}→ ${fix}${RESET}`);
  warnings += 1;
};

function section(title: string) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------

function checkRequiredEnv() {
  section('Environment');

  if (!process.env.DATABASE_URL) {
    bad('DATABASE_URL is not set', 'Copy .env.example to .env and fill it in.');
  } else {
    ok('DATABASE_URL is set');
  }

  const secret = process.env.AUTH_SECRET ?? '';
  if (!secret) {
    bad('AUTH_SECRET is not set', 'Generate one: openssl rand -base64 48');
  } else if (secret.length < 32) {
    bad(
      `AUTH_SECRET is only ${secret.length} characters`,
      'It must be at least 32. Generate one: openssl rand -base64 48',
    );
  } else if (secret.startsWith('replace-with')) {
    bad('AUTH_SECRET is still the placeholder from .env.example', 'openssl rand -base64 48');
  } else {
    ok('AUTH_SECRET looks usable');
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!site) {
    warn('NEXT_PUBLIC_SITE_URL is not set', 'Canonical URLs and the sitemap will fall back to localhost.');
  } else if (site.endsWith('/')) {
    warn(`NEXT_PUBLIC_SITE_URL ends with a slash (${site})`, 'Remove it — URLs are built by appending paths.');
  } else {
    ok(`NEXT_PUBLIC_SITE_URL = ${site}`);
  }
}

function checkCloudinary() {
  section('Image hosting (Cloudinary)');

  if (!isCloudinaryConfigured()) {
    bad(
      cloudinaryConfigProblem() ?? 'not configured',
      'Cloudinary’s dashboard shows CLOUDINARY_URL first — that single line is enough.',
    );
    return;
  }

  const credentials = cloudinaryCredentials()!;
  const via = process.env.CLOUDINARY_CLOUD_NAME?.trim()
    ? 'three separate variables'
    : 'CLOUDINARY_URL';
  ok(`configured via ${via}`);
  ok(`cloud name: ${credentials.cloudName}`);
  ok(`api key   : ${credentials.apiKey.slice(0, 4)}… (${credentials.apiKey.length} chars)`);
  ok(`api secret: present (${credentials.apiSecret.length} chars)`);

  if (!/^\d+$/.test(credentials.apiKey)) {
    warn('the API key is not all digits', 'Cloudinary keys are numeric — check the key and secret are not swapped.');
  }
}

async function checkDatabase() {
  section('Database');

  if (!process.env.DATABASE_URL) return;

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw<Array<{ v: string }>>`SELECT version() AS v`;
    ok(`connected — ${rows[0]!.v.split(',')[0]}`);

    const applied = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
    ok(`${applied[0]!.n} migrations applied`);

    // The blog tables are the newest; their absence is the usual sign that
    // db:deploy has not been run after an update.
    const blog = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name IN ('Post','PostCategory','PostComment')`;
    if (Number(blog[0]!.n) < 3) {
      bad('the blog tables are missing', 'Run: npm run db:deploy');
    } else {
      ok('blog tables present');
    }

    const perms = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM "Permission" WHERE key LIKE 'blog.%' OR key LIKE 'comments.%'`;
    if (Number(perms[0]!.n) < 8) {
      bad(
        `only ${perms[0]!.n} of the 8 blog permissions exist`,
        'Run: npm run db:upgrade',
      );
    } else {
      ok('blog and comment permissions granted');
    }

    const trgm = await prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT count(*) AS n FROM pg_indexes
      WHERE schemaname = current_schema() AND indexname LIKE 'idx_trgm_%'`;
    if (Number(trgm[0]!.n) === 0) {
      warn(
        'no trigram search indexes',
        'Your host may not allow the pg_trgm extension. Search still works, just unindexed.',
      );
    } else {
      ok(`${trgm[0]!.n} trigram search indexes`);
    }
  } catch (error) {
    bad(
      `could not connect — ${(error as Error).message.split('\n').filter(Boolean)[0]}`,
      'Check DATABASE_URL, and run: npm run db:check',
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * The Windows failure that produces `os error 1392`. A file that cannot be
 * stat'ed inside the build directory is the one Turbopack will panic on.
 */
function checkBuildDir() {
  section('Build output');

  const dir = process.env.WPS_DIST_DIR?.trim() || '.next';
  if (!existsSync(dir)) {
    ok(`${dir} does not exist yet — nothing stale to trip over`);
    return;
  }

  let scanned = 0;
  const unreadable: string[] = [];

  const walk = (path: string, depth: number) => {
    if (depth > 6 || unreadable.length > 20) return;
    let entries: string[];
    try {
      entries = readdirSync(path);
    } catch {
      unreadable.push(path);
      return;
    }
    for (const entry of entries) {
      const full = join(path, entry);
      try {
        scanned += 1;
        if (statSync(full).isDirectory()) walk(full, depth + 1);
      } catch {
        unreadable.push(full);
      }
    }
  };
  walk(dir, 0);

  if (unreadable.length > 0) {
    bad(
      `${unreadable.length} unreadable file(s) inside ${dir} — this is the "os error 1392" cause`,
      `Delete ${dir}. If the delete fails or they come back, set WPS_DIST_DIR=.next-clean in .env and run chkdsk.`,
    );
    for (const path of unreadable.slice(0, 5)) console.log(`         ${DIM}${path}${RESET}`);
  } else {
    ok(`${scanned} files under ${dir}, all readable`);
  }
}

async function main() {
  console.log('\nWild Peak Souls — setup check');

  checkRequiredEnv();
  checkCloudinary();
  await checkDatabase();
  checkBuildDir();

  console.log('');
  if (problems > 0) {
    console.log(
      `${RED}${problems} thing${problems === 1 ? '' : 's'} to fix${RESET}` +
        (warnings > 0 ? `, ${warnings} to look at` : '') +
        '\n',
    );
    process.exit(1);
  }
  if (warnings > 0) {
    console.log(`${YELLOW}No errors, ${warnings} thing${warnings === 1 ? '' : 's'} to look at${RESET}\n`);
    return;
  }
  console.log(`${GREEN}Everything checks out.${RESET}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
