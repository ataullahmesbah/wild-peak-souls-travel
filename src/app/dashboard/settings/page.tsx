import type { Metadata } from 'next';
import { Lock } from 'lucide-react';

import { AdminCard, AdminPageHeader } from '@/components/admin/admin-ui';
import { ButtonLink } from '@/components/ui/button';
import { SettingsForm } from '@/components/admin/settings-form';
import { prisma } from '@/lib/prisma';
import { requirePermissionPage, hasPermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { SETTINGS_CATALOGUE, ensureDeclaredSettings } from '@/lib/settings-catalogue';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const staff = await requirePermissionPage(PERMISSIONS.SETTINGS_READ);
  // A setting declared in code but never seeded would otherwise be invisible
  // here and unsaveable through the API, which refuses to create rows.
  await ensureDeclaredSettings();
  const grouped = await loadSettingValues();

  const canEdit = hasPermission(staff, PERMISSIONS.SETTINGS_UPDATE);
  const canToggleMaintenance = hasPermission(staff, PERMISSIONS.MAINTENANCE_TOGGLE);
  const canManagePageAccess = hasPermission(staff, PERMISSIONS.PAGE_ACCESS_MANAGE);

  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Business configuration that changes without a deploy. Every change is written to the audit log."
        actions={
          canManagePageAccess ? (
            <ButtonLink href="/dashboard/settings/access" variant="outline" size="sm">
              Page access
            </ButtonLink>
          ) : undefined
        }
      />

      {!canEdit && (
        <div className="mb-6 flex items-center gap-3 rounded-card border border-border bg-card p-4">
          <Lock className="h-4.5 w-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            You have read access to settings. Changing them requires the{' '}
            <code className="rounded bg-muted px-1 text-xs">settings.update</code>{' '}
            permission.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {SETTINGS_CATALOGUE.map((group) => {
          const editable =
            group.fields.some((field) => field.guardedBy === 'maintenance')
              ? canEdit && canToggleMaintenance
              : canEdit;

          const fields = group.fields
            .map((field) => {
              const row = grouped.get(field.key);
              if (!row) return null;
              return {
                key: field.key,
                // A secret's value never reaches the browser — only whether one
                // is set at all.
                value: field.isSecret ? '' : row.value,
                type: row.type,
                isSecret: field.isSecret ?? false,
                label: field.label,
                description: field.description ?? null,
                hasSecretValue: (field.isSecret ?? false) && row.value.length > 0,
                multiline: field.multiline,
                placeholder: field.placeholder,
              };
            })
            .filter((field) => field !== null);

          if (fields.length === 0) return null;

          const updatedAt = fields.reduce<Date | null>((latest, field) => {
            const at = grouped.get(field.key)?.updatedAt ?? null;
            if (!at) return latest;
            return !latest || at > latest ? at : latest;
          }, null);

          return (
            <AdminCard
              key={group.category}
              title={group.title}
              description={group.description}
            >
              <SettingsForm
                category={group.category}
                editable={editable}
                settings={fields}
              />
              {updatedAt && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Last changed {formatDateTime(updatedAt)}
                </p>
              )}
            </AdminCard>
          );
        })}
      </div>

    </>
  );
}

/** Current values for every declared setting, keyed for direct lookup. */
async function loadSettingValues() {
  const rows = await prisma.setting.findMany({
    select: { key: true, value: true, type: true, updatedAt: true },
  });
  return new Map(rows.map((row) => [row.key, row]));
}
