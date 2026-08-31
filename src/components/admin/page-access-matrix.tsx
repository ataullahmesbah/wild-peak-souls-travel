'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

interface PageRow {
  id: string;
  label: string;
  group: string;
  path: string;
}

interface RoleColumn {
  id: string;
  name: string;
  label: string;
}

/**
 * Tick a box to let a role open a page; untick it to hide the page from that
 * role entirely.
 *
 * This can only take access away. A role that lacks the permission behind a
 * page still cannot use it however this grid is set — which is why the grid is
 * safe to hand to a non-developer. The owner's own column is fixed on, because
 * a configuration mistake must never be able to lock the owner out.
 */
export function PageAccessMatrix({
  pages,
  roles,
  deniedKeys,
}: {
  pages: PageRow[];
  roles: RoleColumn[];
  /** `${roleId}:${pageId}` for each combination currently hidden. */
  deniedKeys: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [denied, setDenied] = React.useState(() => new Set(deniedKeys));
  const [saving, setSaving] = React.useState(false);

  const toggle = (roleId: string, pageId: string) => {
    setDenied((current) => {
      const next = new Set(current);
      const key = `${roleId}:${pageId}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  async function save() {
    setSaving(true);
    const entries = roles.flatMap((role) =>
      pages.map((page) => ({
        roleId: role.id,
        pageId: page.id,
        allowed: !denied.has(`${role.id}:${page.id}`),
      })),
    );

    try {
      const response = await fetch('/api/dashboard/page-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { hidden: number };
      };
      if (!response.ok) {
        toast.error(body.error ?? 'That could not be saved.');
        return;
      }
      toast.success(
        body.data?.hidden
          ? `Saved. ${body.data.hidden} page${body.data.hidden === 1 ? ' is' : 's are'} now hidden.`
          : 'Saved. Every page is visible to every role that has its permission.',
      );
      router.refresh();
    } catch {
      toast.error('We could not reach the server. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  const groups = [...new Set(pages.map((page) => page.group))];

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: '52rem' }}>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="pb-3 pr-4 font-medium">
                Page
              </th>
              {roles.map((role) => (
                <th
                  key={role.id}
                  scope="col"
                  className="pb-3 pr-3 text-center text-xs font-medium"
                >
                  {role.label}
                  {role.name === 'SUPER_ADMIN' && (
                    <span className="mt-0.5 block font-normal text-muted-foreground">
                      always on
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {groups.map((group) => (
              <React.Fragment key={group}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={roles.length + 1}
                    className="bg-muted/40 py-2 pl-1 text-left text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    {group}
                  </th>
                </tr>
                {pages
                  .filter((page) => page.group === group)
                  .map((page) => (
                    <tr key={page.id} className="transition-colors hover:bg-muted/30">
                      <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                        <span className="font-medium">{page.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {page.path}
                        </span>
                      </th>
                      {roles.map((role) => {
                        const locked = role.name === 'SUPER_ADMIN';
                        const allowed = locked || !denied.has(`${role.id}:${page.id}`);
                        return (
                          <td key={role.id} className="py-2.5 pr-3 text-center">
                            <input
                              type="checkbox"
                              checked={allowed}
                              disabled={locked}
                              onChange={() => toggle(role.id, page.id)}
                              aria-label={`${role.label} can open ${page.label}`}
                              className="h-4.5 w-4.5 rounded border-border text-primary disabled:opacity-50"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={save} loading={saving} type="button">
        Save page access
      </Button>
    </div>
  );
}
