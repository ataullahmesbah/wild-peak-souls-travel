/**
 * Turns an audit row into a sentence a person can read.
 *
 * The raw action string is a machine key — `destination.created`,
 * `leads.custom-tour.status.updated` — which is exactly what you want for
 * filtering and exactly what you do not want when you are trying to work out
 * what happened last Tuesday. The code stays visible as secondary detail; this
 * is what gets read first.
 *
 * Unknown actions are handled rather than hidden: a new action added anywhere
 * in the product still produces a readable line, just a more generic one.
 */

const VERBS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  archived: 'archived',
  published: 'published',
  restored: 'restored',
  cancelled: 'cancelled',
  verified: 'verified',
  rejected: 'rejected',
  refunded: 'refunded',
  suspended: 'suspended',
  approved: 'approved',
  assigned: 'assigned',
  granted: 'granted',
  revoked: 'revoked',
  failed: 'failed',
  succeeded: 'succeeded',
};

const SUBJECTS: Record<string, string> = {
  destination: 'a destination',
  event: 'an event',
  tour: 'a tour',
  activity: 'an activity',
  accommodation: 'a property',
  stay: 'a property',
  roomtype: 'a room type',
  visacountry: 'a visa country',
  visatype: 'a visa type',
  notice: 'a notice',
  advertisement: 'an advertisement',
  heroslide: 'a home page slide',
  flightroute: 'a flight route',
  trainschedule: 'a train service',
  booking: 'a booking',
  payment: 'a payment',
  review: 'a review',
  user: 'a user',
  users: 'a user',
  session: 'a session',
  settings: 'a setting',
  media: 'a media file',
  leads: 'a lead',
  auth: 'authentication',
  support: 'a support ticket',
};

function humanise(token: string): string {
  const spaced = token.replace(/[-_]/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export interface AuditDescription {
  /** "Created a destination" — the headline. */
  summary: string;
  /** "Saint Martin's Island", "sold out → published" — the specifics, if any. */
  detail: string | null;
}

export function describeAudit(
  action: string,
  metadata: string | null,
): AuditDescription {
  const parts = action.split('.');
  const verbToken = parts[parts.length - 1] ?? '';
  const verb = VERBS[verbToken] ?? humanise(verbToken).toLowerCase();
  const subjectToken = (parts[0] ?? '').toLowerCase();
  const subject = SUBJECTS[subjectToken] ?? `a ${subjectToken.replace(/[-_]/g, ' ')}`;

  // `leads.custom-tour.status.updated` — the middle names the specific thing.
  const qualifier = parts.length > 2 ? parts.slice(1, -1).join(' ').replace(/[-_]/g, ' ') : '';

  const summary = qualifier
    ? `${humanise(verb)} the ${qualifier} of ${subject}`
    : `${humanise(verb)} ${subject}`;

  return { summary, detail: describeMetadata(metadata) };
}

/**
 * Metadata is stored as a JSON string. Rendering it raw shows people
 * `{"from":"NEW","to":"CONTACTED"}`; this shows them `NEW → CONTACTED`.
 */
function describeMetadata(metadata: string | null): string | null {
  if (!metadata) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(metadata);
  } catch {
    // Not JSON after all — show whatever was recorded rather than nothing.
    return metadata;
  }
  if (typeof parsed !== 'object' || parsed === null) return String(parsed);

  const record = parsed as Record<string, unknown>;
  const bits: string[] = [];

  if (typeof record.name === 'string' && record.name) bits.push(record.name);
  if (typeof record.title === 'string' && record.title) bits.push(record.title);

  if (record.from !== undefined || record.to !== undefined) {
    bits.push(`${format(record.from)} → ${format(record.to)}`);
  }

  if (Array.isArray(record.changed) && record.changed.length > 0) {
    bits.push(`changed ${record.changed.map(String).join(', ')}`);
  }

  if (typeof record.reason === 'string' && record.reason) bits.push(record.reason);

  for (const [key, value] of Object.entries(record)) {
    if (['name', 'title', 'from', 'to', 'changed', 'reason'].includes(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'object') continue;
    bits.push(`${humanise(key).toLowerCase()}: ${format(value)}`);
  }

  return bits.length > 0 ? bits.join(' · ') : null;
}

function format(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value).replace(/_/g, ' ');
}
