import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StatusBadge } from '@/components/ui/badge';
import { Panel, DetailRow } from '@/components/account/panels';
import { SupportReplyForm } from '@/components/account/support-reply-form';
import { requireUserPage } from '@/lib/rbac/guard';
import { getMySupportToken } from '@/lib/data/account';
import { cn, formatDateTime, initials } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Support Token',
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function SupportTokenPage({ params }: { params: Params }) {
  const user = await requireUserPage();
  const { id } = await params;

  // Scoped to this customer inside the query; internal staff notes are
  // excluded from the message list by the data layer.
  const token = await getMySupportToken(user.id, id);
  if (!token) notFound();

  const closed = token.status === 'CLOSED';

  return (
    <div className="space-y-6">
      <Panel title={token.subject}>
        <dl className="divide-y divide-border">
          <DetailRow label="Token number">{token.tokenNumber}</DetailRow>
          <DetailRow label="Category">{token.category.toLowerCase()}</DetailRow>
          <DetailRow label="Priority">
            <StatusBadge status={token.priority} />
          </DetailRow>
          <DetailRow label="Status">
            <StatusBadge status={token.status} />
          </DetailRow>
          <DetailRow label="Assigned to">
            {token.assignedTo?.name ?? 'Not yet assigned'}
          </DetailRow>
          <DetailRow label="Opened">{formatDateTime(token.createdAt)}</DetailRow>
        </dl>
        <div className="mt-4 rounded-field bg-muted/60 p-4">
          <p className="text-xs font-medium text-muted-foreground">Original request</p>
          <p className="mt-1.5 whitespace-pre-line text-sm">{token.description}</p>
        </div>
      </Panel>

      <Panel title="Conversation">
        {token.messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No replies yet. Our team will respond during business hours.
          </p>
        ) : (
          <ul className="space-y-4">
            {token.messages.map((message) => {
              const mine = message.sender.id === user.id;
              return (
                <li key={message.id} className={cn('flex gap-3', mine && 'flex-row-reverse')}>
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      mine
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-info-soft text-info',
                    )}
                    aria-hidden="true"
                  >
                    {initials(message.sender.name)}
                  </span>
                  <div className={cn('max-w-[80%]', mine && 'text-right')}>
                    <p className="text-xs text-muted-foreground">
                      {mine ? 'You' : message.sender.name} ·{' '}
                      {formatDateTime(message.createdAt)}
                    </p>
                    <div
                      className={cn(
                        'mt-1 inline-block whitespace-pre-line rounded-field px-4 py-2.5 text-left text-sm',
                        mine ? 'bg-primary-soft' : 'bg-muted',
                      )}
                    >
                      {message.body}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {closed ? (
          <p className="mt-6 rounded-field bg-muted/60 p-4 text-sm text-muted-foreground">
            This token is closed. If the issue comes back, open a new token and
            reference {token.tokenNumber}.
          </p>
        ) : (
          <div className="mt-6 border-t border-border pt-5">
            <SupportReplyForm tokenId={token.id} />
          </div>
        )}
      </Panel>
    </div>
  );
}
