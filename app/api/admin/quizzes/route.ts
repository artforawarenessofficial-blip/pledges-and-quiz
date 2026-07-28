import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!(await verifyAdminToken(req.cookies.get(ADMIN_COOKIE_NAME)?.value))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { slug, title, description, category, bgImageUrl, questions, eventId, certConfig, collectEmail, collectPhone } = body;

    if (!slug || !title || !description || !bgImageUrl || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newQuiz = await prisma.quiz.create({
      data: {
        slug,
        title,
        description,
        category,
        bgImageUrl,
        certConfig: certConfig || null,
        collectEmail: collectEmail === undefined ? true : Boolean(collectEmail),
        collectPhone: collectPhone === undefined ? true : Boolean(collectPhone),
        eventId: eventId || null,
        questions: {
          create: questions.map((q: any, i: number) => ({
            text: q.text,
            order: i + 1,
            answerOptions: {
              create: q.options.map((opt: any, j: number) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                order: j + 1
              }))
            }
          }))
        }
      }
    });

    return NextResponse.json({ ok: true, quiz: newQuiz });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create quiz. Ensure the slug is unique.' }, { status: 500 });
  }
}
