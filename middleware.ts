import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import type { NextRequest } from "next/server";

// Uses the lightweight edge-safe config only -- no bcrypt, no Prisma,
// keeps this well under Vercel's Edge Function size limit.
const { auth } = NextAuth(authConfig);

export default function middleware(req: NextRequest) {
  return (auth as any)(req);
}

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)"],
};
