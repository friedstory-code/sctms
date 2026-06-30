"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const AddOperatorSchema = z.object({
  fullName: z.string().min(1),
  employeeId: z.string().min(1),
  jobTitle: z.string().min(1),
  roleProfile: z.enum(["PO_ENTRY", "PO", "SPO", "LO_TL", "TRN"]),
  productionAreaId: z.string().min(1),
});

export async function addOperator(formData: FormData) {
  // Only Admin, Manager, or Supervisor may add staff
  await requireRole(["ADMIN", "MANAGER", "SUPERVISOR"]);

  const parsed = AddOperatorSchema.parse({
    fullName: formData.get("fullName"),
    employeeId: formData.get("employeeId"),
    jobTitle: formData.get("jobTitle"),
    roleProfile: formData.get("roleProfile"),
    productionAreaId: formData.get("productionAreaId"),
  });

  await prisma.operator.create({ data: parsed });
  revalidatePath("/skill-matrix");
}

const AddAssessmentSchema = z.object({
  operatorId: z.string().min(1),
  domainId: z.string().min(1),
  level: z.coerce.number().int().min(0).max(4),
  assessmentDate: z.string().min(1),
  notes: z.string().optional(),
});

export async function addAssessment(formData: FormData) {
  // Only Admin, Manager, or Supervisor may record an assessed level
  const user = await requireRole(["ADMIN", "MANAGER", "SUPERVISOR"]);

  const parsed = AddAssessmentSchema.parse({
    operatorId: formData.get("operatorId"),
    domainId: formData.get("domainId"),
    level: formData.get("level"),
    assessmentDate: formData.get("assessmentDate"),
    notes: formData.get("notes") || undefined,
  });

  await prisma.assessment.create({
    data: {
      operatorId: parsed.operatorId,
      domainId: parsed.domainId,
      level: parsed.level,
      assessmentDate: new Date(parsed.assessmentDate),
      assessorUserId: user.id,
      notes: parsed.notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE_ASSESSMENT",
      entity: "Assessment",
      entityId: parsed.operatorId,
      details: parsed,
    },
  });

  revalidatePath("/skill-matrix");
}

/**
 * Returns, for every operator, their latest assessed level per domain
 * plus the target level for their role profile -- the gap analysis.
 */
export async function getSkillMatrixData(productionAreaId?: string) {
  const operators = await prisma.operator.findMany({
    where: { active: true, ...(productionAreaId ? { productionAreaId } : {}) },
    include: {
      productionArea: true,
      assessments: {
        orderBy: { assessmentDate: "desc" },
      },
    },
    orderBy: { fullName: "asc" },
  });

  const domains = await prisma.domain.findMany({ orderBy: { code: "asc" } });
  const targets = await prisma.roleProfileTarget.findMany();

  const matrix = operators.map((op) => {
    const domainResults = domains.map((domain) => {
      const latest = op.assessments.find((a) => a.domainId === domain.id);
      const level = latest?.level ?? 0;
      const target =
        targets.find((t) => t.roleProfile === op.roleProfile && t.domainId === domain.id)
          ?.targetLevel ?? 0;

      let status: "GREY" | "GREEN" | "AMBER" | "RED";
      if (!latest) status = "GREY";
      else if (level >= target) status = "GREEN";
      else if (target - level === 1) status = "AMBER";
      else status = "RED";

      return { domainId: domain.id, domainCode: domain.code, level, target, status, assessedAt: latest?.assessmentDate ?? null };
    });

    return {
      operatorId: op.id,
      fullName: op.fullName,
      employeeId: op.employeeId,
      roleProfile: op.roleProfile,
      productionArea: op.productionArea.name,
      domainResults,
    };
  });

  return { matrix, domains };
}

export async function getProductionAreas() {
  return prisma.productionArea.findMany({ orderBy: { name: "asc" } });
}
