import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { StatusBadge } from '@/components/ui/badge';
import { AdminCard, AdminPageHeader } from '@/components/admin/admin-ui';
import { DetailRow } from '@/components/account/panels';
import { StaffReplyForm } from '@/components/admin/staff-reply-form';
import { requirePermissionPage, hasPermission } from '@/lib/rbac/guard';
import { PERMISSIONS } from '@/lib/rbac/permissions';
import { getAdminSupportToken } from '@/lib/data/admin';
import { cn, formatDateTime, initials } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Support Token',
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function AdminSupportTokenPage({ params }: { params: Params }) {
  const staff = await requirePermissionPage(PERMISSIONS.SUPPORT_READ);
  const { id } = await params;

  const token = await getAdminSupportToken(id);
  if (!token) notFound();

  const canReply = hasPermission(staff, PERMISSIONS.SUPPORT_MANAGE);

  return (
    <>
      <AdminPageHeader
        title={token.tokenNumber}
        description={token.subject}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={token.priority} />
            <StatusBadge status={token.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <AdminCard title="Conversation">
          <div className="rounded-field bg-muted/60 p-4">
            <p className="text-xs font-medium text-muted-foreground">Original request</p>
            <p className="mt-1.5 whitespace-pre-line text-sm">{token.description}</p>
          </div>

          <ul className="mt-6 space-y-4">
            {token.messages.map((message) => {
              const internal = message.messageType === 'INTERNAL_NOTE';
              const fromStaff = message.sender.id !== token.customer.id;

              return (
                <li key={message.id} className={cn('flex gap-3', fromStaff && 'flex-row-reverse')}>
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      internal
                        ? 'bg-warning-soft text-warning'
                        : fromStaff
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-info-soft text-info',
                    )}
                    aria-hidden="true"
                  >
                    {initials(message.sender.name)}
                  </span>
                  <div className={cn('max-w-[80%]', fromStaff && 'text-right')}>
                    <p className="text-xs text-muted-foreground">
                      {message.sender.name} · {formatDateTime(message.createdAt)}
                      {internal && (
                        <span className="ml-1.5 font-medium text-warning">
                          internal note
                        </span>
                      )}
                    </p>
                    <div
                      className={cn(
                        'mt-1 inline-block whitespace-pre-line rounded-field px-4 py-2.5 text-left text-sm',
                        internal
                          ? 'border border-warning/30 bg-warning-soft'
                          : fromStaff
                            ? 'bg-primary-soft'
                            : 'bg-muted',
                      )}
                    >
                      {message.body}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {canReply && token.status !== 'CLOSED' && (
            <div className="mt-6 border-t border-border pt-5">
              <StaffReplyForm tokenId={token.id} currentStatus={token.status} />
            </div>
          )}
        </AdminCard>

        <aside className="space-y-6">
          <AdminCard title="Customer">
            <dl className="divide-y divide-border">
              <DetailRow label="Name">{token.customer.name}</DetailRow>
              <DetailRow label="Email">{token.customer.email}</DetailRow>
              <DetailRow label="Phone">{token.customer.phone ?? '—'}</DetailRow>
            </dl>
          </AdminCard>

          <AdminCard title="Token">
            <dl className="divide-y divide-border">
              <DetailRow label="Category">{token.category.toLowerCase()}</DetailRow>
              <DetailRow label="Opened">{formatDateTime(token.createdAt)}</DetailRow>
              <DetailRow label="Assigned to">
                {token.assignedTo?.name ?? 'Unassigned'}
              </DetailRow>
            </dl>
          </AdminCard>
        </aside>
      </div>
    </>
  );
}
