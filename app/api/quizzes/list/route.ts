import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizzes = await prisma.quiz.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        questions: true,
        visibility: true,
        shareToken: true,
        allowedEmails: true,
      },
    });

    const mapped = quizzes.map((q) => {
      const questions = Array.isArray(q.questions) ? (q.questions as unknown[]) : [];
      return {
        id: q.id,
        title: q.title,
        createdAt: q.createdAt,
        questionCount: questions.length,
        questions,
      };
    });

    return NextResponse.json({ quizzes: mapped });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
