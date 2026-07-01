"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getTrainingProgrammes() {
  return prisma.trainingProgramme.findMany({
    include: { productionArea: true, domain: true },
    orderBy: [{ productionArea: { name: "asc" } }, { domain: { code: "asc" } }],
  });
}

const UpdateSchema = z.object({
  programmeId: z.string().min(1),
  deliveryMethod: z.enum(["CLASSROOM", "WORKSHOP", "OJT"]),
  levelFrom: z.coerce.number().int().min(0).max(4),
  levelTo: z.coerce.number().int().min(0).max(4),
  refreshFrequency: z.enum(["NONE", "ANNUAL", "BIENNIAL", "TRIENNIAL"]),
  deckFileUrl: z.string().optional(),
});

export async function updateProgramme(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER"]);

  const parsed = UpdateSchema.parse({
    programmeId: formData.get("programmeId"),
    deliveryMethod: formData.get("deliveryMethod"),
    levelFrom: formData.get("levelFrom"),
    levelTo: formData.get("levelTo"),
    refreshFrequency: formData.get("refreshFrequency"),
    deckFileUrl: formData.get("deckFileUrl") || undefined,
  });

  await prisma.trainingProgramme.update({
    where: { id: parsed.programmeId },
    data: {
      deliveryMethod: parsed.deliveryMethod,
      levelFrom: parsed.levelFrom,
      levelTo: parsed.levelTo,
      refreshFrequency: parsed.refreshFrequency,
      deckFileUrl: parsed.deckFileUrl,
    },
  });

  revalidatePath("/training-matrix");
}
