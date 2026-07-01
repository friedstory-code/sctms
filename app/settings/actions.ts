"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

// ---- Company branding ----

export async function getSiteSettings() {
  const settings = await prisma.siteSetting.findMany();
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export async function updateSiteSetting(key: string, value: string) {
  await requireRole(["ADMIN"]);
  await prisma.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  revalidatePath("/", "layout");
}

// ---- User management (Admin only) ----

export async function getUsers() {
  return prisma.user.findMany({
    include: { productionArea: true },
    orderBy: { name: "asc" },
  });
}

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "TRAINER", "SUPERVISOR"]),
  productionAreaId: z.string().optional(),
});

export async function createUser(formData: FormData) {
  await requireRole(["ADMIN"]);

  const parsed = CreateUserSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    productionAreaId: formData.get("productionAreaId") || undefined,
  });

  const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
  if (existing) throw new Error("A user with that email already exists.");

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      passwordHash,
      role: parsed.role,
      productionAreaId: parsed.productionAreaId || null,
    },
  });

  revalidatePath("/settings");
}

const UpdateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MANAGER", "TRAINER", "SUPERVISOR"]),
});

export async function updateUserRole(formData: FormData) {
  await requireRole(["ADMIN"]);

  const parsed = UpdateRoleSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  await prisma.user.update({
    where: { id: parsed.userId },
    data: { role: parsed.role },
  });

  revalidatePath("/settings");
}

export async function deactivateUser(formData: FormData) {
  const me = await requireRole(["ADMIN"]);
  const userId = formData.get("userId") as string;

  if (userId === me.id) throw new Error("You cannot deactivate your own account.");

  // We don't delete — just clear the password so they can't log in
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: "" },
  });

  revalidatePath("/settings");
}

// ---- Change own password (any role) ----

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
  confirmPassword: z.string().min(1),
});

export async function changePassword(prevState: any, formData: FormData) {
  const user = await requireRole(["ADMIN", "MANAGER", "TRAINER", "SUPERVISOR"]);

  const parsed = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { error: "User not found." };

  const valid = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { success: "Password updated successfully." };
}
