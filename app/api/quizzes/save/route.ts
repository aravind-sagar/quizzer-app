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
    const { title, questions, id } = body;

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    let quiz;

    if (id) {
        // Update existing
        // Check ownership first
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
                title,
                questions: questions as any,
                isPublic: false // default or keep existing? resetting for safe default
            }
        });
    } else {
        // Create new
        quiz = await prisma.quiz.create({
            data: {
                title,
                questions: questions as any,
                ownerId: session.user.id,
                isPublic: false,
            },
        });
    }

    return NextResponse.json({ quiz }, { status: 200 });
  } catch (error) {
    console.error("Error saving quiz:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
