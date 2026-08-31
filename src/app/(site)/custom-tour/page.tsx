import type { Metadata } from 'next';
import { ClipboardList, MessageSquare, Route, Wallet } from 'lucide-react';

import { CustomTourForm } from '@/components/forms/custom-tour-form';
import { PageHeader } from '@/components/ui/page-header';
import { Container, Section } from '@/components/ui/section';
import { getCurrentUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Design a Custom Tour',
  description:
    'Tell us your dates, budget, group size and travel style, and a Wild Peak Souls planner builds the trip around you.',
  alternates: { canonical: '/custom-tour' },
};

const STEPS = [
  {
    icon: ClipboardList,
    title: 'You tell us the shape of it',
    body: 'Dates, group size, budget, the kind of trip you want. Rough is fine.',
  },
  {
    icon: MessageSquare,
    title: 'A planner picks it up',
    body: 'A real person reads your request and calls or emails to fill in the gaps.',
  },
  {
    icon: Route,
    title: 'We send a real itinerary',
    body: 'Day by day, with stays, transport, activities and an itemised quote.',
  },
  {
    icon: Wallet,
    title: 'You confirm and pay',
    body: 'Adjust anything you want first. Nothing is charged until you agree the plan.',
  },
];

export default async function CustomTourPage() {
  const user = await getCurrentUser();

  return (
    <>
      <PageHeader
        eyebrow="Custom tours"
        title="Design a trip around you"
        description="Our published packages are a starting point, not a limit. Tell us what you actually want and we will build it — for two people or two hundred."
        breadcrumbs={[{ label: 'Custom Tour' }]}
      />

      <Section>
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <div key={title} className="wps-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-2xl font-semibold text-border">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-sm font-semibold">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-12 max-w-3xl">
            <CustomTourForm
              defaults={
                user ? { name: user.name, email: user.email, phone: user.phone ?? '' } : null
              }
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
