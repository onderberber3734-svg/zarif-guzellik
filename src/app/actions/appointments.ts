"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAppointment(appointmentData: {
    customer_id: string;
    salon_id?: string;
    appointment_date: string; // YYYY-MM-DD
    appointment_time: string; // HH:MM
    total_duration_minutes: number;
    total_price: number;
    notes?: string;
    services: { service_id: string; price_at_booking: number }[];
}) {
    const supabase = await createClient();

    // 1. Session ve Tenant Kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "İşlem yapmak için oturum açmalısınız." };
    }

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (bizError || !businessUser?.business_id) {
        return { success: false, error: "Kullanıcıya tanımlı bir işletme (tenant) bulunamadı." };
    }

    // 2. Randevu (Appointment) Ana Kaydını Oluşturma
    const { data: newAppointment, error: apptError } = await supabase
        .from("appointments")
        .insert([
            {
                business_id: businessUser.business_id,
                customer_id: appointmentData.customer_id,
                salon_id: appointmentData.salon_id || null,
                appointment_date: appointmentData.appointment_date,
                appointment_time: appointmentData.appointment_time,
                status: 'scheduled',
                total_duration_minutes: appointmentData.total_duration_minutes,
                total_price: appointmentData.total_price,
                notes: appointmentData.notes || null,
            }
        ])
        .select()
        .single();

    if (apptError || !newAppointment) {
        console.error("Randevu oluşturma hatası:", apptError?.message);
        return { success: false, error: apptError?.message || "Randevu oluşturulamadı." };
    }

    // 3. Randevuya Bağlı Hizmetleri (Appointment Services) Ekleme
    const appointmentServicesToInsert = appointmentData.services.map(srv => ({
        appointment_id: newAppointment.id,
        service_id: srv.service_id,
        price_at_booking: srv.price_at_booking
    }));

    const { error: servicesError } = await supabase
        .from("appointment_services")
        .insert(appointmentServicesToInsert);

    if (servicesError) {
        console.error("Randevu hizmetleri oluşturma hatası:", servicesError.message);
        // İdeal durumda burada transaction rollback yapılır ama MVP'de basic idare ediyoruz.
        return { success: false, error: "Randevu oluşturuldu ancak hizmetler eklenirken bir hata oluştu." };
    }

    // 4. Kampanya Dönüşüm (Conversion) Kontrolü (MVP)
    // Eğer müşterinin son 30 gün içinde başlatılmış ve hedef kitlesinde bulunduğu bir kampanya varsa, bu randevuyu o kampanyaya bağla.
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: targetData, error: targetError } = await supabase
            .from('campaign_targets')
            .select('id, campaign_id')
            .eq('customer_id', appointmentData.customer_id)
            .in('status', ['pending', 'contacted']) // Henüz dönüşmemiş hedefler
            .gte('created_at', thirtyDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (targetData && !targetError) {
            const campaignId = targetData.campaign_id;

            // 4.1 Randevuya kampanya kaynağını ekle
            await supabase
                .from('appointments')
                .update({ source_campaign_id: campaignId })
                .eq('id', newAppointment.id);

            // 4.2 Hedefin durumunu 'converted' (dönüştü) yap
            await supabase
                .from('campaign_targets')
                .update({
                    status: 'converted',
                    converted_at: new Date().toISOString(),
                    converted_appointment_id: newAppointment.id
                })
                .eq('id', targetData.id);

            // 4.3 Kampanyanın dönüşüm sayısını artır (MVP - race condition ihtimalini göz ardı ediyoruz basitlik için)
            const { data: campaign } = await supabase
                .from('campaigns')
                .select('actual_conversion_count')
                .eq('id', campaignId)
                .single();

            if (campaign) {
                await supabase
                    .from('campaigns')
                    .update({ actual_conversion_count: (campaign.actual_conversion_count || 0) + 1 })
                    .eq('id', campaignId);
            }
        }
    } catch (conversionErr) {
        console.error("Kampanya dönüşümü işlenirken hata (randevu yine de oluşturuldu):", conversionErr);
    }

    // Cache'i temizle
    revalidatePath("/(dashboard)/randevular", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");

    return { success: true, data: newAppointment };
}

// Tüm randevuları müşteri ve servis detaylarıyla birlikte getir
export async function getAppointments() {
    const supabase = await createClient();

    // 1. Session ve Tenant Kontrolü
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

    // 2. Randevuları İlişkili Tablolarla (Customers, Services) Çekme
    const { data, error } = await supabase
        .from("appointments")
        .select(`
            id,
            business_id,
            customer_id,
            appointment_date,
            appointment_time,
            status,
            total_duration_minutes,
            total_price,
            notes,
            created_at,
            salon_id,
            salons(id, name, color_code),
            customer:customers(id, first_name, last_name, phone, email),
            services:appointment_services(
                id,
                price_at_booking,
                service:services(id, name, category, duration_minutes)
            )
        `)
        .eq("business_id", businessUser.business_id)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

    if (error) {
        console.error("Randevuları çekerken hata:", error.message);
        throw new Error("Randevular yüklenemedi: " + error.message);
    }

    return data || [];
}

// Randevu Durumunu Güncelle (Check-in, Tamamla, İptal, vs)
export async function updateAppointmentStatus(id: string, status: 'scheduled' | 'checked_in' | 'completed' | 'canceled' | 'no_show') {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "Yetkisiz erişim." };
    }

    // Önceki durumu alıp ciro hesaplamasına dahil etmemiz gerekebilir
    const { data: existingAppt } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

    if (!existingAppt) return { success: false, error: "Randevu bulunamadı." };

    const { data, error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

    if (error || !data) {
        return { success: false, error: error?.message || "Güncellenemedi." };
    }

    // Eğer randevu tamamlandıysa ve bir kampanyaya bağlıysa ciro etkisini hesapla
    if (status === 'completed' && existingAppt.status !== 'completed' && existingAppt.source_campaign_id) {
        try {
            const campaignId = existingAppt.source_campaign_id;
            const { data: campaign } = await supabase
                .from('campaigns')
                .select('actual_revenue_impact')
                .eq('id', campaignId)
                .single();

            if (campaign) {
                await supabase
                    .from('campaigns')
                    .update({
                        actual_revenue_impact: (campaign.actual_revenue_impact || 0) + existingAppt.total_price
                    })
                    .eq('id', campaignId);
            }
        } catch (revenueErr) {
            console.error("Kampanya ciro etkisi hesaplanırken hata oluştu:", revenueErr);
        }
    }

    revalidatePath("/(dashboard)/randevular", "page");
    return { success: true, data };
}

// Randevu Sil (Kalıcı olarak veritabanından)
export async function deleteAppointment(id: string) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "Yetkisiz erişim." };
    }

    // Cascade delete on appointment_services resolves related rows
    const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/(dashboard)/randevular", "page");
    return { success: true };
}
