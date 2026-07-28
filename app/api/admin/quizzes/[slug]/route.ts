import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';

export async function PATCH(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { slug } = await context.params;
    const body = await req.json();

    const quiz = await prisma.quiz.findUnique({ where: { slug }, select: { id: true } });
    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    for (const k of ['title', 'description', 'category', 'bgImageUrl'] as const) {
      if (body[k] !== undefined) data[k] = body[k];
    }
    if (body.certConfig !== undefined) data.certConfig = body.certConfig || null;
    if (body.eventId !== undefined) data.eventId = body.eventId || null;
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (body.collectEmail !== undefined) data.collectEmail = Boolean(body.collectEmail);
    if (body.collectPhone !== undefined) data.collectPhone = Boolean(body.collectPhone);

    // Replace questions + options wholesale if provided.
    if (Array.isArray(body.questions)) {
      const qs = await prisma.question.findMany({ where: { quizId: quiz.id }, select: { id: true } });
      const ids = qs.map(q => q.id);
      if (ids.length) {
        await prisma.answerOption.deleteMany({ where: { questionId: { in: ids } } });
        await prisma.question.deleteMany({ where: { id: { in: ids } } });
      }
      data.questions = {
        create: body.questions.map((q: { text: string; options: { text: string; isCorrect: boolean }[] }, i: number) => ({
          text: q.text,
          order: i + 1,
          answerOptions: {
            create: q.options.map((opt, j) => ({ text: opt.text, isCorrect: opt.isCorrect, order: j + 1 })),
          },
        })),
      };
    }

    const updated = await prisma.quiz.update({ where: { slug }, data });
    return NextResponse.json({ ok: true, quiz: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { slug } = await context.params;
    
    await prisma.quiz.update({
      where: { slug },
      data: { isActive: false }
    });
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
