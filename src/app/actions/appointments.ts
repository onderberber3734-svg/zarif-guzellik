"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createAppointment(appointmentData: {
    customer_id: string;
    salon_id?: string;
    staff_id?: string | null;
    appointment_date: string; // YYYY-MM-DD
    appointment_time: string; // HH:MM
    total_duration_minutes: number;
    total_price: number;
    notes?: string;
    services: {
        service_id: string;
        price_at_booking: number;
        session_plan_id?: string;
        session_number?: number;
    }[];
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

    // 1.5. Personel Zorunluluğu ve Doğrulama
    const { data: activeStaff } = await supabase
        .from("staff")
        .select(`id, is_active, staff_services(service_id)`)
        .eq("business_id", businessUser.business_id)
        .eq("is_active", true);

    const hasAnyActiveStaff = activeStaff && activeStaff.length > 0;
    let finalStaffId = appointmentData.staff_id;

    if (hasAnyActiveStaff) {
        if (!finalStaffId) {
            // Eğer personel varsa ama seçilmemişse, eğer sadece 1 kişi varsa oto seç (fallback). Yoksa hata dön.
            if (activeStaff.length === 1) {
                finalStaffId = activeStaff[0].id;
            } else {
                return { success: false, error: "İşletmenizde kayıtlı personeller bulunmaktadır. Lütfen bu randevuyu kimin yapacağını (Personel) seçin." };
            }
        }

        // Eğer bir staff seçiliyse (veya zorunlu atandıysa), o personeli detaylı doğrula.
        if (finalStaffId) {
            const targetStaff = activeStaff.find(s => s.id === finalStaffId);
            if (!targetStaff) {
                return { success: false, error: "Seçilen personel aktif değil veya bu işletmeye ait değil." };
            }

            // A) Hizmet kontrolü
            const serviceIds = appointmentData.services.map(s => s.service_id);
            const staffSkills = new Set(targetStaff.staff_services?.map(ss => ss.service_id) || []);
            const hasSkill = serviceIds.every(sid => staffSkills.has(sid));
            if (!hasSkill) {
                return { success: false, error: "Seçilen personel randevudaki tüm hizmetleri vermeye yetkin değil." };
            }

            // B) İzin kontrolü
            const { data: timeOffs } = await supabase
                .from("staff_time_off")
                .select("id")
                .eq("staff_id", finalStaffId)
                .eq("status", "approved")
                .lte("start_date", appointmentData.appointment_date)
                .gte("end_date", appointmentData.appointment_date);
            if (timeOffs && timeOffs.length > 0) {
                return { success: false, error: "Seçilen personel bu tarihte izinli." };
            }

            // C) Zamanlama Çakışması Kontrolü
            const { data: existingAppts } = await supabase
                .from("appointments")
                .select("appointment_time, total_duration_minutes")
                .eq("staff_id", finalStaffId)
                .eq("appointment_date", appointmentData.appointment_date)
                .in("status", ["scheduled", "checked_in", "in_progress"]);

            const reqStart = new Date(`${appointmentData.appointment_date}T${appointmentData.appointment_time}`).getTime();
            const reqEnd = reqStart + (appointmentData.total_duration_minutes * 60000);

            let hasConflict = false;
            if (existingAppts) {
                for (const appt of existingAppts) {
                    const apptStart = new Date(`${appointmentData.appointment_date}T${appt.appointment_time}`).getTime();
                    const apptEnd = apptStart + ((appt.total_duration_minutes || 0) * 60000);
                    if (reqStart < apptEnd && reqEnd > apptStart) {
                        hasConflict = true;
                        break;
                    }
                }
            }

            if (hasConflict) {
                return { success: false, error: "Seçilen personelin bu saat aralığında başka bir randevusu mevcut (Çakışma)." };
            }

            // D) Çalışma Saatleri Kontrolü
            const reqDateObj = new Date(appointmentData.appointment_date);
            const dayOfWeek = reqDateObj.getDay();

            const { data: workingHour } = await supabase
                .from("staff_working_hours")
                .select("*")
                .eq("staff_id", finalStaffId)
                .eq("day_of_week", dayOfWeek)
                .single();

            if (workingHour) {
                if (workingHour.is_closed) {
                    return { success: false, error: "Seçilen personel bugün çalışmıyor." };
                }
                const timeToMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                const reqStartMins = timeToMins(appointmentData.appointment_time);
                const reqEndMins = reqStartMins + appointmentData.total_duration_minutes;

                if (workingHour.start_time && workingHour.end_time) {
                    const shiftStart = timeToMins(workingHour.start_time);
                    const shiftEnd = timeToMins(workingHour.end_time);
                    if (reqStartMins < shiftStart || reqEndMins > shiftEnd) {
                        return { success: false, error: "Seçilen saat personelin mesai saatleri dışında." };
                    }
                }
                if (workingHour.break_start && workingHour.break_end) {
                    const breakStart = timeToMins(workingHour.break_start);
                    const breakEnd = timeToMins(workingHour.break_end);
                    if (reqStartMins < breakEnd && reqEndMins > breakStart) {
                        return { success: false, error: "Seçilen saat personelin mola saatleriyle çakışıyor." };
                    }
                }
            }
        }
    } else {
        // Personel yok, null bırak.
        finalStaffId = null;
    }

    // 2. Randevu (Appointment) Ana Kaydını Oluşturma
    const { data: newAppointment, error: apptError } = await supabase
        .from("appointments")
        .insert([
            {
                business_id: businessUser.business_id,
                customer_id: appointmentData.customer_id,
                salon_id: appointmentData.salon_id || null,
                staff_id: finalStaffId,
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
        price_at_booking: srv.price_at_booking,
        session_plan_id: srv.session_plan_id || null,
        session_number: srv.session_number || null,
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
    revalidatePath("/randevular");
    revalidatePath("/randevu-olustur");
    revalidatePath("/musteriler");
    revalidatePath("/paket-seans");

    return { success: true, data: newAppointment };
}

export async function createSessionPlan(planData: {
    customer_id: string;
    service_id: string;
    total_sessions: number;
    recommended_interval_days: number;
    pricing_model?: 'package_total' | 'per_session';
    package_total_price?: number;
    per_session_price?: number;
    prepayment_amount?: number;
    first_appointment_date?: string; // ISO date string (YYYY-MM-DD) — randevu ekranında seçilen tarih
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    const prepayment = planData.prepayment_amount || 0;

    // next_recommended_date: Randevu tarihi + seans aralığı gün
    // Eğer randevu tarihi verilmemişse bugünü baz al
    const baseDate = planData.first_appointment_date
        ? new Date(planData.first_appointment_date + "T00:00:00")
        : new Date();
    baseDate.setDate(baseDate.getDate() + planData.recommended_interval_days);
    const nextRecommendedDate = baseDate.toISOString().split("T")[0];

    const { data, error } = await supabase
        .from("session_plans")
        .insert([{
            business_id: biz.business_id,
            customer_id: planData.customer_id,
            service_id: planData.service_id,
            total_sessions: planData.total_sessions,
            recommended_interval_days: planData.recommended_interval_days,
            pricing_model: planData.pricing_model || 'package_total',
            package_total_price: planData.package_total_price || null,
            per_session_price: planData.per_session_price || null,
            status: 'active',
            completed_sessions: 0,
            paid_amount: prepayment,
            next_recommended_date: nextRecommendedDate
        }])
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    // Eğer bir ön ödeme yapıldıysa ödemeler tablosuna kayıt at
    if (prepayment > 0 && data) {
        await supabase.from("payments").insert([{
            business_id: biz.business_id,
            customer_id: planData.customer_id,
            session_plan_id: data.id,
            amount: prepayment,
            payment_method: 'cash',
            notes: 'Paket başlatılırken alınan ön ödeme'
        }]);
    }

    return { success: true, data };
}

export async function updateSessionPlan(planId: string, updateData: {
    total_sessions?: number;
    recommended_interval_days?: number;
    package_total_price?: number;
    next_recommended_date?: string; // ISO date string, manuel tarih seçimi için
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Oturum açmadınız." };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "İşletme yetkiniz bulunamadı." };

    const { data: existingPlan, error: planErr } = await supabase
        .from("session_plans")
        .select("business_id, completed_sessions, created_at, recommended_interval_days")
        .eq("id", planId)
        .single();

    if (planErr || !existingPlan) return { success: false, error: "Plan bulunamadı." };
    if (existingPlan.business_id !== biz.business_id) return { success: false, error: "Yetkisiz işlem." };

    if (updateData.total_sessions !== undefined && updateData.total_sessions < existingPlan.completed_sessions) {
        return { success: false, error: `Toplam seans sayısı, tamamlanmış seans sayısından (${existingPlan.completed_sessions}) küçük olamaz.` };
    }

    const payload: any = { ...updateData };

    // Eğer next_recommended_date manuel olarak belirtildiyse onu kullan, yoksa interval'a göre hesapla
    if (updateData.next_recommended_date) {
        payload.next_recommended_date = updateData.next_recommended_date;
    } else if (updateData.recommended_interval_days !== undefined && updateData.recommended_interval_days !== existingPlan.recommended_interval_days) {
        // En son tamamlanmış randevuyu bul
        const { data: latestAppt } = await supabase
            .from("appointment_services")
            .select("appointment_id, appointments!inner(appointment_date, status)")
            .eq("session_plan_id", planId)
            .eq("appointments.status", "completed")
            .order("appointments(appointment_date)", { ascending: false })
            .limit(1)
            .single();

        let baseDate = existingPlan.created_at;
        if (latestAppt && latestAppt.appointments) {
            baseDate = (latestAppt.appointments as any).appointment_date;
        }

        const newDate = new Date(baseDate);
        newDate.setDate(newDate.getDate() + updateData.recommended_interval_days);
        payload.next_recommended_date = newDate.toISOString().split("T")[0];
    }

    const { error: updateErr } = await supabase
        .from("session_plans")
        .update(payload)
        .eq("id", planId);

    if (updateErr) return { success: false, error: updateErr.message };

    revalidatePath("/randevu-olustur");
    revalidatePath("/musteriler");
    revalidatePath("/randevular");
    revalidatePath("/paket-seans");

    return { success: true };
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
            staff_id,
            salons(id, name, color_code),
            staff(id, first_name, last_name, role),
            customer:customers(id, first_name, last_name, phone, email),
            services:appointment_services(
                id,
                price_at_booking,
                session_number,
                session_plan_id,
                session_plans(id, total_sessions, completed_sessions, package_total_price, paid_amount, payment_mode, recommended_interval_days, next_recommended_date),
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

export async function getPendingSessionPlans() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return [];

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();
    if (bizError || !businessUser?.business_id) return [];

    const { data: rawData, error } = await supabase
        .from("session_plans")
        .select(`
            id,
            total_sessions,
            completed_sessions,
            next_recommended_date,
            customer:customers(id, first_name, last_name, phone),
            service:services(id, name, duration_minutes),
            appointment_services (
                appointment:appointments (
                    status
                )
            )
        `)
        .eq("business_id", businessUser.business_id)
        .eq("status", "active")
        .not("next_recommended_date", "is", null);

    if (error) {
        console.error("Bekleyen seanslar çekilirken hata:", error.message);
        return [];
    }

    // Yalnızca ileriye dönük aktif bir randevusu (scheduled / checked_in) BULUNMAYAN paketleri öneri olarak göster
    const plansToDisplay = (rawData || []).filter(plan => {
        const hasUpcomingAppointment = plan.appointment_services?.some((as: any) => {
            const status = as.appointment?.status;
            return status === 'scheduled' || status === 'checked_in';
        });
        return !hasUpcomingAppointment; // Gelecekte bir randevusu yoksa önerilerde kalsın
    });

    return plansToDisplay;
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

    revalidatePath("/randevular");
    revalidatePath("/musteriler");
    revalidatePath("/paket-seans");
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

    revalidatePath("/randevular");
    revalidatePath("/musteriler");
    return { success: true };
}
