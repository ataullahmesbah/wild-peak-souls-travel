import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AlertTriangle, FileText, Info, Package, Printer } from 'lucide-react';

import { Breadcrumbs } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { VisaRequestForm } from '@/components/visa/visa-request-form';
import { getCurrentUser } from '@/lib/auth/session';
import { getVisaType } from '@/lib/data/public';
import { siteUrl } from '@/lib/env';
import { formatCurrency, toLines, toNumber, truncate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Params = Promise<{ country: string; type: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { country, type } = await params;
  const visaType = await getVisaType(country, type);
  if (!visaType) return { title: 'Visa information not found' };

  const heading = visaType.title ?? `${visaType.country.name} ${visaType.name}`;
  const description =
    visaType.seoDescription ?? truncate(visaType.summary ?? '', 155);

  return {
    title: visaType.seoTitle ?? heading,
    description,
    alternates: { canonical: `/visa/${country}/${type}` },
    openGraph: {
      title: visaType.seoTitle ?? heading,
      description,
      url: `${siteUrl()}/visa/${country}/${type}`,
    },
  };
}

export default async function VisaTypePage({ params }: { params: Params }) {
  const { country, type } = await params;
  const [visaType, user] = await Promise.all([
    getVisaType(country, type),
    getCurrentUser(),
  ]);

  if (!visaType) notFound();

  const heading = visaType.title ?? `${visaType.country.name} ${visaType.name}`;
  const fee = toNumber(visaType.serviceFee);

  const documentSections = [
    { title: 'Documents needed', body: visaType.generalDocuments, icon: FileText },
    { title: 'Documents for business owners', body: visaType.businessOwnerDocuments, icon: FileText },
    { title: 'Documents for students', body: visaType.studentDocuments, icon: FileText },
    { title: 'Documents for other applicants', body: visaType.otherApplicantDocuments, icon: FileText },
  ].filter((section) => Boolean(section.body));

  return (
    <>
      <section className="wps-aurora border-b border-border">
        <Container className="py-10 sm:py-14">
          <Breadcrumbs
            items={[
              { label: 'Visa', href: '/visa' },
              { label: visaType.country.name, href: '/visa' },
              { label: visaType.name },
            ]}
          />
          <div className="mt-4 flex items-start gap-4">
            {visaType.country.flagMedia?.secureUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={visaType.country.flagMedia.secureUrl}
                alt=""
                className="h-12 w-18 rounded object-cover"
                loading="lazy"
              />
            )}
            <div>
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">{heading}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {visaType.country.name} · {visaType.name}
                {fee > 0 && ` · Service fee from ${formatCurrency(fee)}`}
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Section className="py-10 sm:py-14">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:items-start">
            <div className="min-w-0 space-y-8">
              {visaType.summary && (
                <Block title="Summary" icon={Info}>
                  <div className="wps-prose text-sm sm:text-base">
                    {visaType.summary.split(/\n\n+/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </Block>
              )}

              {visaType.importantNotes && (
                <div className="rounded-card border border-warning/30 bg-warning-soft p-6">
                  <h2 className="flex items-center gap-2 font-display text-base font-semibold text-warning">
                    <AlertTriangle className="h-4.5 w-4.5" aria-hidden="true" />
                    Important notes
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {toLines(visaType.importantNotes).map((line, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-foreground/85">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {documentSections.map(({ title, body, icon }) => (
                <Block key={title} title={title} icon={icon}>
                  <ul className="space-y-2.5">
                    {toLines(body!).map((line, i) => (
                      <li
                        key={i}
                        className="flex gap-3 rounded-field border border-border p-3 text-sm"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[0.65rem] font-semibold text-primary">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{line}</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              ))}

              {(visaType.softCopyInstructions || visaType.hardCopyInstructions) && (
                <Block title="How to submit" icon={Package}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {visaType.softCopyInstructions && (
                      <div className="rounded-field border border-border p-5">
                        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                          Soft copies
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {visaType.softCopyInstructions}
                        </p>
                      </div>
                    )}
                    {visaType.hardCopyInstructions && (
                      <div className="rounded-field border border-border p-5">
                        <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                          <Printer className="h-4 w-4 text-primary" aria-hidden="true" />
                          Hard copies & passport
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {visaType.hardCopyInstructions}
                        </p>
                      </div>
                    )}
                  </div>
                </Block>
              )}

              {visaType.processingInfo && (
                <Block title="Processing" icon={Info}>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {visaType.processingInfo}
                  </p>
                </Block>
              )}

              {visaType.additionalInfo && (
                <Block title="Additional information" icon={Info}>
                  <ul className="space-y-2">
                    {toLines(visaType.additionalInfo).map((line, i) => (
                      <li key={i} className="flex gap-2.5 text-sm text-muted-foreground">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              <p className="rounded-field bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
                Visa requirements are set by the issuing embassy and can change without
                notice. This page reflects our latest verified guidance, but the embassy&rsquo;s
                decision is final and we cannot guarantee approval.
              </p>
            </div>

            <aside className="lg:sticky lg:top-24">
              <VisaRequestForm
                visaTypeId={visaType.id}
                countryName={visaType.country.name}
                visaTypeName={visaType.name}
                defaults={
                  user ? { name: user.name, email: user.email, phone: user.phone ?? '' } : null
                }
              />
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}

function Block({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
