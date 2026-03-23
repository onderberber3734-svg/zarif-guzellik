"use server";

import { createAdminClient } from "@/utils/supabase/server-admin";
import { revalidatePath } from "next/cache";

export async function getAllBusinessesList() {
    const adminSupabase = createAdminClient();

    const { data: businesses, error } = await adminSupabase
        .from("businesses")
        .select(`
            id,
            name,
            phone,
            city,
            created_at,
            is_onboarding_completed
        `)
        .order("created_at", { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    const businessesWithStats = await Promise.all(businesses.map(async (b: any) => {
        const [usersReq, customersReq, appointmentsReq, salonsReq] = await Promise.all([
            adminSupabase.from("business_users").select("id", { count: "exact", head: true }).eq("business_id", b.id),
            adminSupabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", b.id),
            adminSupabase.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", b.id),
            adminSupabase.from("salons").select("id", { count: "exact", head: true }).eq("business_id", b.id),
        ]);

        return {
            ...b,
            stats: {
                users: usersReq.count || 0,
                customers: customersReq.count || 0,
                appointments: appointmentsReq.count || 0,
                salons: salonsReq.count || 0,
            }
        };
    }));

    return { success: true, data: businessesWithStats };
}

export async function deleteBusinessCompletely(businessId: string) {
    const adminSupabase = createAdminClient();

    try {
        // ─── 1. appointment_services (appointment FK'ya bağlı) ───
        const { data: appointments } = await adminSupabase
            .from("appointments")
            .select("id")
            .eq("business_id", businessId);

        if (appointments && appointments.length > 0) {
            const apptIds = appointments.map((a: any) => a.id);
            const chunkSize = 200;
            for (let i = 0; i < apptIds.length; i += chunkSize) {
                await adminSupabase
                    .from("appointment_services")
                    .delete()
                    .in("appointment_id", apptIds.slice(i, i + chunkSize));
            }
        }

        // ─── 2. salon_services (salon FK'ya bağlı) ───
        const { data: salons } = await adminSupabase
            .from("salons")
            .select("id")
            .eq("business_id", businessId);

        if (salons && salons.length > 0) {
            const salonIds = salons.map((s: any) => s.id);
            await adminSupabase
                .from("salon_services")
                .delete()
                .in("salon_id", salonIds);
        }

        // ─── 3. payments (customer FK'ya bağlı) ───
        const { data: customers } = await adminSupabase
            .from("customers")
            .select("id")
            .eq("business_id", businessId);

        if (customers && customers.length > 0) {
            const customerIds = customers.map((c: any) => c.id);
            const chunkSize = 200;
            for (let i = 0; i < customerIds.length; i += chunkSize) {
                await adminSupabase
                    .from("payments")
                    .delete()
                    .in("customer_id", customerIds.slice(i, i + chunkSize));
            }
        }

        // ─── 4. session_plans (customer FK'ya bağlı) ───
        if (customers && customers.length > 0) {
            const customerIds = customers.map((c: any) => c.id);
            const chunkSize = 200;
            for (let i = 0; i < customerIds.length; i += chunkSize) {
                await adminSupabase
                    .from("session_plans")
                    .delete()
                    .in("customer_id", customerIds.slice(i, i + chunkSize));
            }
        }

        // ─── 5. business_id FK'ya bağlı olan tüm bağımsız tablolar ───
        const dependentTables = [
            "appointments",
            "customers",
            "services",
            "salons",
            "campaigns",
            "business_users",
            "business_working_hours",
            "service_categories",
        ];

        for (const table of dependentTables) {
            const { error: delError } = await adminSupabase
                .from(table)
                .delete()
                .eq("business_id", businessId);

            // Tablo yoksa veya sütun yoksa hata vermesin, devam etsin
            if (delError && !delError.message.includes("does not exist")) {
                console.warn(`[SuperAdmin] ${table} silme uyarısı:`, delError.message);
            }
        }

        // ─── 6. En son business'ı sil ───
        const { error } = await adminSupabase
            .from("businesses")
            .delete()
            .eq("id", businessId);

        if (error) {
            return { success: false, error: error.message };
        }

        revalidatePath("/superyonetici", "page");
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
