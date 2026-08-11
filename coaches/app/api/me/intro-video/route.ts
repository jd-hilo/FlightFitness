import { NextResponse } from "next/server";

import { getCoachRecord, patchCoachOnboarding } from "@/lib/coachProvision";
import { requireCoach } from "@/lib/requireCoach";
import { adminServiceUnavailable, createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const auth = await requireCoach();
  if (!auth.ok) return auth.response;

  const admin = createAdminClient();
  if (!admin) return adminServiceUnavailable();

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const ext =
    file.type === "video/webm"
      ? "webm"
      : file.type === "video/quicktime"
        ? "mov"
        : "mp4";
  const path = `${auth.userId}/intro.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from("coach-intro-videos")
    .upload(path, buffer, {
      contentType: file.type || "video/mp4",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: pub } = admin.storage.from("coach-intro-videos").getPublicUrl(path);
  const url = `${pub.publicUrl}?t=${Date.now()}`;

  const { error } = await admin
    .from("coaches")
    .update({
      intro_video_url: url,
      intro_video_ready: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", auth.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await patchCoachOnboarding(auth.userId, { introVideo: true });
  const coach = await getCoachRecord(auth.userId);
  return NextResponse.json({ coach, url });
}
