import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock, FileCheck2 } from 'lucide-react';

import { Breadcrumbs } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/states';
import { getVisaCountry } from '@/lib/data/public';
import { siteUrl } from '@/lib/env';
import { formatCurrency, toNumber, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Params = Promise<{ country: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { country } = await params;
  const record = await getVisaCountry(country);
  if (!record) return { title: 'Visa information not found' };

  const title = `${record.name} visa from Bangladesh`;
  const description =
    truncate(record.description ?? '', 155) ||
    `Requirements, documents, fees and processing times for every ${record.name} visa we handle.`;

  return {
    title,
    description,
    alternates: { canonical: `/visa/${country}` },
    openGraph: { title, description, url: `${siteUrl()}/visa/${country}` },
  };
}

/**
 * The landing page for one country's visas.
 *
 * Without it, /visa/thailand was a dead URL that both the dashboard's preview
 * link and any search result pointing at the country would land on.
 */
export default async function VisaCountryPage({ params }: { params: Params }) {
  const { country } = await params;
  const record = await getVisaCountry(country);
  if (!record) notFound();

  return (
    <>
      <section className="wps-aurora border-b border-border">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs
            items={[
              { label: 'Visa', href: '/visa' },
              { label: record.name },
            ]}
          />
          <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">
            {record.name} visa
          </h1>
          {record.description && (
            <p className="mt-3 max-w-2xl text-muted-foreground">{record.description}</p>
          )}
        </Container>
      </section>

      <Section>
        <Container>
          {record.visaTypes.length === 0 ? (
            <EmptyState
              title={`No ${record.name} visa types are published yet`}
              description="Tell us what you need and our visa team will come back to you with the requirements."
              actionLabel="Ask the visa team"
              actionHref="/contact"
            />
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold">
                {record.visaTypes.length} visa type
                {record.visaTypes.length === 1 ? '' : 's'} available
              </h2>

              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {record.visaTypes.map((type) => {
                  const fee = toNumber(type.serviceFee);
                  return (
                    <li key={type.id}>
                      <Link
                        href={`/visa/${record.slug}/${type.slug}`}
                        className="wps-card wps-card-interactive flex h-full flex-col p-5"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-field bg-primary-soft text-primary">
                          <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <h3 className="mt-4 font-display text-base font-semibold">
                          {type.title ?? type.name}
                        </h3>
                        {type.summary && (
                          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                            {truncate(type.summary, 140)}
                          </p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          {fee > 0 && (
                            <span className="font-medium">
                              {formatCurrency(fee)} service fee
                            </span>
                          )}
                          {type.processingInfo && (
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              {truncate(type.processingInfo, 40)}
                            </span>
                          )}
                        </div>

                        <span className="mt-4 flex items-center gap-1.5 text-sm font-medium text-primary">
                          Requirements and documents
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
