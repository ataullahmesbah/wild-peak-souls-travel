import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileCheck2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/states';
import { VisaSearch } from '@/components/visa/visa-search';
import { getVisaCountries } from '@/lib/data/public';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Visa Assistance',
  description:
    'Country-by-country visa requirements, document checklists and assisted filing by the Wild Peak Souls visa team.',
  alternates: { canonical: '/visa' },
};

export default async function VisaPage() {
  const countries = await getVisaCountries();

  return (
    <>
      <PageHeader
        eyebrow="Visa services"
        title="Visa assistance"
        description="Pick a country and visa type to see exactly which documents are needed — including the separate checklists for business owners, students and other applicants. Then request assistance and a specialist takes it from there."
        breadcrumbs={[{ label: 'Visa' }]}
      >
        <VisaSearch
          countries={countries.map((c) => ({
            slug: c.slug,
            name: c.name,
            types: c.visaTypes.map((t) => ({ slug: t.slug, name: t.name })),
          }))}
        />
      </PageHeader>

      <Section>
        <Container>
          {countries.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="Visa catalogue is being prepared"
              description="Our team is publishing country requirements. Contact us in the meantime and we will advise directly."
              actionLabel="Contact the visa team"
              actionHref="/contact"
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {countries.map((country) => (
                <Card key={country.id} interactive className="flex flex-col p-6">
                  <div className="flex items-center gap-3">
                    {country.flagMedia?.secureUrl ? (
                      // Flag images come from Cloudinary or an arbitrary CDN the
                      // dashboard configures, so a plain img keeps this simple.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={country.flagMedia.secureUrl}
                        alt=""
                        className="h-8 w-12 rounded object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-8 w-12 items-center justify-center rounded bg-primary-soft text-xs font-semibold text-primary">
                        {country.code ?? country.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                    <h2 className="font-display text-base font-semibold">{country.name}</h2>
                  </div>

                  {country.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {country.description}
                    </p>
                  )}

                  <ul className="mt-4 flex-1 space-y-1.5">
                    {country.visaTypes.map((type) => (
                      <li key={type.id}>
                        <Link
                          href={`/visa/${country.slug}/${type.slug}`}
                          className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted"
                        >
                          {type.name}
                          <ArrowRight
                            className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                            aria-hidden="true"
                          />
                        </Link>
                      </li>
                    ))}
                    {country.visaTypes.length === 0 && (
                      <li className="px-2.5 text-sm text-muted-foreground">
                        Requirements coming soon
                      </li>
                    )}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
