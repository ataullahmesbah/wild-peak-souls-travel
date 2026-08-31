// src/app/(site)/guides/[slug]/page.tsx
import { permanentRedirect } from 'next/navigation';

/** Old article URLs keep their inbound links; see ../page.tsx. */
export default async function GuideDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<never> {
  const { slug } = await params;
  permanentRedirect(`/blog/${slug}`);
}
