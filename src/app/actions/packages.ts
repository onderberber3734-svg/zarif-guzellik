"use server";

import { createClient } from "@/utils/supabase/server";

export async function getAllSessionPlansSummary() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business found" };

    const { data, error } = await supabase
        .from("session_plans")
        .select(`
            id,
            customer_id,
            service_id,
            status,
            total_sessions,
            completed_sessions,
            recommended_interval_days,
            next_recommended_date,
            pricing_model,
            package_total_price,
            per_session_price,
            paid_amount,
            payment_mode,
            created_at,
            customers:customer_id (id, first_name, last_name, phone),
            services:service_id (id, name, service_type, service_categories(name)),
            appointment_services (
                session_number,
                appointments:appointment_id (id, appointment_date, appointment_time, status)
            )
        `)
        .eq('business_id', biz.business_id)
        .order('next_recommended_date', { ascending: true, nullsFirst: false })
        .limit(1000);

    if (error) {
        console.error("Session plans summary error:", error);
        return { success: false, error: error.message };
    }

    // Her plan için gelecek randevu bilgisini hesapla
    const enrichedData = (data || []).map(plan => {
        const todayStr = new Date().toISOString().split('T')[0];
        const futureAppointments = (plan.appointment_services || [])
            .filter((as: any) => {
                const apt = as.appointments;
                return apt && apt.appointment_date >= todayStr && (apt.status === 'scheduled' || apt.status === 'checked_in');
            })
            .map((as: any) => ({
                session_number: as.session_number,
                date: as.appointments.appointment_date,
                time: as.appointments.appointment_time,
                status: as.appointments.status
            }))
            .sort((a: any, b: any) => a.date.localeCompare(b.date));

        return {
            ...plan,
            next_appointment: futureAppointments.length > 0 ? futureAppointments[0] : null,
            future_appointments_count: futureAppointments.length
        };
    });

    return { success: true, data: enrichedData };
}

export async function getSessionPlanDetails(planId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business found" };

    const { data, error } = await supabase
        .from("session_plans")
        .select(`
            *,
            customers:customer_id (id, first_name, last_name, phone),
            services:service_id (id, name, service_type, service_categories(name)),
            payments (*),
            appointment_services (
                id, session_number, price_at_booking,
                appointments (id, appointment_date, appointment_time, status)
            )
        `)
        .eq('business_id', biz.business_id)
        .eq('id', planId)
        .order('paid_at', { foreignTable: 'payments', ascending: false })
        .single();

    if (error) {
        console.error("Session plan deep fetch error:", error);
        return { success: false, error: error.message };
    }

    // Sort appointment_services by session_number in app code since Supabase JS doesn't natively support double nested sorts easily
    if (data.appointment_services) {
        data.appointment_services.sort((a: any, b: any) => (a.session_number || 0) - (b.session_number || 0));
    }

    return { success: true, data };
}
