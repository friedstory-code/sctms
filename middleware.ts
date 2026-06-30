import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Uses the lightweight edge-safe config only -- no bcrypt, no Prisma,
// keeps this well under Vercel's Edge Function size limit.
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
