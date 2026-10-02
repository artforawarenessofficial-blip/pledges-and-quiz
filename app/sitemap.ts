import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://communitreepledges.netlify.app';

  let pledges: { slug: string; createdAt: Date }[] = [];
  let quizzes: { slug: string; createdAt: Date }[] = [];
  let events: { slug: string; createdAt: Date }[] = [];

  try {
    [pledges, quizzes, events] = await Promise.all([
      prisma.pledge.findMany({ where: { isActive: true }, select: { slug: true, createdAt: true } }),
      prisma.quiz.findMany({ where: { isActive: true }, select: { slug: true, createdAt: true } }),
      prisma.event.findMany({ where: { isActive: true }, select: { slug: true, createdAt: true } }),
    ]);
  } catch {
    // DB not available at build time — dynamic routes will be omitted from sitemap
  }

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'monthly', priority: 1 },
    { url: `${baseUrl}/pledges`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/quiz`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/events`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/calendar`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/takedown`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${baseUrl}/organizations`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...pledges.map(p => ({
      url: `${baseUrl}/pledges/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...quizzes.map(q => ({
      url: `${baseUrl}/quiz/${q.slug}`,
      lastModified: q.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...events.map(e => ({
      url: `${baseUrl}/events/${e.slug}`,
      lastModified: e.createdAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
