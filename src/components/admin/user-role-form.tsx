'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Settings2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormMessage, Select } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';
import { ROLE_LABELS } from '@/lib/rbac/permissions';

const STATUSES = ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'] as const;

export function UserRoleForm({
  userId,
  userName,
  currentRoles,
  currentStatus,
  canManageRoles,
  canSuspend,
  isSelf,
  assignableRoles,
}: {
  userId: string;
  userName: string;
  currentRoles: string[];
  currentStatus: string;
  canManageRoles: boolean;
  canSuspend: boolean;
  isSelf: boolean;
  /**
   * Only the roles this actor outranks. The server enforces the same rule and
   * is the authority; offering a role here that would be refused there just
   * teaches people the dashboard is unreliable.
   */
  assignableRoles: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/dashboard/users/update',
    {
      resetForm: false,
      successMessage: 'User updated.',
      onSuccess: () => {
        setTimeout(() => {
          setOpen(false);
          router.refresh();
        }, 900);
      },
    },
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="h-4 w-4" aria-hidden="true" />
        Manage
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`manage-${userId}`}
            className="wps-animate-in w-full max-w-md rounded-card bg-card p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`manage-${userId}`} className="font-display text-lg font-semibold">
                  Manage {userName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Currently {currentRoles.map((r) => ROLE_LABELS[r as keyof typeof ROLE_LABELS]).join(', ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
              <input type="hidden" name="userId" value={userId} />

              {canManageRoles && (
                <Select
                  label="Role"
                  name="role"
                  defaultValue={currentRoles[0] ?? 'CUSTOMER'}
                  error={fieldErrors.role}
                  hint="Replaces the user's existing role assignment."
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
                    </option>
                  ))}
                </Select>
              )}

              {canSuspend && (
                <Select
                  label="Account status"
                  name="status"
                  defaultValue={currentStatus}
                  error={fieldErrors.status}
                  hint={
                    isSelf
                      ? 'You cannot suspend your own account.'
                      : 'Suspending signs the user out of every device immediately.'
                  }
                  disabled={isSelf}
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </Select>
              )}

              {error && <FormMessage tone="error">{error}</FormMessage>}
              {success && <FormMessage tone="success">{success}</FormMessage>}

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading} className="flex-1">
                  Save changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
