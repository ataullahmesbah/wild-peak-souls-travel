import type { Metadata } from 'next';
import * as Icons from 'lucide-react';

import { ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/states';
import { getServices } from '@/lib/data/public';
import { toLines } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Our Services',
  description:
    'Tour planning, group trips, custom itineraries, stays, visa assistance, transport and corporate travel support.',
  alternates: { canonical: '/services' },
};

/**
 * Service icons are stored as lucide icon names in the CMS so a content
 * manager can change them without a deploy. Unknown names fall back safely.
 */
function ServiceIcon({ name }: { name: string | null }) {
  const registry = Icons as unknown as Record<string, Icons.LucideIcon | undefined>;
  const Icon = (name && registry[name]) || Icons.Compass;
  return <Icon className="h-6 w-6" aria-hidden="true" />;
}

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <PageHeader
        eyebrow="What we do"
        title="Services"
        description="Wild Peak Souls runs the whole journey in-house — planning, ground operations, stays, paperwork and support. Everything here is managed from our dashboard, so this page reflects what we actually offer today."
        breadcrumbs={[{ label: 'Services' }]}
      />

      <Section>
        <Container>
          {services.length === 0 ? (
            <EmptyState
              title="Services are being published"
              description="Our team is finalising the service catalogue. Contact us and we will tell you what we can do."
              actionLabel="Contact us"
              actionHref="/contact"
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <Card key={service.id} interactive className="flex flex-col p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <ServiceIcon name={service.icon} />
                  </span>
                  <h2 className="mt-5 font-display text-lg font-semibold">{service.title}</h2>
                  {service.summary && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {service.summary}
                    </p>
                  )}
                  {service.description && (
                    <ul className="mt-4 flex-1 space-y-2">
                      {toLines(service.description)
                        .slice(0, 5)
                        .map((line, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                            <Icons.Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                            {line}
                          </li>
                        ))}
                    </ul>
                  )}
                </Card>
              ))}
            </div>
          )}

          <div className="mt-12 rounded-card border border-border bg-card p-8 text-center sm:p-12">
            <h2 className="font-display text-2xl font-semibold">
              Need something that is not on this list?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Corporate offsites, school trips, film and photography logistics, pilgrimage
              groups — if it involves moving people somewhere, ask us.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/custom-tour" size="lg">
                Request a custom plan
              </ButtonLink>
              <ButtonLink href="/contact" variant="outline" size="lg">
                Talk to the team
              </ButtonLink>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
