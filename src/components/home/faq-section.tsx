import Link from 'next/link';

import { Container, Section, SectionHeading } from '@/components/ui/section';

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

/**
 * The most-asked questions, answered on the home page.
 *
 * Built on <details> rather than a JavaScript accordion so the answers are in
 * the markup: a search engine, an AI answering a question about the agency, and
 * a visitor with scripting off all get the full text. That is the whole point
 * of putting them here rather than only on /faq.
 */
export function HomeFaq({ items }: { items: FaqEntry[] }) {
  if (items.length === 0) return null;

  return (
    <Section className="bg-card/40">
      <Container>
        <SectionHeading
          eyebrow="Before you book"
          title="Questions we are asked most"
          description="Everything else is on the full FAQ, and our team answers by email within a day."
          href="/faq"
        />

        <ul className="mx-auto mt-8 max-w-3xl divide-y divide-border rounded-card border border-border bg-card">
          {items.map((item) => (
            <li key={item.id}>
              <details className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </details>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Still unsure?{' '}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            Ask us directly
          </Link>
          .
        </p>
      </Container>
    </Section>
  );
}
