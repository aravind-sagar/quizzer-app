import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { shareToken: token },
      select: {
        id: true,
        title: true,
        description: true,
        visibility: true,
        questions: true,
        allowedEmails: true,
        owner: { select: { name: true } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (quiz.visibility === "private") {
      return NextResponse.json({ error: "This quiz is private" }, { status: 403 });
    }

    if (quiz.visibility === "protected") {
      const session = await auth();
      if (!session?.user?.email) {
        return NextResponse.json({ error: "Sign in required to access this quiz" }, { status: 401 });
      }
      const allowed = Array.isArray(quiz.allowedEmails)
        ? (quiz.allowedEmails as string[])
        : [];
      if (!allowed.includes(session.user.email.toLowerCase())) {
        return NextResponse.json({ error: "You are not allowed to access this quiz" }, { status: 403 });
      }
    }

    return NextResponse.json({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions,
      ownerName: quiz.owner.name,
    });
  } catch (error) {
    console.error("Error fetching shared quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
