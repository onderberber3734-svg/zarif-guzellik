"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getSalons() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error("Oturum açmadınız veya yetkiniz yok.");
    }

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (bizError || !businessUser?.business_id) {
        throw new Error("İşletme yetkiniz bulunamadı.");
    }

    const { data, error } = await supabase
        .from("salons")
        .select("*, salon_services(service_id)")
        .eq("business_id", businessUser.business_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Salonları çekerken hata:", error.message);
        throw new Error("Salonlar yüklenemedi: " + error.message);
    }

    return data || [];
}

export async function createSalon(salonData: { name: string; type?: string; description?: string; color_code?: string; capacity?: number; is_active?: boolean; inactive_until?: string | null; service_ids?: string[] }) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Oturum açın." };

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (bizError || !businessUser?.business_id) return { success: false, error: "İşletme bulunamadı." };

    const { service_ids, ...restData } = salonData;

    const { data, error } = await supabase
        .from("salons")
        .insert([{
            business_id: businessUser.business_id,
            ...restData
        }])
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    if (service_ids && service_ids.length > 0) {
        const servicesToInsert = service_ids.map(id => ({
            salon_id: data.id,
            service_id: id,
            business_id: businessUser.business_id
        }));
        await supabase.from("salon_services").insert(servicesToInsert);
    }

    revalidatePath("/(dashboard)/salonlar", "page");
    return { success: true, data };
}

export async function updateSalon(id: string, updates: Partial<{ name: string; type: string; description: string; color_code: string; capacity: number; is_active: boolean; inactive_until: string | null; service_ids: string[] }>) {
    const supabase = await createClient();

    const { service_ids, ...restUpdates } = updates;

    // Check if we are trying to set is_active to false
    if (restUpdates.is_active === false) {
        // Validate that there are no upcoming appointments
        const todayStr = new Date().toISOString().split('T')[0];

        let query = supabase
            .from("appointments")
            .select(`
                id,
                appointment_date,
                appointment_time,
                status,
                customer:customers (first_name, last_name)
            `)
            .eq("salon_id", id)
            .in("status", ["scheduled"])
            .gte("appointment_date", todayStr);

        // If closed until a specific date, only check appointments up to that date
        if (restUpdates.inactive_until) {
            query = query.lte("appointment_date", restUpdates.inactive_until);
        }

        const { data: blockingAppts, error: apptError } = await query.limit(10);

        if (apptError) {
            return { success: false, error: "Randevu kontrolü yapılamadı: " + apptError.message };
        }

        if (blockingAppts && blockingAppts.length > 0) {
            return {
                success: false,
                error: restUpdates.inactive_until
                    ? `Bu odayı ${new Date(restUpdates.inactive_until).toLocaleDateString('tr-TR')} tarihine kadar pasife alamazsınız çünkü bu tarihe kadar planlanmış randevular bulunmaktadır.`
                    : "Bu salonu/odayı pasife alamazsınız çünkü ileri tarihli planlanmış randevular bulunmaktadır.",
                blockingAppointments: blockingAppts
            };
        }
    }

    if (Object.keys(restUpdates).length > 0) {
        const { error } = await supabase
            .from("salons")
            .update(restUpdates)
            .eq("id", id);
        if (error) return { success: false, error: error.message };
    }

    if (service_ids !== undefined) {
        // Find business_id
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        const { data: businessUser } = await supabase
            .from("business_users")
            .select("business_id")
            .eq("user_id", user?.id)
            .single();

        // Eski servis bağlantılarını sil
        await supabase.from("salon_services").delete().eq("salon_id", id);
        // Yenilerini ekle
        if (service_ids.length > 0 && businessUser?.business_id) {
            const servicesToInsert = service_ids.map(sid => ({
                salon_id: id,
                service_id: sid,
                business_id: businessUser.business_id
            }));
            await supabase.from("salon_services").insert(servicesToInsert);
        }
    }

    revalidatePath("/(dashboard)/salonlar", "page");
    return { success: true };
}

export async function deleteSalon(id: string) {
    const supabase = await createClient();

    // Check if there are any appointments assigned to this salon
    const { data: blockingAppts, error: apptError } = await supabase
        .from("appointments")
        .select(`
            id,
            appointment_date,
            appointment_time,
            status,
            customer:customers (first_name, last_name)
        `)
        .eq("salon_id", id)
        .in("status", ["scheduled", "checked_in", "completed"]) // İptal edilenler vb. görmezden gelinebilir mi? İsteğe göre hepsi bloklar. Şimdilik temel olanlar.
        .limit(5);

    if (apptError) {
        return { success: false, error: "Randevu kontrolü yapılamadı: " + apptError.message };
    }

    if (blockingAppts && blockingAppts.length > 0) {
        return {
            success: false,
            error: "Bu salona tanımlanmış randevular bulunduğu için silinemez. Lütfen önce salonu pasife alın veya randevuları başka odaya taşıyın.",
            blockingAppointments: blockingAppts
        };
    }

    const { error } = await supabase
        .from("salons")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/(dashboard)/salonlar", "page");
    return { success: true };
}
