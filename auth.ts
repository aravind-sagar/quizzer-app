import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers: [Google],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        if (user && user.id) {
            session.user.id = user.id;
        } else {
             console.warn("Session callback: User object missing ID", user);
        }
      }
      return session;
    },
  },
});
