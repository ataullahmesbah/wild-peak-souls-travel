import type { Metadata } from 'next';
import Link from 'next/link';
import { LifeBuoy } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { Panel } from '@/components/account/panels';
import { SupportTokenForm } from '@/components/account/support-token-form';
import { requireUserPage } from '@/lib/rbac/guard';
import { listMySupportTokens } from '@/lib/data/account';
import { relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Support',
  robots: { index: false, follow: false },
};

export default async function SupportPage() {
  const user = await requireUserPage();
  const tokens = await listMySupportTokens(user.id);

  return (
    <div className="space-y-6">
      <Panel
        title="Your support tokens"
        description="Each token gets a reference number and an assigned agent, so nothing gets lost."
      >
        {tokens.length === 0 ? (
          <EmptyState
            icon={LifeBuoy}
            title="No support tokens yet"
            description="Open one below and our team will pick it up during business hours."
          />
        ) : (
          <ul className="divide-y divide-border">
            {tokens.map((token) => (
              <li key={token.id}>
                <Link
                  href={`/account/support/${token.id}`}
                  className="-mx-2 flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3.5 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{token.subject}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {token.tokenNumber} · {token.category.toLowerCase()} ·{' '}
                      {token._count.messages} message
                      {token._count.messages === 1 ? '' : 's'} ·{' '}
                      {token.assignedTo ? `with ${token.assignedTo.name}` : 'unassigned'}{' '}
                      · updated {relativeTime(token.updatedAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={token.priority} />
                    <StatusBadge status={token.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Open a new token"
        description="Give us as much detail as you can — booking numbers especially."
      >
        <SupportTokenForm />
      </Panel>
    </div>
  );
}
