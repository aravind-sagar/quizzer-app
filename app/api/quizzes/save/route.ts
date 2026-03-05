import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, questions, id } = body;

    if (!title || typeof title !== "string" || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    if (title.trim().length === 0 || title.length > 200) {
      return NextResponse.json({ error: "Title must be between 1 and 200 characters" }, { status: 400 });
    }

    if (questions.length > 500) {
      return NextResponse.json({ error: "Quiz cannot have more than 500 questions" }, { status: 400 });
    }

    let quiz;

    if (id) {
      const existing = await prisma.quiz.findUnique({ where: { id } });
      if (!existing) {
        return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
      }
      if (existing.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      quiz = await prisma.quiz.update({
        where: { id },
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          questions: questions as any,
        },
      });
    } else {
      quiz = await prisma.quiz.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          questions: questions as any,
          ownerId: session.user.id,
          visibility: "private",
        },
      });
    }

    return NextResponse.json({ quiz }, { status: 200 });
  } catch (error) {
    console.error("Error saving quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
