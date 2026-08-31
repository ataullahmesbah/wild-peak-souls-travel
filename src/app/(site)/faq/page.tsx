import type { Metadata } from 'next';

import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/states';
import { getFaqItems } from '@/lib/data/public';
import { JsonLd } from '@/components/seo/json-ld';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers about bookings, payments, cancellations, visas and travelling with Wild Peak Souls.',
  alternates: { canonical: '/faq' },
};

export default async function FaqPage() {
  const items = await getFaqItems();

  type FaqItem = (typeof items)[number];
  const grouped = items.reduce<Record<string, FaqItem[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <>
      {items.length > 0 && (
        <JsonLd data={jsonLd} />
      )}

      <PageHeader
        eyebrow="Support"
        title="Frequently asked questions"
        description="The things people ask us most. If your question is not here, our team answers within one business day."
        breadcrumbs={[{ label: 'FAQ' }]}
      />

      <Section>
        <Container className="max-w-3xl">
          {items.length === 0 ? (
            <EmptyState
              title="FAQ is being written"
              description="In the meantime, ask us directly — we answer quickly."
              actionLabel="Contact us"
              actionHref="/contact"
            />
          ) : (
            <div className="space-y-10">
              {Object.entries(grouped).map(([category, questions]) => (
                <section key={category}>
                  <h2 className="font-display text-xl font-semibold capitalize">
                    {category.toLowerCase().replace(/_/g, ' ')}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {questions.map((item) => (
                      <details
                        key={item.id}
                        className="group rounded-card border border-border bg-card"
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-medium">
                          {item.question}
                          <span
                            className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                            aria-hidden="true"
                          >
                            ▾
                          </span>
                        </summary>
                        <div className="border-t border-border p-5 text-sm leading-relaxed text-muted-foreground">
                          {item.answer}
                        </div>
                      </details>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div className="mt-12 rounded-card border border-border bg-card p-8 text-center">
            <h2 className="font-display text-lg font-semibold">Still stuck?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Open a tracked support token or message the team directly.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/account/support">Open a support token</ButtonLink>
              <ButtonLink href="/contact" variant="outline">
                Contact us
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
