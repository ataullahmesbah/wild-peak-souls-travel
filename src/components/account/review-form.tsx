'use client';

import * as React from 'react';
import { Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormMessage, Input, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';
import { cn } from '@/lib/utils';

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const [rating, setRating] = React.useState(0);
  const [hovered, setHovered] = React.useState(0);

  const { loading, error, success, fieldErrors, submit } = useApiForm('/api/reviews', {
    successMessage:
      'Thank you. Your review is with our moderation team and will appear shortly.',
  });

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />

      <fieldset>
        <legend className="text-sm font-medium">
          Your rating <span className="text-destructive">*</span>
        </legend>
        <div className="mt-2 flex gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHovered(value)}
              aria-label={`${value} star${value === 1 ? '' : 's'}`}
              aria-pressed={rating === value}
              className="rounded p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  'h-7 w-7 transition-colors',
                  value <= (hovered || rating)
                    ? 'fill-accent text-accent'
                    : 'text-border',
                )}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        {fieldErrors.rating?.[0] && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-destructive">
            {fieldErrors.rating[0]}
          </p>
        )}
      </fieldset>

      <Input
        label="Title"
        name="title"
        placeholder="Sum it up in a few words"
        error={fieldErrors.title}
      />
      <Textarea
        label="Your review"
        name="body"
        required
        rows={4}
        placeholder="What worked, what did not, and what should the next traveller know?"
        error={fieldErrors.body}
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <Button type="submit" loading={loading} disabled={rating === 0}>
        Submit review
      </Button>
    </form>
  );
}
