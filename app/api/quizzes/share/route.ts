import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST: update visibility (and generate shareToken if needed)
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, visibility } = body;

    if (!id || !["private", "public", "protected"].includes(visibility)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (existing.ownerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Generate a shareToken if going public/protected and one doesn't exist yet
    const shareToken = (visibility !== "private")
      ? (existing.shareToken ?? crypto.randomUUID())
      : existing.shareToken;

    const quiz = await prisma.quiz.update({
      where: { id },
      data: { visibility, shareToken },
      select: { visibility: true, shareToken: true, allowedEmails: true },
    });

    return NextResponse.json({ visibility: quiz.visibility, shareToken: quiz.shareToken, allowedEmails: quiz.allowedEmails });
  } catch (error) {
    console.error("Error updating share settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: replace the allowed email list for a protected quiz
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, emails } = body;

    if (!id || !Array.isArray(emails)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (existing.ownerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sanitized = emails
      .filter((e) => typeof e === "string" && e.includes("@"))
      .map((e: string) => e.trim().toLowerCase());

    const quiz = await prisma.quiz.update({
      where: { id },
      data: { allowedEmails: sanitized },
      select: { allowedEmails: true },
    });

    return NextResponse.json({ allowedEmails: quiz.allowedEmails });
  } catch (error) {
    console.error("Error updating allowed emails:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
