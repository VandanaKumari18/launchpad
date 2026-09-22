import { createClient } from "@/lib/supabase/server";
import { extractResumeText, parseAchievementsFromText } from "@/lib/resume-parser";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function processResumeUpload(
  supabase: SupabaseServerClient,
  userId: string,
  file: File
) {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    throw new Error(`Failed to upload resume: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("resumes").getPublicUrl(path);

  let resumeText: string | null = null;
  try {
    resumeText = await extractResumeText(file);
  } catch (error) {
    console.error("Resume text extraction failed", error);
  }

  const { error: resumeInsertError } = await supabase.from("resumes").insert({
    user_id: userId,
    file_url: publicUrl,
    parsed_text: resumeText,
  });

  if (resumeInsertError) {
    throw new Error(`Failed to save resume: ${resumeInsertError.message}`);
  }

  if (!resumeText) return;

  try {
    const achievements = await parseAchievementsFromText(resumeText);
    if (achievements.length === 0) return;

    await supabase.from("achievements").insert(
      achievements.map((a) => ({
        user_id: userId,
        title: a.title,
        description: a.description,
        category: a.category,
        source: "resume_parsed",
        impact_metric: a.impact_metric,
        impact_number: a.impact_number,
        team_size: a.team_size,
        confidence: a.confidence,
      }))
    );
  } catch (error) {
    console.error("Achievement parsing failed", error);
  }
}
