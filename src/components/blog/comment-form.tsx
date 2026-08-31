// src/components/blog/comment-form.tsx
'use client';

import * as React from 'react';
import { MessageSquarePlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormMessage, Input, Textarea } from '@/components/ui/field';
import { useApiForm } from '@/hooks/use-api-form';

/**
 * The public comment box.
 *
 * Nothing it posts appears on the page. Every comment is created PENDING and
 * a moderator decides, which is why the success message says "waiting for
 * review" rather than "posted" — telling someone their comment is live when it
 * is not is how a comment system earns a reputation for eating comments.
 *
 * `website` is a honeypot: positioned off-screen and hidden from assistive
 * technology, so only a form-filling bot ever puts anything in it.
 */
export function CommentForm({
  postId,
  parentId,
  defaultName,
  defaultEmail,
  onDone,
  compact = false,
}: {
  postId: string;
  parentId?: string;
  defaultName?: string;
  defaultEmail?: string;
  onDone?: () => void;
  compact?: boolean;
}) {
  const [done, setDone] = React.useState(false);

  const { loading, error, success, fieldErrors, submit } = useApiForm('/api/blog/comments', {
    successMessage: 'Thank you — your comment is with our team for review.',
    resetForm: true,
    toast: false,
    onSuccess: () => {
      setDone(true);
      onDone?.();
    },
  });

  if (done) {
    return (
      <FormMessage tone="success">
        Thank you — your comment has been sent for review. It appears on this page once a
        moderator approves it.
      </FormMessage>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <input type="hidden" name="postId" value={postId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}

      {/* Honeypot — never shown, never announced, never filled by a person. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`website-${postId}-${parentId ?? 'root'}`}>Leave this empty</label>
        <input
          id={`website-${postId}-${parentId ?? 'root'}`}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
        <Input
          label="Your name"
          name="authorName"
          required
          maxLength={80}
          defaultValue={defaultName}
          autoComplete="name"
          error={fieldErrors.authorName}
        />
        <Input
          label="Email"
          name="authorEmail"
          type="email"
          required
          maxLength={254}
          defaultValue={defaultEmail}
          autoComplete="email"
          hint="Not published — we only use it to reply."
          error={fieldErrors.authorEmail}
        />
      </div>

      <Textarea
        label={parentId ? 'Your reply' : 'Your comment'}
        name="body"
        required
        rows={compact ? 3 : 5}
        maxLength={4000}
        placeholder="Share your experience, ask a question…"
        error={fieldErrors.body}
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}
      {success && <FormMessage tone="success">{success}</FormMessage>}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={loading} size={compact ? 'sm' : undefined}>
          <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
          {parentId ? 'Post reply' : 'Post comment'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Comments are reviewed before they appear.
        </p>
      </div>
    </form>
  );
}
