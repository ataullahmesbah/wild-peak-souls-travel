'use client';

import * as React from 'react';
import { Check, EyeOff, Star, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormMessage, Input } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

export function ReviewModerationForm({
  reviewId,
  currentStatus,
  featured,
}: {
  reviewId: string;
  currentStatus: string;
  featured: boolean;
}) {
  const [status, setStatus] = React.useState(currentStatus);
  const [isFeatured, setIsFeatured] = React.useState(featured);

  const { loading, error, success, submit } = useApiForm('/api/dashboard/reviews/moderate', {
    resetForm: false,
    successMessage: 'Review updated.',
  });

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="featured" value={String(isFeatured)} />

      <Input
        label="Moderation note"
        name="note"
        placeholder="Optional — why this decision was made."
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="sm"
          loading={loading && status === 'APPROVED'}
          onClick={() => setStatus('APPROVED')}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Approve
        </Button>
        <Button
          type="submit"
          size="sm"
          variant="destructive"
          loading={loading && status === 'REJECTED'}
          onClick={() => setStatus('REJECTED')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Reject
        </Button>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          loading={loading && status === 'HIDDEN'}
          onClick={() => setStatus('HIDDEN')}
        >
          <EyeOff className="h-4 w-4" aria-hidden="true" />
          Hide
        </Button>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          onClick={() => {
            setStatus('APPROVED');
            setIsFeatured(!isFeatured);
          }}
        >
          <Star className="h-4 w-4" aria-hidden="true" />
          {isFeatured ? 'Unfeature' : 'Feature on homepage'}
        </Button>
      </div>
    </form>
  );
}
