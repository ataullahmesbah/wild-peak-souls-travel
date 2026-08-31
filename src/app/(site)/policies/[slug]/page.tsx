import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { getLegalPage } from '@/lib/data/public';
import { formatDate, toLines, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const KNOWN_SLUGS = [
  'terms',
  'privacy',
  'refund',
  'cancellation',
  'booking',
  'visa',
] as const;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getLegalPage(slug);
  if (!page) return { title: 'Policy not found' };

  return {
    title: page.title,
    description: truncate(page.body.replace(/\n+/g, ' '), 155),
    alternates: { canonical: `/policies/${slug}` },
  };
}

export default async function PolicyPage({ params }: { params: Params }) {
  const { slug } = await params;

  // Reject unknown slugs before hitting the database so this route cannot be
  // used to probe for arbitrary content rows.
  if (!KNOWN_SLUGS.includes(slug as (typeof KNOWN_SLUGS)[number])) notFound();

  const page = await getLegalPage(slug);
  if (!page) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title={page.title}
        description={`Last updated ${formatDate(page.updatedAt)}`}
        breadcrumbs={[{ label: page.title }]}
      />

      <Section>
        <Container className="max-w-3xl">
          <article className="wps-prose text-sm sm:text-base">
            {page.body.split(/\n\n+/).map((block, i) => {
              if (block.startsWith('## ')) {
                return <h2 key={i}>{block.replace(/^##\s*/, '')}</h2>;
              }
              if (/^[-*]\s/m.test(block)) {
                return (
                  <ul key={i}>
                    {toLines(block).map((line, j) => (
                      <li key={j}>{line}</li>
                    ))}
                  </ul>
                );
              }
              return <p key={i}>{block}</p>;
            })}
          </article>
        </Container>
      </Section>
    </>
  );
}
