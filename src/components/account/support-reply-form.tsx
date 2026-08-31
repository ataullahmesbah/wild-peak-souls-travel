'use client';

import { Button } from '@/components/ui/button';
import { FormMessage, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function SupportReplyForm({ tokenId }: { tokenId: string }) {
  const { loading, error, success, fieldErrors, submit } = useApiForm(
    '/api/support/messages',
    { successMessage: 'Reply sent.' },
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input type="hidden" name="tokenId" value={tokenId} />
      <Textarea
        label="Add a reply"
        name="body"
        required
        rows={4}
        placeholder="Type your message…"
        error={fieldErrors.body}
      />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}
      <Button type="submit" loading={loading}>
        Send reply
      </Button>
    </form>
  );
}
