"use server";

import { createClient } from "@/utils/supabase/server";

export async function getBusinessProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not logged in" };

    const { data: businessUser, error: relationError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (relationError || !businessUser) {
        return { data: null, error: relationError?.message || "No business relation" };
    }

    const { data: business, error: bizError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessUser.business_id)
        .single();

    if (bizError || !business) {
        return { data: null, error: bizError?.message || "Business not found" };
    }

    return { data: business, error: null };
}

export async function updateBusinessProfile(businessId: string, updates: any) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("businesses")
        .update(updates)
        .eq("id", businessId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
