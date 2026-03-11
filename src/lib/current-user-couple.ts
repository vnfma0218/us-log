import { createClient } from "@/utils/supabase/server";

export async function getCurrentUserAndCoupleId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("UNAUTHORIZED")
  }

  const { data: membership, error } = await supabase
    .from("couple_members")
    .select("couple_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!membership?.couple_id) {
    throw new Error("COUPLE_NOT_FOUND")
  }

  return { userId: user.id, coupleId: membership.couple_id }
}
