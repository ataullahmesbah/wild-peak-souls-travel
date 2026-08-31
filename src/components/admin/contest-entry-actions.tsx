// src/components/admin/contest-entry-actions.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Award, Check, ListChecks, Star, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormMessage, Input } from '@/components/ui/field';
import { useToast } from '@/components/ui/toast';

/**
 * Everything staff do to one entry: approve, reject, shortlist, score, place.
 *
 * Moderation and scoring go to two different endpoints behind two different
 * permissions — screening what the public uploaded is a different job from
 * deciding who wins — so this component posts to whichever the pressed button
 * belongs to, and hides the scoring half from anyone without the permission.
 */
export function ContestEntryActions({
  entryId,
  status,
  judgeScore,
  rank,
  canJudge,
}: {
  entryId: string;
  status: string;
  judgeScore: number | null;
  rank: number | null;
  canJudge: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');
  const [score, setScore] = React.useState(judgeScore === null ? '' : String(judgeScore));

  async function post(url: string, payload: Record<string, unknown>, label: string) {
    setBusy(label);
    setError(null);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? 'That could not be saved.');
        return;
      }
      toast.success('Entry updated.');
      router.refresh();
    } catch {
      setError('That could not be saved. Check your connection.');
    } finally {
      setBusy(null);
    }
  }

  const moderate = (next: string) =>
    post(
      '/api/dashboard/contests/entries/moderate',
      { entryId, status: next, note: note.trim() || undefined },
      next,
    );

  return (
    <div className="space-y-3">
      <Input
        label="Moderation note"
        name={`note-${entryId}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional — shared with the entrant if you reject."
      />

      {error && <FormMessage tone="error">{error}</FormMessage>}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" loading={busy === 'APPROVED'} onClick={() => void moderate('APPROVED')}
          disabled={status === 'APPROVED'}>
          <Check className="h-4 w-4" aria-hidden="true" /> Approve
        </Button>
        <Button size="sm" variant="destructive" loading={busy === 'REJECTED'}
          onClick={() => void moderate('REJECTED')} disabled={status === 'REJECTED'}>
          <X className="h-4 w-4" aria-hidden="true" /> Reject
        </Button>
        <Button size="sm" variant="outline" loading={busy === 'SHORTLISTED'}
          onClick={() => void moderate('SHORTLISTED')} disabled={status === 'SHORTLISTED'}>
          <ListChecks className="h-4 w-4" aria-hidden="true" /> Shortlist
        </Button>
        <Button size="sm" variant="ghost" loading={busy === 'PENDING'}
          onClick={() => void moderate('PENDING')} disabled={status === 'PENDING'}>
          Back to pending
        </Button>
      </div>

      {canJudge && (
        <div className="rounded-field border border-border bg-muted/30 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Judges' mark (0–100)"
              name={`score-${entryId}`}
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(event) => setScore(event.target.value)}
              wrapperClassName="w-40"
            />
            <Button size="sm" variant="outline" loading={busy === 'score'}
              onClick={() =>
                void post(
                  '/api/dashboard/contests/entries/score',
                  { entryId, judgeScore: score === '' ? null : Number(score) },
                  'score',
                )
              }>
              <Star className="h-4 w-4" aria-hidden="true" /> Save mark
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Final placing:</span>
            {[1, 2, 3].map((place) => (
              <Button
                key={place}
                size="sm"
                variant={rank === place ? 'primary' : 'outline'}
                loading={busy === `rank-${place}`}
                onClick={() =>
                  void post(
                    '/api/dashboard/contests/entries/score',
                    { entryId, rank: place },
                    `rank-${place}`,
                  )
                }
              >
                <Award className="h-4 w-4" aria-hidden="true" />
                {place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'}
              </Button>
            ))}
            {rank !== null && (
              <Button size="sm" variant="ghost" loading={busy === 'rank-clear'}
                onClick={() =>
                  void post(
                    '/api/dashboard/contests/entries/score',
                    { entryId, rank: null },
                    'rank-clear',
                  )
                }>
                Clear placing
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Setting a placing takes it from whoever held it. Winners stay hidden from the public
            until the results date.
          </p>
        </div>
      )}
    </div>
  );
}
