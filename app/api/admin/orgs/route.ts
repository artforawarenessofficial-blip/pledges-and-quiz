import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orgs);
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { name, slug, type, quizPosterUrl, contactEmail, posterLogoUrl, posterLogoPosition } = body;

  if (!name || !slug || !type || !contactEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        type,
        quizPosterUrl: quizPosterUrl || null,
        contactEmail,
        posterLogoUrl: posterLogoUrl || null,
        posterLogoPosition: posterLogoPosition || null,
      },
    });
    return NextResponse.json(org, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create organization';
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
