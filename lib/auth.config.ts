import type { NextAuthConfig } from "next-auth";

/**
 * This config is intentionally minimal -- no Credentials provider, no bcrypt,
 * no Prisma. It's the only auth config allowed to run in middleware
 * (Vercel Edge runtime), which has a small bundle size limit and can't run
 * Node-only packages like bcryptjs or the Prisma client anyway.
 *
 * It only checks "is there a valid session token" to gate routes.
 * The real login (password check against the database) happens in
 * lib/auth.ts, which runs in the normal Node.js serverless runtime.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  providers: [], // intentionally empty here
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");
      if (isOnLogin) return true;
      return isLoggedIn;
    },
  },
};
