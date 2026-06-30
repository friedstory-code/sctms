import { auth } from "@/lib/auth";

export type Role = "ADMIN" | "MANAGER" | "TRAINER" | "SUPERVISOR";

/**
 * Call at the top of every server action / API route that writes data.
 * Throws if the signed-in user isn't in allowedRoles.
 * This is the REAL enforcement layer -- the UI hiding buttons is just convenience,
 * this is what actually stops an unauthorized write.
 */
export async function requireRole(allowedRoles: Role[]) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Not authenticated");
  }
  const role = (session.user as any).role as Role;
  if (!allowedRoles.includes(role)) {
    throw new Error(`Forbidden: requires one of [${allowedRoles.join(", ")}], you have ${role}`);
  }
  return session.user as any as { id: string; role: Role; productionAreaId: string | null };
}
