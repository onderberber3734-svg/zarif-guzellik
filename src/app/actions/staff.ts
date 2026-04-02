"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 1. GET ALL STAFF (List View)
 */
export async function getStaffList() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "İşletme yetkisi bulunamadı." };

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });

    const { data, error } = await supabase
        .from("staff")
        .select(`
            *,
            staff_services (id, service_id),
            staff_time_off (id, start_date, end_date, status),
            appointments (id, status, appointment_date, appointment_time, customers(first_name, last_name, phone))
        `)
        .eq("business_id", biz.business_id)
        .order("created_at", { ascending: true });

    if (error) return { success: false, error: error.message };

    // İşleme: hizmet sayısını hesapla, bugün izinli mi kontrol et, ve şu an işlemde mi (in_progress) kontrol et
    const enrichedData = (data || []).map((s: any) => {
        const isOffToday = s.staff_time_off?.some((off: any) => 
            off.start_date <= todayStr && off.end_date >= todayStr && off.status === 'approved'
        ) || false;

        const currentAppointment = s.appointments?.find((appt: any) => 
            appt.appointment_date === todayStr && ['in_progress', 'checked_in'].includes(appt.status)
        ) || null;

        const isBusyNow = !!currentAppointment;

        return {
            ...s,
            services_count: s.staff_services?.length || 0,
            is_off_today: isOffToday,
            is_busy_now: isBusyNow,
            current_appointment: currentAppointment ? {
                id: currentAppointment.id,
                time: currentAppointment.appointment_time?.substring(0, 5),
                customer_name: `${currentAppointment.customers?.first_name || ''} ${currentAppointment.customers?.last_name || ''}`.trim(),
                customer_phone: currentAppointment.customers?.phone
            } : null,
            // Clean up heavy nested objects
            appointments: undefined 
        };
    });

    return { success: true, data: enrichedData };
}

/**
 * 2. GET STAFF DETAIL
 */
export async function getStaffDetail(staffId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "Biz found" };

    const { data, error } = await supabase
        .from("staff")
        .select(`
            *,
            staff_services (service_id, services(id, name, duration_minutes)),
            staff_time_off (*),
            staff_working_hours (*)
        `)
        .eq("id", staffId)
        .eq("business_id", biz.business_id)
        .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data };
}

/**
 * 3. CREATE STAFF
 */
export async function createStaff(payload: {
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
    role?: 'owner' | 'manager' | 'staff';
    is_active?: boolean;
    service_ids?: string[]; // Seçili hizmetler eklensin mi?
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    const { service_ids, ...staffData } = payload;

    const { data: newStaff, error } = await supabase
        .from("staff")
        .insert([{
            ...staffData,
            business_id: biz.business_id,
            user_id: payload.role === 'owner' ? user.id : null
        }])
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    if (service_ids && service_ids.length > 0 && newStaff) {
        const servicesToInsert = service_ids.map(sid => ({
            business_id: biz.business_id,
            staff_id: newStaff.id,
            service_id: sid
        }));
        await supabase.from("staff_services").insert(servicesToInsert);
    }

    revalidatePath("/personel");
    revalidatePath("/randevu-olustur");
    return { success: true, data: newStaff };
}

/**
 * 4. UPDATE STAFF
 */
export async function updateStaff(staffId: string, payload: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    const { error } = await supabase
        .from("staff")
        .update(payload)
        .eq("id", staffId)
        .eq("business_id", biz.business_id);

    if (error) return { success: false, error: error.message };
    
    revalidatePath("/personel");
    revalidatePath("/randevu-olustur");
    return { success: true };
}

/**
 * 5. TOGGLE STAFF STATUS
 */
export async function toggleStaffStatus(staffId: string, is_active: boolean) {
    return updateStaff(staffId, { is_active });
}

/**
 * 6. UPSERT STAFF SERVICES
 */
export async function upsertStaffServices(staffId: string, serviceIds: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    // Delete existing
    await supabase.from("staff_services").delete().eq("staff_id", staffId).eq("business_id", biz.business_id);

    // Insert new
    if (serviceIds.length > 0) {
        const inserts = serviceIds.map(sid => ({
            business_id: biz.business_id,
            staff_id: staffId,
            service_id: sid
        }));
        const { error } = await supabase.from("staff_services").insert(inserts);
        if (error) return { success: false, error: error.message };
    }

    revalidatePath("/personel");
    revalidatePath("/randevu-olustur");
    return { success: true };
}

/**
 * 7. ADD TIME OFF
 */
export async function addTimeOff(staffId: string, startDate: string, endDate: string, reason?: string) {
    if (startDate > endDate) {
        return { success: false, error: "Başlangıç tarihi bitiş tarihinden büyük olamaz." };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    // Çakışma kontrolü
    const { data: overlaps, error: overlapErr } = await supabase
        .from("staff_time_off")
        .select("id")
        .eq("staff_id", staffId)
        .eq("business_id", biz.business_id)
        .lte("start_date", endDate)
        .gte("end_date", startDate);

    if (overlapErr) return { success: false, error: overlapErr.message };
    if (overlaps && overlaps.length > 0) {
        return { success: false, error: "Bu tarih aralığı, personelin mevcut başka bir izniyle çakışıyor." };
    }

    const { error } = await supabase
        .from("staff_time_off")
        .insert([{
            business_id: biz.business_id,
            staff_id: staffId,
            start_date: startDate,
            end_date: endDate,
            reason: reason || null,
            status: 'approved'
        }]);

    if (error) return { success: false, error: error.message };

    revalidatePath("/personel");
    return { success: true };
}

/**
 * 8. DELETE TIME OFF
 */
export async function deleteTimeOff(timeOffId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    const { error } = await supabase
        .from("staff_time_off")
        .delete()
        .eq("id", timeOffId)
        .eq("business_id", biz.business_id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/personel");
    return { success: true };
}

/**
 * 9. REASSIGN FUTURE APPOINTMENTS (Bulk)
 */
export async function reassignFutureAppointments(oldStaffId: string, newStaffId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }); // YYYY-MM-DD

    // 1. Yeni personelin yapabildiği hizmetleri al
    const { data: newStaffServicesObj } = await supabase
        .from("staff_services")
        .select("service_id")
        .eq("staff_id", newStaffId)
        .eq("business_id", biz.business_id);
    
    // 2. Yeni personelin izinlerini al
    const { data: newStaffTimeOff } = await supabase
        .from("staff_time_off")
        .select("start_date, end_date")
        .eq("staff_id", newStaffId)
        .eq("business_id", biz.business_id)
        .gte("end_date", todayStr);

    // 3. Eski personelin uygun (gelecekte, scheduled vs) randevularını bul
    const { data: oldAppointments } = await supabase
        .from("appointments")
        .select(`
            id,
            appointment_date,
            appointment_time,
            total_duration_minutes,
            appointment_services (
                service_id
            )
        `)
        .eq("staff_id", oldStaffId)
        .eq("business_id", biz.business_id)
        .gte("appointment_date", todayStr)
        .in("status", ["scheduled", "checked_in", "in_progress"]);

    if (!oldAppointments || oldAppointments.length === 0) {
        return { success: true, count: 0, message: "Taşınacak randevu bulunamadı." };
    }

    const newStaffServiceSet = new Set((newStaffServicesObj || []).map((s: any) => s.service_id));
    
    // 4. Yeni personelin zaten var olan kendi randevularını al (Çakışma testi için)
    const { data: newStaffAppointments } = await supabase
        .from("appointments")
        .select("appointment_date, appointment_time, total_duration_minutes")
        .eq("staff_id", newStaffId)
        .eq("business_id", biz.business_id)
        .gte("appointment_date", todayStr)
        .in("status", ["scheduled", "checked_in", "in_progress"]);

    let movedCount = 0;
    const errors: string[] = [];

    // Transfer kontrol mekanizması
    for (const appt of oldAppointments) {
        const apptDate = appt.appointment_date;
        
        // Kural A: İzin kontrolü
        const isOff = newStaffTimeOff?.some(off => apptDate >= off.start_date && apptDate <= off.end_date);
        if (isOff) {
            errors.push(`${apptDate} tarihinde yeni personel izinli (Randevu ID: ${appt.id.substring(0,8)}).`);
            continue;
        }

        // Kural B: Hizmet yetkinliği kontrolü
        const hasSkill = appt.appointment_services?.every((s: any) => newStaffServiceSet.has(s.service_id));
        if (!hasSkill) {
            errors.push(`Randevu ID ${appt.id.substring(0,8)} içindeki hizmetleri yeni personel veremiyor.`);
            continue;
        }

        // Kural C: Çakışma kontrolü (Basit check: saatler örtüşüyor mu?)
        const startA = new Date(`${apptDate}T${appt.appointment_time}`).getTime();
        const endA = startA + (appt.total_duration_minutes * 60000);

        const hasConflict = newStaffAppointments?.some((na: any) => {
            if (na.appointment_date !== apptDate) return false;
            const startB = new Date(`${na.appointment_date}T${na.appointment_time}`).getTime();
            const endB = startB + (na.total_duration_minutes * 60000);
            return (startA < endB && endA > startB);
        });

        if (hasConflict) {
            errors.push(`Randevu ID ${appt.id.substring(0,8)} yeni personelin mevcut randevusuyla çakışıyor.`);
            continue;
        }

        // Eğer buraya indiyse, güvenlidir, taşıyalım
        const { error: updErr } = await supabase
            .from("appointments")
            .update({ staff_id: newStaffId })
            .eq("id", appt.id);
        
        if (!updErr) {
            movedCount++;
            // newStaffAppointments array'ine ekle ki sıradaki loop checkinde kaza olmasın
            newStaffAppointments?.push({
                appointment_date: appt.appointment_date,
                appointment_time: appt.appointment_time,
                total_duration_minutes: appt.total_duration_minutes
            });
        }
    }

    revalidatePath("/randevular");
    revalidatePath("/personel");
    
    return { 
        success: true, 
        count: movedCount, 
        message: `${movedCount} randevu başarıyla taşındı. ${errors.length > 0 ? errors.length + ' adet randevu kurallara uymadığından atlandı.' : ''}`,
        errors 
    };
}


/**
 * 10. ELIGIBILITY HELPER (Randevu Ekranında kullanılacak)
 */
export async function getEligibleStaffForService(payload: {
    serviceIds: string[];
    appointmentDate: string; // YYYY-MM-DD
    appointmentTime: string; // HH:mm
    totalDurationMinutes: number;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    const { serviceIds, appointmentDate, appointmentTime, totalDurationMinutes } = payload;

    // 1. Tüm aktif personelleri ve onların yapabildiği hizmetleri al
    const { data: activeStaff } = await supabase
        .from("staff")
        .select(`
            id,
            first_name,
            last_name,
            role,
            staff_services (service_id)
        `)
        .eq("is_active", true)
        .eq("business_id", biz.business_id);

    if (!activeStaff || activeStaff.length === 0) return { success: true, data: [] };

    // 2. Filtre: İzinli olanları elemek için izinleri çek
    const { data: timeOffs } = await supabase
        .from("staff_time_off")
        .select("staff_id")
        .eq("business_id", biz.business_id)
        .in("status", ["approved"])
        .lte("start_date", appointmentDate)
        .gte("end_date", appointmentDate);

    // 3. Filtre: Aynı saate çakışan randevusu olanları elemek için randevuları çek
    const { data: existingAppts } = await supabase
        .from("appointments")
        .select("staff_id, appointment_time, total_duration_minutes")
        .eq("business_id", biz.business_id)
        .eq("appointment_date", appointmentDate)
        .in("status", ["scheduled", "checked_in", "in_progress"]);

    // 4. Filtre: Çalışma saatleri
    const reqDateObj = new Date(appointmentDate);
    const dayOfWeek = reqDateObj.getDay();

    const { data: allWorkingHours } = await supabase
        .from("staff_working_hours")
        .select("*")
        .eq("business_id", biz.business_id)
        .eq("day_of_week", dayOfWeek);

    const reqStart = new Date(`${appointmentDate}T${appointmentTime}`).getTime();
    const reqEnd = reqStart + (totalDurationMinutes * 60000);

    const timeToMins = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    };
    const reqStartMins = timeToMins(appointmentTime);
    const reqEndMins = reqStartMins + totalDurationMinutes;

    const busyStaffSet = new Set<string>();
    existingAppts?.forEach(appt => {
        // Çakışma var mı?
        const apptStart = new Date(`${appointmentDate}T${appt.appointment_time}`).getTime();
        const apptEnd = apptStart + ((appt.total_duration_minutes || 0) * 60000);

        if (reqStart < apptEnd && reqEnd > apptStart) {
            busyStaffSet.add(appt.staff_id);
        }
    });

    // Herkesin yetkinlik durmunu değerlendir
    const resultStaff = activeStaff.map(s => {
        const staffSkills = new Set(s.staff_services?.map(ss => ss.service_id) || []);
        const hasSkill = serviceIds.every(sid => staffSkills.has(sid));
        
        let isEligible = true;
        let ineligibleReason = "";

        if (!hasSkill) {
            isEligible = false;
            ineligibleReason = "Bu hizmeti yapmıyor";
            return { id: s.id, first_name: s.first_name, last_name: s.last_name, name: `${s.first_name} ${s.last_name}`, role: s.role, isEligible, ineligibleReason };
        }

        // İzin kontrolü
        const isOff = timeOffs?.some(t => t.staff_id === s.id);
        if (isOff) {
            isEligible = false;
            ineligibleReason = "İzinli";
            return { id: s.id, first_name: s.first_name, last_name: s.last_name, name: `${s.first_name} ${s.last_name}`, role: s.role, isEligible, ineligibleReason };
        }

        // Çakışma kontrolü
        const isBusy = Array.from(busyStaffSet).includes(s.id);
        if (isBusy) {
            isEligible = false;
            ineligibleReason = "Dolu (Randevusu var)";
            return { id: s.id, first_name: s.first_name, last_name: s.last_name, name: `${s.first_name} ${s.last_name}`, role: s.role, isEligible, ineligibleReason };
        }

        // Çalışma Saatleri Kontrolü
        const workingHour = allWorkingHours?.find(h => h.staff_id === s.id);
        if (workingHour) {
            if (workingHour.is_closed) {
                isEligible = false;
                ineligibleReason = "Bugün çalışmıyor";
                return { id: s.id, first_name: s.first_name, last_name: s.last_name, name: `${s.first_name} ${s.last_name}`, role: s.role, isEligible, ineligibleReason };
            }
            if (workingHour.start_time && workingHour.end_time) {
                const shiftStart = timeToMins(workingHour.start_time);
                const shiftEnd = timeToMins(workingHour.end_time);
                if (reqStartMins < shiftStart || reqEndMins > shiftEnd) {
                    isEligible = false;
                    ineligibleReason = "Mesai saati dışında";
                    return { id: s.id, first_name: s.first_name, last_name: s.last_name, name: `${s.first_name} ${s.last_name}`, role: s.role, isEligible, ineligibleReason };
                }
            }
            if (workingHour.break_start && workingHour.break_end) {
                const breakStart = timeToMins(workingHour.break_start);
                const breakEnd = timeToMins(workingHour.break_end);
                if (reqStartMins < breakEnd && reqEndMins > breakStart) {
                    isEligible = false;
                    ineligibleReason = "Mola saatinde";
                    return { id: s.id, first_name: s.first_name, last_name: s.last_name, name: `${s.first_name} ${s.last_name}`, role: s.role, isEligible, ineligibleReason };
                }
            }
        }

        return { id: s.id, first_name: s.first_name, last_name: s.last_name, name: `${s.first_name} ${s.last_name}`, role: s.role, isEligible, ineligibleReason };
    });

    return { 
        success: true, 
        data: resultStaff
    };
}

/**
 * 11. DELETE STAFF (Hard Delete)
 */
export async function deleteStaff(staffId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    // Güvenlik: Gelecekte randevusu var mı?
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const { data: futureAppts } = await supabase
        .from("appointments")
        .select("id")
        .eq("staff_id", staffId)
        .eq("business_id", biz.business_id)
        .gte("appointment_date", todayStr)
        .in("status", ["scheduled", "checked_in"])
        .limit(1);

    if (futureAppts && futureAppts.length > 0) {
        return { success: false, error: "Bu personelin gelecekte aktif randevuları var. Önce randevuları devredin veya iptal edin." };
    }

    const { error } = await supabase
        .from("staff")
        .delete()
        .eq("id", staffId)
        .eq("business_id", biz.business_id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/personel");
    revalidatePath("/randevu-olustur");
    return { success: true };
}

/**
 * 12. UPSERT STAFF WORKING HOURS
 */
export async function upsertStaffWorkingHours(staffId: string, hours: {
    day_of_week: number;
    is_closed: boolean;
    start_time?: string;
    end_time?: string;
    break_start?: string;
    break_end?: string;
}[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    // Mevcut kayıtları sil ve yenilerini ekle
    await supabase
        .from("staff_working_hours")
        .delete()
        .eq("staff_id", staffId)
        .eq("business_id", biz.business_id);

    const inserts = hours.map(h => ({
        business_id: biz.business_id,
        staff_id: staffId,
        day_of_week: h.day_of_week,
        is_closed: h.is_closed,
        start_time: h.is_closed ? null : (h.start_time || null),
        end_time: h.is_closed ? null : (h.end_time || null),
        break_start: h.is_closed ? null : (h.break_start || null),
        break_end: h.is_closed ? null : (h.break_end || null),
    }));

    if (inserts.length > 0) {
        const { error } = await supabase.from("staff_working_hours").insert(inserts);
        if (error) return { success: false, error: error.message };
    }

    revalidatePath("/personel");
    revalidatePath("/randevu-olustur");
    return { success: true };
}

/**
 * 13. GET STAFF FUTURE APPOINTMENTS LIST
 * Get future appointments of a staff member for individual reassignment
 */
export async function getStaffFutureAppointmentsList(staffId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const { data, error } = await supabase
        .from("appointments")
        .select(`
            id,
            appointment_date,
            appointment_time,
            total_duration_minutes,
            status,
            customer_id,
            customers (first_name, last_name, phone),
            appointment_services (service_id)
        `)
        .eq("business_id", biz.business_id)
        .eq("staff_id", staffId)
        .gte("appointment_date", todayStr)
        .in("status", ["scheduled", "checked_in", "in_progress"])
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

    if (error) return { success: false, error: error.message };

    return { success: true, data: data || [] };
}

/**
 * 14. REASSIGN SINGLE APPOINTMENT
 */
export async function reassignSingleAppointment(appointmentId: string, newStaffId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: biz } = await supabase.from("business_users").select("business_id").eq("user_id", user.id).single();
    if (!biz) return { success: false, error: "No business" };

    const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select(`
            id,
            appointment_date,
            appointment_time,
            total_duration_minutes,
            appointment_services (service_id)
        `)
        .eq("id", appointmentId)
        .eq("business_id", biz.business_id)
        .single();

    if (appointmentError || !appointment) {
        return { success: false, error: "Randevu bulunamadı." };
    }

    const serviceIds = (appointment.appointment_services || []).map((item: any) => item.service_id).filter(Boolean);
    const eligibility = await getEligibleStaffForService({
        serviceIds,
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        totalDurationMinutes: appointment.total_duration_minutes || 0
    });

    if (!eligibility.success) {
        return { success: false, error: eligibility.error || "Personel uygunluğu doğrulanamadı." };
    }

    const selectedStaff = (eligibility.data || []).find((staff: any) => staff.id === newStaffId);
    if (!selectedStaff) {
        return { success: false, error: "Seçilen personel bulunamadı." };
    }

    if (!selectedStaff.isEligible) {
        return { success: false, error: selectedStaff.ineligibleReason || "Seçilen personel bu randevu için uygun değil." };
    }

    const { error } = await supabase
        .from("appointments")
        .update({ staff_id: newStaffId })
        .eq("id", appointmentId)
        .eq("business_id", biz.business_id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/personel");
    revalidatePath("/randevular");
    return { success: true };
}
