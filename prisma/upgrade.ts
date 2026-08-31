// prisma/upgrade.ts
/**
 * Wild Peak Souls — v1 → v2 upgrade.
 *
 * For a database that is already live and already has real data in it.
 *
 * The seed is for a fresh install. Running it against a working site would
 * rewrite the itineraries and options of the demo events and tours it created,
 * and reset the settings it owns. This script exists so nobody has to weigh
 * that up: it touches only what v2 added and is safe to run repeatedly.
 *
 * What it writes:
 *   - the new v2 permissions, and the system role → permission mapping
 *   - the settings rows v2 introduced, only where the key is missing
 *   - the dashboard page list that per-role page access is configured against
 *   - a starter set of blog categories, but ONLY if you have none at all
 *
 * What it never touches:
 *   - users, roles you created yourself, or anyone's password
 *   - bookings, payments, invoices, financial transactions
 *   - destinations, events, tours, activities, stays, visa content
 *   - leads, support tickets, reviews, notices, adverts, media
 *   - blog posts, blog comments, and any category you already created
 *   - the value of any setting that already exists
 *
 *   npm run db:upgrade
 */

import { PrismaClient, RoleName, SettingType } from '../src/generated/prisma';
import {
  ALL_PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  permissionModule,
} from '../src/lib/rbac/permissions';

const prisma = new PrismaClient();

async function upgradePermissions() {
  console.log('→ permissions');

  let added = 0;
  for (const key of ALL_PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { key } });
    if (!existing) added += 1;
    await prisma.permission.upsert({
      where: { key },
      create: { key, module: permissionModule(key), description: key },
      update: { module: permissionModule(key) },
    });
  }
  console.log(`  ${ALL_PERMISSIONS.length} permissions present (${added} new)`);
}

async function upgradeRolePermissions() {
  console.log('→ role permissions');

  const permissions = await prisma.permission.findMany({
    select: { id: true, key: true },
  });
  const idByKey = new Map(permissions.map((p) => [p.key, p.id]));

  // Only the built-in roles. A role somebody created themselves is left
  // exactly as they configured it.
  for (const roleName of Object.values(RoleName)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: {
        name: roleName,
        label: ROLE_LABELS[roleName],
        description: `${ROLE_LABELS[roleName]} role`,
        systemRole: true,
      },
      update: {},
      select: { id: true },
    });

    const wanted = (ROLE_PERMISSIONS[roleName] ?? [])
      .map((key) => idByKey.get(key))
      .filter((id): id is string => Boolean(id));

    const current = await prisma.rolePermission.findMany({
      where: { roleId: role.id },
      select: { permissionId: true },
    });
    const currentIds = new Set(current.map((row) => row.permissionId));

    // Add what is missing and remove what the role should no longer hold,
    // rather than deleting everything and rebuilding. The difference matters:
    // a delete-then-insert leaves a window where the role holds nothing, and
    // an interrupted run would strip a live role's access.
    const toAdd = wanted.filter((id) => !currentIds.has(id));
    const wantedIds = new Set(wanted);
    const toRemove = current
      .map((row) => row.permissionId)
      .filter((id) => !wantedIds.has(id));

    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
    if (toRemove.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id, permissionId: { in: toRemove } },
      });
    }

    if (toAdd.length > 0 || toRemove.length > 0) {
      console.log(`  ${roleName}: +${toAdd.length} −${toRemove.length}`);
    }
  }
}

/**
 * v2 settings, created only where absent.
 *
 * An existing key is never overwritten — if the site owner has already set a
 * contact number or a brand name, an upgrade must not quietly put the default
 * back.
 */
async function upgradeSettings() {
  console.log('→ settings');

  const { SETTINGS_CATALOGUE } = await import('../src/lib/settings-catalogue');
  const declared = SETTINGS_CATALOGUE.flatMap((group) =>
    group.fields.map((field) => ({ ...field, category: group.category })),
  );

  const existing = await prisma.setting.findMany({
    where: { key: { in: declared.map((field) => field.key) } },
    select: { key: true },
  });
  const present = new Set(existing.map((row) => row.key));
  const missing = declared.filter((field) => !present.has(field.key));

  if (missing.length === 0) {
    console.log('  nothing to add');
    return;
  }

  const DEFAULTS: Record<string, string> = {
    'home.faqEnabled': 'true',
    'home.heroFallbackTitle': 'Find your next journey',
    'home.heroFallbackSubtitle':
      'Curated trips across Bangladesh and beyond, run by people who have walked every route.',
    'owner.name': 'Ataullah Mesbah',
    'owner.url': 'https://www.ataullahmesbah.com',
    'owner.creditEnabled': 'true',
    'ai.assistantEnabled': 'true',
    'ai.assistantGreeting':
      'Hello. Ask me about any trip, destination or visa on this site and I will find it for you.',
    'business.openingHours': 'Saturday to Thursday, 10:00–19:00',
  };

  await prisma.setting.createMany({
    data: missing.map((field) => ({
      key: field.key,
      value:
        DEFAULTS[field.key] ??
        (field.type === SettingType.BOOLEAN ? 'false' : ''),
      type: field.type ?? SettingType.STRING,
      category: field.category,
      isSecret: field.isSecret ?? false,
      label: field.label,
      description: field.description ?? null,
    })),
    skipDuplicates: true,
  });

  console.log(`  ${missing.length} new setting${missing.length === 1 ? '' : 's'} added`);
}

/**
 * Starter blog categories.
 *
 * Only when the table is completely empty. If you have created even one
 * category of your own, this does nothing — an upgrade must never second-guess
 * a taxonomy the site owner has already chosen.
 */
async function upgradeBlogCategories() {
  console.log('→ blog categories');

  const existing = await prisma.postCategory.count();
  if (existing > 0) {
    console.log(`  ${existing} already present — left alone`);
    return;
  }

  const starters = [
    { name: 'Trekking', slug: 'trekking', description: 'Routes, gradients and what the walk is actually like.', position: 1 },
    { name: 'Beaches & Islands', slug: 'beaches-and-islands', description: 'Coastlines, boats and the best months to go.', position: 2 },
    { name: 'Travel Tips', slug: 'travel-tips', description: 'Packing, budgets, transport and the practical details.', position: 3 },
    { name: 'Visa & Paperwork', slug: 'visa-and-paperwork', description: 'Documents, timelines and what embassies actually ask for.', position: 4 },
    { name: 'Food & Culture', slug: 'food-and-culture', description: 'What to eat, what to expect and how to be a good guest.', position: 5 },
  ];

  await prisma.postCategory.createMany({ data: starters, skipDuplicates: true });
  console.log(`  ${starters.length} starter categories created`);
}

/** The page list the per-role access grid is configured against. */
async function upgradeDashboardPages() {
  console.log('→ dashboard pages');
  const { syncDashboardPages } = await import('../src/lib/rbac/page-access');
  await syncDashboardPages();
  const count = await prisma.dashboardPage.count();
  console.log(`  ${count} pages registered`);
}

async function main() {
  console.log('\nWild Peak Souls — upgrading an existing database to v2\n');
  console.log('This adds what v2 introduced. It does not delete or overwrite');
  console.log('your content, users, bookings or existing settings.\n');

  const before = await snapshot();

  await upgradePermissions();
  await upgradeRolePermissions();
  await upgradeSettings();
  await upgradeBlogCategories();
  await upgradeDashboardPages();

  const after = await snapshot();

  console.log('\nYour data, before and after:\n');
  let changed = false;
  for (const key of Object.keys(before) as Array<keyof typeof before>) {
    const mark = before[key] === after[key] ? ' ' : '*';
    if (before[key] !== after[key]) changed = true;
    console.log(
      `  ${mark} ${key.padEnd(22)} ${String(before[key]).padStart(6)} → ${after[key]}`,
    );
  }
  console.log(
    changed
      ? '\n  (* changed — expected only if a count was 0 before)'
      : '\n  Nothing was added or removed. Your data is untouched.',
  );

  console.log('\nUpgrade complete.\n');
}

/** Row counts for everything a site owner would care about losing. */
async function snapshot() {
  const [
    users,
    bookings,
    payments,
    invoices,
    transactions,
    destinations,
    events,
    tours,
    activities,
    stays,
    visaTypes,
    reviews,
    leads,
    supportTickets,
    media,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.booking.count(),
    prisma.payment.count(),
    prisma.invoice.count(),
    prisma.financialTransaction.count(),
    prisma.destination.count(),
    prisma.event.count(),
    prisma.tour.count(),
    prisma.activity.count(),
    prisma.accommodation.count(),
    prisma.visaType.count(),
    prisma.review.count(),
    prisma.contactRequest.count(),
    prisma.supportToken.count(),
    prisma.mediaAsset.count(),
  ]);

  return {
    users,
    bookings,
    payments,
    invoices,
    transactions,
    destinations,
    events,
    tours,
    activities,
    stays,
    visaTypes,
    reviews,
    leads,
    supportTickets,
    media,
  };
}

main()
  .catch((error) => {
    console.error('\nUpgrade failed:\n', error);
    console.error('\nNothing partial was left behind that a re-run will not fix.');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
