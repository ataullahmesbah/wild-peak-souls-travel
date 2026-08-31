// src/lib/contest/phase.ts

/**
 * What phase a contest is in, worked out from its dates.
 *
 * Deliberately computed rather than stored. A stored phase needs something to
 * advance it — a cron job, a deploy, someone remembering — and is wrong for
 * exactly as long as that thing is late. A contest whose deadline passed at
 * midnight must stop taking entries at midnight, not when a job next runs.
 *
 * Pure and dependency-free so the same function decides what the public page
 * shows, what the API accepts, and what the dashboard reports. Three places
 * agreeing matters more here than anywhere else on the site: the gap between
 * "the page still shows the form" and "the API still accepts a submission" is
 * where a contest gets disputed.
 */

export type ContestPhase =
  | 'UPCOMING'
  | 'ACCEPTING'
  | 'REVIEW'
  | 'VOTING'
  | 'JUDGING'
  | 'COMPLETED';

export interface ContestTimeline {
  status: string;
  startAt: Date;
  entryDeadline: Date;
  votingStartAt: Date | null;
  votingEndAt: Date | null;
  resultsAt: Date | null;
}

export function contestPhase(contest: ContestTimeline, now: Date = new Date()): ContestPhase {
  const at = now.getTime();

  if (contest.resultsAt && at >= contest.resultsAt.getTime()) return 'COMPLETED';

  if (
    contest.votingStartAt &&
    contest.votingEndAt &&
    at >= contest.votingStartAt.getTime() &&
    at < contest.votingEndAt.getTime()
  ) {
    return 'VOTING';
  }

  if (at < contest.startAt.getTime()) return 'UPCOMING';
  if (at < contest.entryDeadline.getTime()) return 'ACCEPTING';

  // Past the deadline. Either waiting for voting to open, or voting is over
  // and the judges have it.
  if (contest.votingStartAt && at < contest.votingStartAt.getTime()) return 'REVIEW';
  if (contest.votingEndAt && at >= contest.votingEndAt.getTime()) return 'JUDGING';
  return 'REVIEW';
}

/** Only ever true between the opening date and the deadline. */
export function isAcceptingEntries(contest: ContestTimeline, now: Date = new Date()): boolean {
  return contest.status === 'PUBLISHED' && contestPhase(contest, now) === 'ACCEPTING';
}

export function isVotingOpen(contest: ContestTimeline, now: Date = new Date()): boolean {
  return contest.status === 'PUBLISHED' && contestPhase(contest, now) === 'VOTING';
}

export function areResultsPublic(contest: ContestTimeline, now: Date = new Date()): boolean {
  return contest.status === 'PUBLISHED' && contestPhase(contest, now) === 'COMPLETED';
}

const PHASE_LABEL: Record<ContestPhase, string> = {
  UPCOMING: 'Opening soon',
  ACCEPTING: 'Entries open',
  REVIEW: 'Entries closed — under review',
  VOTING: 'Public voting open',
  JUDGING: 'With the judges',
  COMPLETED: 'Results announced',
};

export function phaseLabel(phase: ContestPhase): string {
  return PHASE_LABEL[phase];
}

/** The next dated thing that will happen, for a countdown. */
export function nextMilestone(
  contest: ContestTimeline,
  now: Date = new Date(),
): { label: string; at: Date } | null {
  switch (contestPhase(contest, now)) {
    case 'UPCOMING':
      return { label: 'Entries open', at: contest.startAt };
    case 'ACCEPTING':
      return { label: 'Entry deadline', at: contest.entryDeadline };
    case 'REVIEW':
      return contest.votingStartAt ? { label: 'Voting opens', at: contest.votingStartAt } : null;
    case 'VOTING':
      return contest.votingEndAt ? { label: 'Voting closes', at: contest.votingEndAt } : null;
    case 'JUDGING':
      return contest.resultsAt ? { label: 'Results', at: contest.resultsAt } : null;
    case 'COMPLETED':
      return null;
  }
}

/**
 * The combined score staff rank by: the judges' mark and the public vote,
 * mixed in the proportion the contest sets.
 *
 * `voteShare` is measured against the most-voted entry rather than the total,
 * so a shortlist where one entry runs away with it does not flatten everyone
 * else to nearly zero. Both halves are then on the same 0-100 scale.
 *
 * This produces a ranking; it does not pick the winner. Staff set the final
 * placings themselves, which is what the agency asked for — the judges decide,
 * with the public vote weighing in.
 */
export function combinedScore(options: {
  judgeScore: number | null;
  voteCount: number;
  topVoteCount: number;
  publicVoteWeight: number;
}): number {
  const weight = Math.min(100, Math.max(0, options.publicVoteWeight)) / 100;
  const judge = options.judgeScore ?? 0;
  const voteShare =
    options.topVoteCount > 0 ? (options.voteCount / options.topVoteCount) * 100 : 0;
  return Math.round((judge * (1 - weight) + voteShare * weight) * 10) / 10;
}
