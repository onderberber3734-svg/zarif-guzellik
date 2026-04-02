"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export type WorkingHour = {
    day_of_week: number;
    is_closed: boolean;
    start_time: string | null;
    end_time: string | null;
    break_start?: string | null;
    break_end?: string | null;
};

/**
 * Returns a basic default 7-day schedule to prevent system crash
 * before the user configures their hours in onboarding.
 * Days 1-6 (Mon-Sat): 10:00 - 19:00
 * Day 0 (Sun): Closed
 */
export const getDefaultWorkingHours = async (): Promise<WorkingHour[]> => {
    const days = [];
    for (let i = 0; i < 7; i++) {
        days.push({
            day_of_week: i,
            is_closed: i === 0, // Sunday is closed
            start_time: i === 0 ? null : "10:00:00",
            end_time: i === 0 ? null : "19:00:00",
            break_start: null,
            break_end: null
        });
    }
    return days;
};

/**
 * Get current business working hours
 */
export async function getWorkingHours() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, data: await getDefaultWorkingHours(), error: "Not logged in" };

    const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (!businessUser) return { success: false, data: await getDefaultWorkingHours(), error: "Business not found" };

    const { data: hours, error } = await supabase
        .from("business_working_hours")
        .select("*")
        .eq("business_id", businessUser.business_id)
        .order("day_of_week", { ascending: true });

    if (error) {
        console.error("Çalışma saatleri çekilirken hata:", error.message);
        return { success: false, data: await getDefaultWorkingHours(), error: error.message };
    }

    // If completely empty (new business), return defaults so UI/Booking doesn't break
    if (!hours || hours.length === 0) {
        return { success: true, data: await getDefaultWorkingHours(), isDefault: true };
    }

    return { success: true, data: hours as WorkingHour[], isDefault: false };
}

/**
 * Bulk insert or update for business working hours
 */
export async function upsertWorkingHours(hoursArray: WorkingHour[]) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not logged in" };

    const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (!businessUser?.business_id) return { success: false, error: "No business linked" };

    // Format payload with business_id for the bulk upsert
    const payload = hoursArray.map(hour => ({
        business_id: businessUser.business_id,
        day_of_week: hour.day_of_week,
        is_closed: hour.is_closed,
        start_time: hour.is_closed ? null : hour.start_time,
        end_time: hour.is_closed ? null : hour.end_time,
        break_start: hour.break_start || null,
        break_end: hour.break_end || null
    }));

    // On conflict over (business_id, day_of_week), perform an update
    const { error } = await supabase
        .from("business_working_hours")
        .upsert(payload, { onConflict: "business_id, day_of_week" });

    if (error) {
        console.error("Çalışma saatleri kaydedilirken hata:", error.message);
        return { success: false, error: error.message };
    }

    // Revalidate affected views
    revalidatePath("/(dashboard)/ayarlar", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");
    revalidatePath("/onboarding", "page");

    return { success: true };
}
