import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';

export async function DELETE(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { slug } = await context.params;

    // Soft-delete: hide from public but keep attached pledges/quizzes intact.
    await prisma.event.update({
      where: { slug },
      data: { isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { slug } = await context.params;
    const body = await req.json();

    const updated = await prisma.event.update({
      where: { slug },
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description,
        bannerUrl: body.bannerUrl || null,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : null,
        location: body.location || null,
        isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
        isFeatured: typeof body.isFeatured === 'boolean' ? body.isFeatured : undefined,
        hostOrgId: body.hostOrgId || null,
      },
    });

    return NextResponse.json({ ok: true, event: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}
