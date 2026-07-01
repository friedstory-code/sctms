"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getCertifications() {
  return prisma.certification.findMany({
    include: { operator: true, domain: true },
    orderBy: { expiryDate: "asc" },
  });
}

function computeStatus(expiryDate: Date | null): "CURRENT" | "EXPIRING_SOON" | "EXPIRED" {
  if (!expiryDate) return "CURRENT";
  const now = new Date();
  const days = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "EXPIRED";
  if (days <= 90) return "EXPIRING_SOON";
  return "CURRENT";
}

const CreateSchema = z.object({
  operatorId: z.string().min(1),
  domainId: z.string().min(1),
  levelConfirmed: z.coerce.number().int().min(0).max(4),
  assessmentDate: z.string().min(1),
  assessorName: z.string().min(1),
  expiryDate: z.string().optional(),
});

export async function addCertification(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER", "SUPERVISOR"]);

  const parsed = CreateSchema.parse({
    operatorId: formData.get("operatorId"),
    domainId: formData.get("domainId"),
    levelConfirmed: formData.get("levelConfirmed"),
    assessmentDate: formData.get("assessmentDate"),
    assessorName: formData.get("assessorName"),
    expiryDate: formData.get("expiryDate") || undefined,
  });

  const expiryDate = parsed.expiryDate ? new Date(parsed.expiryDate) : null;

  await prisma.certification.create({
    data: {
      operatorId: parsed.operatorId,
      domainId: parsed.domainId,
      levelConfirmed: parsed.levelConfirmed,
      assessmentDate: new Date(parsed.assessmentDate),
      assessorName: parsed.assessorName,
      expiryDate,
      status: computeStatus(expiryDate),
    },
  });

  revalidatePath("/certification");
}
