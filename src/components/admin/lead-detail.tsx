import Link from 'next/link';
import { ArrowLeft, Mail, Phone } from 'lucide-react';

import { StatusBadge } from '@/components/ui/badge';
import { formatDateTime, relativeTime } from '@/lib/utils';

export interface DetailField {
  label: string;
  value: React.ReactNode;
  /** Long prose is given the full width and keeps its line breaks. */
  wide?: boolean;
}

/**
 * The read side of a lead detail page — who wrote in, how to reach them, and
 * everything they told us — laid out the same way for every lead type so a
 * coordinator moving between queues does not have to relearn the page.
 */
export function LeadDetail({
  backHref,
  backLabel,
  title,
  status,
  createdAt,
  contact,
  fields,
  message,
  aside,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  status: string;
  createdAt: Date;
  contact: { name: string; email: string; phone: string };
  fields: DetailField[];
  message?: string | null;
  aside: React.ReactNode;
}) {
  return (
    <>
      <Link
        href={backHref}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Received {formatDateTime(createdAt)} · {relativeTime(createdAt)}
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section className="wps-card p-5 sm:p-6">
            <h2 className="font-display text-base font-semibold">Contact</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Name</dt>
                <dd className="mt-0.5 font-medium">{contact.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    {contact.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="mt-0.5">
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                    {contact.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </section>

          {fields.length > 0 && (
            <section className="wps-card p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold">What they asked for</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.label} className={field.wide ? 'sm:col-span-2' : undefined}>
                    <dt className="text-xs text-muted-foreground">{field.label}</dt>
                    <dd className="mt-0.5 font-medium">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {message && (
            <section className="wps-card p-5 sm:p-6">
              <h2 className="font-display text-base font-semibold">Their message</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {message}
              </p>
            </section>
          )}
        </div>

        <aside className="wps-card h-fit p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 font-display text-base font-semibold">Work this lead</h2>
          {aside}
        </aside>
      </div>
    </>
  );
}
