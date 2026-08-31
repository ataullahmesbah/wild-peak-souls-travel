'use client';

import * as React from 'react';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * The travel assistant, bottom-right.
 *
 * It answers only from published pages — it has no view of accounts, bookings
 * or payments — and the panel says so, because a chat box on a site that takes
 * payments will be asked about payments, and people deserve to know what it
 * can see before they type.
 *
 * The launcher is a plain button rendered on the server, so it costs nothing
 * until someone opens it. Answers are plain text and rendered as text; nothing
 * the model returns is treated as markup.
 */
export function TravelAssistant({ greeting }: { greeting: string }) {
  const [open, setOpen] = React.useState(false);
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [draft, setDraft] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns, pending]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || pending) return;

    const next: Turn[] = [...turns, { role: 'user', content: message }];
    setTurns(next);
    setDraft('');
    setError(null);
    setPending(true);

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          // Only the visible transcript is sent back, trimmed to the recent
          // turns the server accepts.
          history: turns.slice(-10),
        }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        data?: { answer?: string };
      };

      if (!response.ok) {
        setError(body.error ?? 'The assistant is unavailable right now.');
        return;
      }

      setTurns([
        ...next,
        { role: 'assistant', content: body.data?.answer ?? 'Sorry, I have no answer for that.' },
      ]);
    } catch {
      setError('We could not reach the assistant. Check your connection and try again.');
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Close the travel assistant' : 'Ask the travel assistant'}
        className={cn(
          'fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground shadow-lift transition-transform',
          'hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Travel assistant"
          className="wps-animate-in fixed bottom-24 right-5 z-40 flex max-h-[min(32rem,calc(100dvh-8rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-card border border-border bg-card shadow-lift"
        >
          <header className="shrink-0 border-b border-border px-4 py-3">
            <p className="font-display text-sm font-semibold">Travel assistant</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Answers from published pages only. It cannot see accounts, bookings or
              payments.
            </p>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <Bubble role="assistant">{greeting}</Bubble>

            {turns.map((turn, index) => (
              <Bubble key={index} role={turn.role}>
                {turn.content}
              </Bubble>
            ))}

            {pending && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Looking that up
              </p>
            )}

            {error && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {error}
              </p>
            )}
          </div>

          <form onSubmit={send} className="shrink-0 border-t border-border p-3">
            <div className="flex gap-2">
              <label htmlFor="assistant-input" className="sr-only">
                Ask about a trip
              </label>
              <input
                id="assistant-input"
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1000}
                placeholder="Ask about a trip, a destination or a visa"
                className="h-10 min-w-0 flex-1 rounded-field border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25"
              />
              <button
                type="submit"
                disabled={pending || draft.trim().length === 0}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-field bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, children }: { role: 'user' | 'assistant'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'max-w-[85%] rounded-field px-3.5 py-2.5 text-sm leading-relaxed',
        role === 'user'
          ? 'ml-auto bg-primary text-primary-foreground'
          : 'bg-muted text-foreground',
      )}
    >
      {/* Rendered as text, never as markup: the model's output is not trusted HTML. */}
      <p className="whitespace-pre-wrap">{children}</p>
    </div>
  );
}
