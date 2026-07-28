import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';

export async function DELETE(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { slug } = await context.params;
    
    // Soft-deleting by setting isActive to false. 
    // Hard deleting would break associated quiz attempts and pledges using foreign keys.
    await prisma.organization.update({
      where: { slug },
      data: { isActive: false }
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
    
    const updated = await prisma.organization.update({
      where: { slug },
      data: {
        name: body.name,
        slug: body.slug,
        type: body.type,
        quizPosterUrl: body.quizPosterUrl,
        contactEmail: body.contactEmail,
        posterLogoUrl: body.posterLogoUrl,
        posterLogoPosition: body.posterLogoPosition
      }
    });
    
    return NextResponse.json({ ok: true, org: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}
