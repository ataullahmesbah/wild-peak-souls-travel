import type { Metadata } from 'next';
import { MessageSquare } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { Panel } from '@/components/account/panels';
import { requireUserPage } from '@/lib/rbac/guard';
import { prisma } from '@/lib/prisma';
import { relativeTime, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Messages',
  robots: { index: false, follow: false },
};

export default async function MessagesPage() {
  const user = await requireUserPage();

  const conversations = await prisma.conversation.findMany({
    where: { customerId: user.id },
    select: {
      id: true,
      subject: true,
      status: true,
      lastMessageAt: true,
      messages: {
        // Internal staff notes never appear in the customer's thread preview.
        where: { messageType: { not: 'INTERNAL_NOTE' } },
        select: { body: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { lastMessageAt: 'desc' },
    take: 30,
  });

  return (
    <Panel
      title="Messages"
      description="Direct conversations with our team. For anything needing a tracked reference, use a support token instead."
    >
      {conversations.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No conversations yet"
          description="Support tokens are the best way to reach us — they are tracked and assigned to a specific agent."
          actionLabel="Open a support token"
          actionHref="/account/support"
        />
      ) : (
        <ul className="divide-y divide-border">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{conversation.subject}</p>
                {conversation.messages[0] && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {truncate(conversation.messages[0].body, 90)}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {relativeTime(conversation.lastMessageAt)}
                </p>
              </div>
              <StatusBadge status={conversation.status} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <ButtonLink href="/account/support" size="sm">
          Open a support token
        </ButtonLink>
      </div>
    </Panel>
  );
}
