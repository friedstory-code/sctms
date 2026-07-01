"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getSessions() {
  return prisma.trainingSession.findMany({
    include: {
      programme: { include: { domain: true, productionArea: true } },
      enrollments: { include: { operator: true } },
    },
    orderBy: { date: "asc" },
  });
}

const CreateSessionSchema = z.object({
  programmeId: z.string().min(1),
  date: z.string().min(1),
  deliveryFormat: z.enum(["CLASSROOM", "WORKSHOP", "OJT"]),
  location: z.string().optional(),
});

export async function createSession(formData: FormData) {
  const user = await requireRole(["ADMIN", "MANAGER", "TRAINER"]);

  const parsed = CreateSessionSchema.parse({
    programmeId: formData.get("programmeId"),
    date: formData.get("date"),
    deliveryFormat: formData.get("deliveryFormat"),
    location: formData.get("location") || undefined,
  });

  await prisma.trainingSession.create({
    data: {
      programmeId: parsed.programmeId,
      date: new Date(parsed.date),
      deliveryFormat: parsed.deliveryFormat,
      location: parsed.location,
      trainerUserId: user.id,
    },
  });

  revalidatePath("/training-calendar");
}

const EnrollSchema = z.object({
  sessionId: z.string().min(1),
  operatorId: z.string().min(1),
});

export async function enrollOperator(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER", "TRAINER", "SUPERVISOR"]);

  const parsed = EnrollSchema.parse({
    sessionId: formData.get("sessionId"),
    operatorId: formData.get("operatorId"),
  });

  await prisma.sessionEnrollment.upsert({
    where: { sessionId_operatorId: { sessionId: parsed.sessionId, operatorId: parsed.operatorId } },
    update: {},
    create: { sessionId: parsed.sessionId, operatorId: parsed.operatorId },
  });

  revalidatePath("/training-calendar");
}

const AttendanceSchema = z.object({
  enrollmentId: z.string().min(1),
  attendance: z.enum(["ENROLLED", "ATTENDED", "DID_NOT_ATTEND"]),
});

export async function markAttendance(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER", "TRAINER"]);

  const parsed = AttendanceSchema.parse({
    enrollmentId: formData.get("enrollmentId"),
    attendance: formData.get("attendance"),
  });

  await prisma.sessionEnrollment.update({
    where: { id: parsed.enrollmentId },
    data: { attendance: parsed.attendance },
  });

  revalidatePath("/training-calendar");
}

export async function completeSession(formData: FormData) {
  await requireRole(["ADMIN", "MANAGER", "TRAINER"]);
  const sessionId = formData.get("sessionId") as string;
  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED" },
  });
  revalidatePath("/training-calendar");
}
