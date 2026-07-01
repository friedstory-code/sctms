import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseAdmin, BUCKETS } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const formData = await req.formData();
  const type = formData.get("type") as string; // "logo" | "training-material"
  const file = formData.get("file") as File;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // Role checks
  if (type === "logo" && role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  if (type === "training-material" && !["ADMIN", "MANAGER", "TRAINER"].includes(role)) {
    return NextResponse.json({ error: "Insufficient role" }, { status: 403 });
  }

  // File type validation
  const allowedTypes: Record<string, string[]> = {
    logo: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
    "training-material": [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",   // docx
      "application/pdf",
    ],
  };

  if (!allowedTypes[type]?.includes(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type for ${type}. Allowed: ${allowedTypes[type]?.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  const bucket = type === "logo" ? BUCKETS.BRANDING : BUCKETS.TRAINING_MATERIALS;
  const ext = file.name.split(".").pop();
  const path = type === "logo"
    ? `logo.${ext}`
    : `${formData.get("programmeCode") ?? "misc"}/${Date.now()}-${file.name}`;

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

  // If logo, save URL to SiteSettings
  if (type === "logo") {
    await prisma.siteSetting.upsert({
      where: { key: "logoUrl" },
      update: { value: publicUrl },
      create: { key: "logoUrl", value: publicUrl },
    });
  }

  // If training material, optionally link to programme
  const programmeId = formData.get("programmeId") as string;
  if (type === "training-material" && programmeId) {
    await prisma.trainingProgramme.update({
      where: { id: programmeId },
      data: { deckFileUrl: publicUrl },
    });
  }

  return NextResponse.json({ url: publicUrl });
}
