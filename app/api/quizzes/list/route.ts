import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    console.log("List API Session:", JSON.stringify(session, null, 2));

    if (!session?.user?.id) {
      console.log("List API: Unauthorized - missing user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    
    // Since questions is JSON, we can't easily count it with Prisma select _count for a JSON array.
    // We'll simplisticly fetch needed fields.
    // Optimization: Store questionCount in DB trigger or app logic. 
    // For MVP, fetching all and mapping is fine for small scale, but fetching "questions" blob for list is heavy.
    // Let's refactor to just fetch everything for now as MVP.
    
    const quizzesWithCount = await prisma.quiz.findMany({
       where: { ownerId: session.user.id },
       orderBy: { createdAt: 'desc' }
    });

    const mapped = quizzesWithCount.map(q => {
        const questions = q.questions as any as any[]; // Cast Json to array
        return {
            id: q.id,
            title: q.title,
            createdAt: q.createdAt,
            questionCount: Array.isArray(questions) ? questions.length : 0,
            questions: questions
        };
    });

    return NextResponse.json({ quizzes: mapped });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
