// src/lib/settings.ts
import 'server-only';

import { cache } from 'react';

import {
  DEFAULT_SETTINGS,
  SECRET_SETTING_KEYS,
  SETTING_KEYS,
} from '@/lib/settings-keys';

import { prisma } from '@/lib/prisma';
import { SettingType } from '@/generated/prisma';

/**
 * Dashboard-managed configuration. Anything a business user should be able to
 * change without a deploy lives here rather than in code or env vars.
 */
export {
  SETTING_KEYS,
  SECRET_SETTING_KEYS,
  DEFAULT_SETTINGS,
  type SettingKey,
} from '@/lib/settings-keys';

export type SettingsMap = Record<string, string>;

/**
 * Loads all non-secret settings. Memoized per request. Falls back to defaults
 * when the database is unreachable so the marketing site still renders.
 */
export const getPublicSettings = cache(async (): Promise<SettingsMap> => {
  try {
    const rows = await prisma.setting.findMany({
      where: { isSecret: false },
      select: { key: true, value: true },
    });
    const map: SettingsMap = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (SECRET_SETTING_KEYS.includes(row.key)) continue;
      map[row.key] = row.value;
    }
    return map;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
});

/** Server-only accessor that CAN read secret values. Never return this to a client. */
export async function getSecretSetting(key: string): Promise<string | null> {
  const row = await prisma.setting
    .findUnique({ where: { key }, select: { value: true } })
    .catch(() => null);
  return row?.value ?? null;
}

export function settingString(
  settings: SettingsMap,
  key: string,
  fallback = '',
): string {
  return settings[key] ?? DEFAULT_SETTINGS[key] ?? fallback;
}

export function settingBool(
  settings: SettingsMap,
  key: string,
  fallback = false,
): boolean {
  const raw = settings[key] ?? DEFAULT_SETTINGS[key];
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
}

export function settingNumber(
  settings: SettingsMap,
  key: string,
  fallback = 0,
): number {
  const raw = settings[key] ?? DEFAULT_SETTINGS[key];
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function setSetting(
  key: string,
  value: string,
  options: {
    type?: SettingType;
    category?: string;
    isSecret?: boolean;
    updatedById?: string;
  } = {},
): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: {
      key,
      value,
      type: options.type ?? SettingType.STRING,
      category: options.category ?? key.split('.')[0] ?? 'general',
      isSecret: options.isSecret ?? SECRET_SETTING_KEYS.includes(key),
      updatedById: options.updatedById ?? null,
    },
    update: {
      value,
      updatedById: options.updatedById ?? null,
    },
  });
}

export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getPublicSettings();
  return settingBool(settings, SETTING_KEYS.MAINTENANCE_ENABLED);
}
