import type { NextRequest } from 'next/server';

import { apiHandler, apiSuccess } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { hasPermission, requirePermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit';
import { SETTING_KEYS, setSetting } from '@/lib/settings';
import { SettingType } from '@/generated/prisma';

const FIELD_PREFIX = 'setting:';

/**
 * Saves a category of settings.
 *
 * Two guards beyond the base permission: only keys that already exist in the
 * database can be written (so a crafted payload cannot invent settings), and
 * toggling maintenance mode needs its own permission on top of settings.update.
 */
export const POST = apiHandler(async (request: NextRequest) => {
  const staff = await requirePermission(PERMISSIONS.SETTINGS_UPDATE);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const submitted = Object.entries(body)
    .filter(([key]) => key.startsWith(FIELD_PREFIX))
    .map(([key, value]) => ({ key: key.slice(FIELD_PREFIX.length), value }));

  if (submitted.length === 0) {
    return apiSuccess({ updated: 0 });
  }

  const existing = await prisma.setting.findMany({
    where: { key: { in: submitted.map((s) => s.key) } },
    select: { key: true, value: true, type: true, isSecret: true, category: true },
  });
  const byKey = new Map(existing.map((s) => [s.key, s]));

  const changes: Array<{ key: string; from: string; to: string }> = [];
  let maintenanceToggled = false;

  for (const item of submitted) {
    const record = byKey.get(item.key);
    // Unknown key — ignore rather than creating arbitrary configuration.
    if (!record) continue;

    // A blank secret means "keep what is stored", not "clear it".
    if (record.isSecret && (item.value === '' || item.value === undefined)) continue;

    if (
      item.key === SETTING_KEYS.MAINTENANCE_ENABLED &&
      !hasPermission(staff, PERMISSIONS.MAINTENANCE_TOGGLE)
    ) {
      continue;
    }

    const nextValue =
      record.type === SettingType.BOOLEAN
        ? String(item.value === true || item.value === 'true')
        : String(item.value ?? '');

    if (nextValue === record.value) continue;

    await setSetting(item.key, nextValue, {
      type: record.type,
      category: record.category,
      isSecret: record.isSecret,
      updatedById: staff.id,
    });

    changes.push({
      key: item.key,
      // Secret values are never written into the audit metadata.
      from: record.isSecret ? '[redacted]' : record.value,
      to: record.isSecret ? '[redacted]' : nextValue,
    });

    if (item.key === SETTING_KEYS.MAINTENANCE_ENABLED) {
      maintenanceToggled = true;
    }
  }

  if (changes.length > 0) {
    await recordAudit({
      actorId: staff.id,
      action: maintenanceToggled
        ? AUDIT_ACTIONS.MAINTENANCE_TOGGLED
        : AUDIT_ACTIONS.SETTINGS_UPDATED,
      entityType: 'Setting',
      metadata: { changes },
    });
  }

  return apiSuccess({ updated: changes.length });
});
