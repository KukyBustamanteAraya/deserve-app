// src/lib/db/profiles.ts
import { createClient } from "@/utils/supabase/server";

export async function getMyProfile() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile, error } = await sb
    .from("profiles")
    .select("id, email, full_name, avatar_url, has_password")
    .eq("id", user.id)
    .single();

  return { user, profile, error };
}

export async function updateMyProfile(values: { full_name?: string }) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await sb
    .from("profiles")
    .update({ full_name: values.full_name || null })
    .eq("id", user.id)
    .select("id, full_name")
    .single();

  return { data, error };
}

export async function updateProfilePasswordFlag(hasPassword: boolean) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await sb
    .from("profiles")
    .update({ has_password: hasPassword })
    .eq("id", user.id)
    .select("id, has_password")
    .single();

  return { data, error };
}