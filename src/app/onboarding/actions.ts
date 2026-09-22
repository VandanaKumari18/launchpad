"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function splitList(value: FormDataEntryValue | null): string[] {
  if (!value || typeof value !== "string") return [];
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const networkContacts = [1, 2, 3, 4, 5]
    .map((i) => ({
      name: formData.get(`network_name_${i}`)?.toString().trim() ?? "",
      linkedin_url: formData.get(`network_url_${i}`)?.toString().trim() ?? "",
    }))
    .filter((c) => c.name || c.linkedin_url);

  const { error: updateError } = await supabase
    .from("users")
    .update({
      name: formData.get("name")?.toString() ?? null,
      current_role: formData.get("current_role")?.toString() ?? null,
      current_company: formData.get("current_company")?.toString() ?? null,
      years_experience: formData.get("years_experience")
        ? Number(formData.get("years_experience"))
        : null,
      city: formData.get("city")?.toString() ?? null,
      target_role: formData.get("target_role")?.toString() ?? null,
      target_companies: splitList(formData.get("target_companies")),
      timeline: formData.get("timeline")?.toString() ?? null,
      salary_min: formData.get("salary_min")
        ? Number(formData.get("salary_min"))
        : null,
      salary_max: formData.get("salary_max")
        ? Number(formData.get("salary_max"))
        : null,
      skills_list: splitList(formData.get("skills_learning")),
      certifications: formData.get("certifications")?.toString() ?? null,
      side_projects: formData.get("side_projects")?.toString() ?? null,
      network_contacts: networkContacts,
      brief_frequency: formData.get("brief_frequency")?.toString() ?? "weekly",
      brief_time: formData.get("brief_time")?.toString() ?? "morning",
      email: formData.get("email")?.toString() ?? user.email,
      tone_preference:
        formData.get("tone_preference")?.toString() ?? "Encouraging",
      onboarded: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    throw new Error(`Failed to save onboarding data: ${updateError.message}`);
  }

  const resume = formData.get("resume");
  if (resume instanceof File && resume.size > 0) {
    const path = `${user.id}/${Date.now()}-${resume.name}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(path, resume, { contentType: resume.type });

    if (uploadError) {
      throw new Error(`Failed to upload resume: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("resumes").getPublicUrl(path);

    await supabase.from("resumes").insert({
      user_id: user.id,
      file_url: publicUrl,
      parsed_text: null,
    });
  }

  redirect("/dashboard");
}
