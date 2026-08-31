// src/components/blog/comment-section.tsx
'use client';

import * as React from 'react';
import { MessageSquare, Reply } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CommentForm } from '@/components/blog/comment-form';
import { relativeTime } from '@/lib/utils';
import type { PublicComment } from '@/lib/data/blog';

/**
 * Approved comments, plus the box to add one.
 *
 * Comment bodies are rendered as plain text through JSX — never markdown, and
 * never as HTML. A post author is a member of staff whose formatting is worth
 * supporting; a commenter is anybody on the internet, and the safest thing to
 * do with their text is show it exactly as typed.
 *
 * Threading is one level deep on purpose. Deeper nesting is unreadable on a
 * phone and invites the kind of argument nobody moderates.
 */

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
      aria-hidden="true"
    >
      {initials(name) || '?'}
    </span>
  );
}

function Body({ text }: { text: string }) {
  return (
    <div className="mt-1 space-y-2 text-sm leading-relaxed text-foreground/90">
      {text.split(/\n\n+/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap break-words">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

export function CommentSection({
  postId,
  comments,
  commentsOpen,
  viewerName,
  viewerEmail,
}: {
  postId: string;
  comments: PublicComment[];
  commentsOpen: boolean;
  viewerName?: string;
  viewerEmail?: string;
}) {
  const [replyTo, setReplyTo] = React.useState<string | null>(null);

  const total = comments.reduce((sum, comment) => sum + 1 + comment.replies.length, 0);

  return (
    <section aria-labelledby="comments-heading" className="mt-14 border-t border-border pt-10">
      <h2 id="comments-heading" className="flex items-center gap-2 font-display text-xl font-semibold">
        <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
        {total === 0 ? 'Comments' : `${total} comment${total === 1 ? '' : 's'}`}
      </h2>

      {comments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No comments yet. {commentsOpen ? 'Be the first to share your thoughts.' : ''}
        </p>
      ) : (
        <ul className="mt-6 space-y-6">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-card border border-border bg-card p-5">
              <div className="flex gap-3">
                <Avatar name={comment.authorName} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{comment.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={new Date(comment.createdAt).toISOString()}>
                      {relativeTime(comment.createdAt)}
                    </time>
                  </p>
                  <Body text={comment.body} />

                  {commentsOpen && (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                        aria-expanded={replyTo === comment.id}
                      >
                        <Reply className="h-4 w-4" aria-hidden="true" />
                        {replyTo === comment.id ? 'Cancel' : 'Reply'}
                      </Button>
                    </div>
                  )}

                  {replyTo === comment.id && (
                    <div className="mt-4 rounded-field bg-muted/50 p-4">
                      <CommentForm
                        postId={postId}
                        parentId={comment.id}
                        defaultName={viewerName}
                        defaultEmail={viewerEmail}
                        compact
                        onDone={() => setReplyTo(null)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {comment.replies.length > 0 && (
                <ul className="mt-5 space-y-5 border-l-2 border-border pl-5 sm:ml-12">
                  {comment.replies.map((reply) => (
                    <li key={reply.id} className="flex gap-3">
                      <Avatar name={reply.authorName} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{reply.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                          <time dateTime={new Date(reply.createdAt).toISOString()}>
                            {relativeTime(reply.createdAt)}
                          </time>
                        </p>
                        <Body text={reply.body} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {commentsOpen ? (
        <div className="mt-10 rounded-card border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold">Leave a comment</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Your email is never published.
          </p>
          <div className="mt-5">
            <CommentForm postId={postId} defaultName={viewerName} defaultEmail={viewerEmail} />
          </div>
        </div>
      ) : (
        <p className="mt-8 rounded-field border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Comments are closed on this post.
        </p>
      )}
    </section>
  );
}
