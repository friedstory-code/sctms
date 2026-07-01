import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUsers, getSiteSettings } from "./actions";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const [users, areas, settings] = await Promise.all([
    role === "ADMIN" ? getUsers() : [],
    prisma.productionArea.findMany({ orderBy: { name: "asc" } }),
    getSiteSettings(),
  ]);

  return (
    <SettingsClient
      users={users as any}
      areas={areas}
      settings={settings}
      currentUserId={userId}
      currentUserRole={role}
    />
  );
}
