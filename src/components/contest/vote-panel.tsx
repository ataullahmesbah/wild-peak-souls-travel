// src/components/contest/vote-panel.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Heart, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EntryMedia, VideoBadge } from '@/components/contest/entry-media';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

/**
 * The voting round.
 *
 * One vote per person per contest, which the server enforces with a unique
 * index. This side keeps the promise visible rather than merely true: once a
 * vote is cast every card shows the outcome, the chosen one is marked, and the
 * buttons go away. Nobody is left clicking hopefully at a second card.
 *
 * Vote counts are hidden while voting is open. Showing a running tally turns a
 * vote into a bandwagon — people back whoever is already winning — and the
 * agency wants the pictures judged, not the scoreboard.
 */
export function ContestVotePanel({
  entries,
  votedEntryId,
  isSignedIn,
  contestSlug,
}: {
  entries: Array<{
    id: string;
    entrantName: string;
    location: string;
    description: string;
    media: {
      secureUrl: string | null;
      url: string | null;
      altText: string | null;
      type: string | null;
      width: number | null;
      height: number | null;
    } | null;
  }>;
  votedEntryId: string | null;
  isSignedIn: boolean;
  contestSlug: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [voted, setVoted] = React.useState<string | null>(votedEntryId);
  const [pending, setPending] = React.useState<string | null>(null);

  async function vote(entryId: string) {
    setPending(entryId);
    try {
      const response = await fetch('/api/contest/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        toast.error(body.error ?? 'Your vote could not be recorded. Please try again.');
        // 409 means the database already has a vote from this person — most
        // likely another tab. Reload so the page reflects reality.
        if (response.status === 409) router.refresh();
        return;
      }

      setVoted(entryId);
      toast.success('Thank you — your vote has been counted.');
      router.refresh();
    } catch {
      toast.error('Your vote could not be recorded. Check your connection.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      {!isSignedIn && (
        <div className="mb-6 rounded-field border border-border bg-muted/40 p-4 text-sm">
          <Link href={`/login?next=/contest/${contestSlug}`} className="font-medium text-primary hover:underline">
            Sign in
          </Link>{' '}
          to vote. One vote per person keeps it fair.
        </div>
      )}

      {voted && (
        <div className="mb-6 flex items-center gap-2 rounded-field border border-success/40 bg-success-soft p-4 text-sm text-success">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          Your vote is in. Thank you — results are announced at the end of the contest.
        </div>
      )}

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => {
          const isChoice = voted === entry.id;
          return (
            <li
              key={entry.id}
              className={cn(
                'overflow-hidden rounded-card border bg-card transition-shadow',
                isChoice ? 'border-primary shadow-lg ring-2 ring-primary/30' : 'border-border hover:shadow-lg',
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <EntryMedia media={entry.media} alt={`Entry by ${entry.entrantName}`} />
                {entry.media?.type === 'video' && <VideoBadge />}
                {isChoice && (
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    Your vote
                  </span>
                )}
              </div>

              <div className="p-5">
                <h3 className="font-display text-base font-semibold">{entry.entrantName}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{entry.location}</p>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{entry.description}</p>

                <div className="mt-4">
                  {voted ? (
                    <p className="text-xs text-muted-foreground">
                      {isChoice ? 'You voted for this entry.' : 'You have already voted.'}
                    </p>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant={isSignedIn ? 'primary' : 'outline'}
                      disabled={!isSignedIn || pending !== null}
                      loading={pending === entry.id}
                      onClick={() => (isSignedIn ? void vote(entry.id) : undefined)}
                    >
                      {pending === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Heart className="h-4 w-4" aria-hidden="true" />
                      )}
                      Vote for this
                    </Button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs text-muted-foreground">
        Vote counts stay hidden until the results are announced, so that the pictures are judged
        rather than the scoreboard.
      </p>
    </div>
  );
}
