import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { startDate: 'asc' },
    include: {
      hostOrg: { select: { name: true, slug: true } },
      _count: { select: { pledges: true, quizzes: true } },
    },
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { title, slug, description, startDate } = body;

  if (!title || !slug || !description || !startDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const event = await prisma.event.create({
      data: {
        title,
        slug,
        description,
        bannerUrl: body.bannerUrl || null,
        startDate: new Date(startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        location: body.location || null,
        isFeatured: Boolean(body.isFeatured),
        hostOrgId: body.hostOrgId || null,
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create event';
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
