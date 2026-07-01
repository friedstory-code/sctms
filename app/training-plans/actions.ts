"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getTrainingPlans() {
  return prisma.trainingPlan.findMany({
    include: {
      operator: { include: { productionArea: true } },
      items: { include: { programme: { include: { domain: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

const CreatePlanSchema = z.object({
  operatorId: z.string().min(1),
  isOnboarding: z.coerce.boolean().optional(),
});

export async function createPlan(formData: FormData) {
  const user = await requireRole(["ADMIN", "MANAGER", "SUPERVISOR"]);
  const parsed = CreatePlanSchema.parse({
    operatorId: formData.get("operatorId"),
    isOnboarding: formData.get("isOnboarding") === "on",
  });
  await prisma.trainingPlan.create({ data: parsed });
  revalidatePath("/training-plans");
}

const AddItemSchema = z.object({
  trainingPlanId: z.string().min(1),
  programmeId: z.string().min(1),
  targetDate: z.string().optional(),
});

export async function addPlanItem(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER", "SUPERVISOR", "TRAINER"]);
  const parsed = AddItemSchema.parse({
    trainingPlanId: formData.get("trainingPlanId"),
    programmeId: formData.get("programmeId"),
    targetDate: formData.get("targetDate") || undefined,
  });
  await prisma.trainingPlanItem.create({
    data: {
      trainingPlanId: parsed.trainingPlanId,
      programmeId: parsed.programmeId,
      targetDate: parsed.targetDate ? new Date(parsed.targetDate) : undefined,
    },
  });
  revalidatePath("/training-plans");
}

const StatusSchema = z.object({
  itemId: z.string().min(1),
  status: z.enum(["PLANNED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "ASSESSED"]),
});

export async function updateItemStatus(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER", "SUPERVISOR", "TRAINER"]);
  const parsed = StatusSchema.parse({
    itemId: formData.get("itemId"),
    status: formData.get("status"),
  });
  await prisma.trainingPlanItem.update({
    where: { id: parsed.itemId },
    data: { status: parsed.status },
  });
  revalidatePath("/training-plans");
}
