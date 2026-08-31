// src/lib/assistant/answer.ts
import 'server-only';

import { ASSISTANT_TOOL_MAP } from '@/lib/assistant/tools';

/**
 * Answers a visitor's question directly from the published catalogue, with no
 * language model involved.
 *
 * This is what the assistant runs when no ANTHROPIC_API_KEY is configured, and
 * it is a deliberate design rather than a stub. The tools already hold the real
 * answer to most of what a travel site is asked — what trips exist, what they
 * cost, what a visa needs, how to reach a person — so refusing to answer at all
 * because there is no model available would be throwing away data we already
 * have. With a key configured, the model takes over and can handle the
 * open-ended questions this cannot.
 *
 * It never invents anything. Every fact and every link here comes from a
 * database row, which is also why it is safe to run for anonymous visitors.
 */

interface Answer {
  answer: string;
  /** True when nothing matched and the reply is a signpost rather than a result. */
  fallback: boolean;
}

const money = (value: number) =>
  `BDT ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/** Words that carry no signal when working out what someone is asking about. */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'about', 'best', 'can', 'cost', 'costs', 'do',
  'does', 'for', 'from', 'get', 'go', 'going', 'have', 'how', 'i', 'in', 'is',
  'it', 'me', 'much', 'need', 'of', 'on', 'or', 'price', 'show', 'take', 'tell',
  'that', 'the', 'there', 'this', 'to', 'trip', 'trips', 'want', 'was', 'we',
  'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your',
  'please', 'hi', 'hello', 'hey', 'thanks', 'thank',
]);

function keywords(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

async function run<T>(tool: string, input: Record<string, unknown>): Promise<T | null> {
  const handler = ASSISTANT_TOOL_MAP.get(tool);
  if (!handler) return null;
  try {
    return (await handler.handler(input)) as T;
  } catch {
    return null;
  }
}

export async function answerFromCatalogue(question: string): Promise<Answer> {
  const text = question.toLowerCase();
  const words = keywords(question);

  // --- Reaching a person -------------------------------------------------
  if (/\b(contact|phone|call|email|whatsapp|talk|speak|human|agent|office|address|hours?)\b/.test(text)) {
    return { answer: await contactAnswer(), fallback: false };
  }

  // --- Visa ---------------------------------------------------------------
  if (/\bvisa\b/.test(text)) {
    const country = words.find((word) => word !== 'visa' && word !== 'visas');
    if (country) {
      const visa = await run<VisaResult>('get_visa_information', { country });
      if (visa?.found) return { answer: visaAnswer(visa), fallback: false };
    }
    return {
      answer:
        'We handle visa applications for several countries. Tell me which country and I will pull up the documents, fees and processing time — or see every country we cover at /visa.',
      fallback: false,
    };
  }

  // --- Where do you go ----------------------------------------------------
  if (/\b(destination|destinations|places?|where do you|locations?)\b/.test(text) && words.length <= 4) {
    const result = await run<{ destinations: DestinationRow[] }>('list_destinations', {});
    if (result && result.destinations.length > 0) {
      return { answer: destinationsAnswer(result.destinations), fallback: false };
    }
  }

  // --- Booking, payment and policy questions ------------------------------
  const policyQuestion =
    /\b(book|booking|pay|payment|refund|cancel|cancellation|deposit|confirm|invoice|policy|terms)\b/.test(
      text,
    );

  if (policyQuestion) {
    // Every keyword is tried, not just the first. "Can I cancel my booking?"
    // has no FAQ entry under "cancel" but plenty under "booking", and giving
    // up after one miss threw away the answer we had.
    for (const word of [...words, 'booking']) {
      const faq = await run<{ answers: FaqRow[] }>('search_help_articles', {
        query: word,
      });
      if (faq && faq.answers.length > 0) {
        return { answer: faqAnswer(faq.answers), fallback: false };
      }
    }

    // Still nothing. The written policies cover this even when the FAQ does
    // not, so point at them rather than reporting a dead end.
    if (/\b(refund|cancel|cancellation)\b/.test(text)) {
      return {
        answer: [
          'Our cancellation and refund terms are set out in full here:',
          '• Cancellation policy — /policies/cancellation\n• Refund policy — /policies/refund',
          'If it is about a booking you have already made, /contact reaches the team and they can look it up.',
        ].join('\n\n'),
        fallback: false,
      };
    }
  }

  // --- Anything that names a place or an activity -------------------------
  for (const word of words) {
    const found = await run<{ results: TripRow[] }>('search_trips', { query: word });
    if (found && found.results.length > 0) {
      return { answer: tripsAnswer(found.results, word), fallback: false };
    }
  }

  // --- Nothing matched ----------------------------------------------------
  const destinations = await run<{ destinations: DestinationRow[] }>('list_destinations', {});
  const names = (destinations?.destinations ?? []).slice(0, 6).map((d) => d.name);

  return {
    answer: [
      'I could not find anything on the site matching that.',
      names.length > 0
        ? `I can help with trips to ${names.join(', ')}, visa requirements, flight and train timings, or booking questions.`
        : 'I can help with trips, visa requirements, flight and train timings, or booking questions.',
      'If you would rather speak to a person, the contact form at /contact reaches the team directly.',
    ].join('\n\n'),
    fallback: true,
  };
}

// --- Formatting ------------------------------------------------------------

interface TripRow {
  kind: string;
  title: string;
  url: string;
  summary?: string | null;
  destination?: string | null;
  departs?: string;
  pricePerPersonBDT?: number;
  fromPriceBDT?: number;
  priceBDT?: number;
  seatsLeft?: number;
  duration?: string | null;
}

function tripsAnswer(results: TripRow[], term: string): string {
  const lines = results.slice(0, 6).map((row) => {
    const price =
      row.pricePerPersonBDT ?? row.fromPriceBDT ?? row.priceBDT ?? null;

    const bits: string[] = [];
    if (row.destination) bits.push(row.destination);
    if (row.departs) bits.push(`departs ${row.departs}`);
    if (row.duration) bits.push(row.duration);
    if (price !== null && price > 0) bits.push(`from ${money(price)}`);
    if (typeof row.seatsLeft === 'number') {
      bits.push(row.seatsLeft > 0 ? `${row.seatsLeft} seats left` : 'sold out');
    }

    return `• ${row.title}${bits.length > 0 ? ` — ${bits.join(', ')}` : ''}\n  ${row.url}`;
  });

  const more =
    results.length > 6 ? `\n\nThere are ${results.length - 6} more.` : '';

  return [
    `Here is what we run matching "${term}":`,
    lines.join('\n\n'),
    'Prices are per person and indicative until a booking is confirmed.' + more,
  ].join('\n\n');
}

interface DestinationRow {
  name: string;
  country: string;
  url: string;
  shortDescription?: string | null;
  bestTimeToVisit?: string | null;
}

function destinationsAnswer(rows: DestinationRow[]): string {
  const lines = rows.slice(0, 10).map((row) => {
    const summary = row.shortDescription ? ` — ${row.shortDescription}` : '';
    return `• ${row.name}, ${row.country}${summary}\n  ${row.url}`;
  });
  return [
    `We run trips to ${rows.length} destination${rows.length === 1 ? '' : 's'}:`,
    lines.join('\n\n'),
    'Ask me about any one of them and I will show you the trips going there.',
  ].join('\n\n');
}

interface VisaResult {
  found: boolean;
  country?: string;
  url?: string;
  description?: string | null;
  visaTypes?: Array<{
    name: string;
    url: string;
    summary?: string | null;
    processingInfo?: string | null;
    serviceFeeBDT?: number | null;
  }>;
}

function visaAnswer(visa: VisaResult): string {
  const types = visa.visaTypes ?? [];
  if (types.length === 0) {
    return `We do handle ${visa.country} visas. The details are at ${visa.url} — or send an enquiry through /contact and our visa team will come back to you.`;
  }

  const lines = types.map((type) => {
    const bits: string[] = [];
    if (type.serviceFeeBDT && type.serviceFeeBDT > 0) {
      bits.push(`${money(type.serviceFeeBDT)} service fee`);
    }
    if (type.processingInfo) bits.push(type.processingInfo);
    return `• ${type.name}${bits.length > 0 ? ` — ${bits.join(' · ')}` : ''}\n  ${type.url}`;
  });

  return [
    `For ${visa.country} we handle ${types.length} visa type${types.length === 1 ? '' : 's'}:`,
    lines.join('\n\n'),
    'Each page lists the documents you need. The service fee is ours — the embassy fee is separate.',
  ].join('\n\n');
}

interface FaqRow {
  question: string;
  answer: string;
}

function faqAnswer(rows: FaqRow[]): string {
  const best = rows.slice(0, 2);
  const body = best.map((row) => `${row.question}\n${row.answer}`).join('\n\n');
  return [body, 'More answers are on /faq, and /contact reaches a person.'].join('\n\n');
}

interface ContactResult {
  brand: string;
  email?: string;
  phone?: string;
  openingHours?: string;
  contactPage: string;
  supportPage: string;
  customTourPage: string;
}

async function contactAnswer(): Promise<string> {
  const contact = await run<ContactResult>('get_contact_details', {});
  if (!contact) {
    return 'You can reach the team through the contact form at /contact.';
  }

  const lines = [`You can reach ${contact.brand} at:`];
  if (contact.phone) lines.push(`• Phone: ${contact.phone}`);
  if (contact.email) lines.push(`• Email: ${contact.email}`);
  if (contact.openingHours) lines.push(`• Hours: ${contact.openingHours}`);
  lines.push(`• Contact form: ${contact.contactPage}`);
  lines.push(`• Help and support: ${contact.supportPage}`);
  return lines.join('\n');
}
