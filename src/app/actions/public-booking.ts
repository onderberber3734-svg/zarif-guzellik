"use server";

import { createAdminClient } from "@/utils/supabase/server-admin";

const ACTIVE_BOOKING_STATUSES = ["scheduled", "checked_in", "in_progress"];
const ISTANBUL_TZ = "Europe/Istanbul";

type StaffWorkingHoursRow = {
    staff_id: string;
    day_of_week: number;
    is_closed: boolean;
    start_time?: string | null;
    end_time?: string | null;
    break_start?: string | null;
    break_end?: string | null;
};

function getIstanbulParts(date: Date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: ISTANBUL_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);

    const get = (type: string) => parts.find((part) => part.type === type)?.value || "00";

    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: Number(get("hour")),
        minute: Number(get("minute"))
    };
}

function getTodayInIstanbul() {
    const parts = getIstanbulParts(new Date());
    return `${parts.year}-${parts.month}-${parts.day}`;
}

function timeToMinutes(timeValue?: string | null) {
    if (!timeValue) return 0;
    const [hours, minutes] = timeValue.substring(0, 5).split(":").map(Number);
    return (hours * 60) + minutes;
}

function minutesToTime(totalMinutes: number) {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
}

function getDayOfWeek(dateStr: string) {
    return new Date(`${dateStr}T12:00:00+03:00`).getUTCDay();
}

function normalizePhone(phone: string) {
    return phone.replace(/\D/g, "");
}

async function getPublicBusinessBySlug(supabase: any, slug: string) {
    const { data: business, error } = await supabase
        .from("businesses")
        .select("id, name, slug, booking_settings, created_at")
        .eq("slug", slug)
        .maybeSingle();

    if (error || !business) {
        return null;
    }

    return business;
}

async function getBookingContext(
    supabase: any,
    businessId: string,
    dateStr: string,
    serviceId: string,
    requestedStaffId?: string | null
) {
    const dayOfWeek = getDayOfWeek(dateStr);

    let staffQuery = supabase
        .from("staff")
        .select("id, first_name, last_name, role, is_active, staff_services(service_id)")
        .eq("business_id", businessId)
        .eq("is_active", true);

    if (requestedStaffId) {
        staffQuery = staffQuery.eq("id", requestedStaffId);
    }

    const [serviceResult, hoursResult, staffResult] = await Promise.all([
        supabase
            .from("services")
            .select("id, business_id, name, duration_minutes, price, is_active, service_type")
            .eq("id", serviceId)
            .eq("business_id", businessId)
            .eq("is_active", true)
            .maybeSingle(),
        supabase
            .from("business_working_hours")
            .select("day_of_week, is_closed, start_time, end_time, break_start, break_end")
            .eq("business_id", businessId)
            .eq("day_of_week", dayOfWeek)
            .maybeSingle(),
        staffQuery
    ]);

    const service = serviceResult.data;
    const workingHours = hoursResult.data;
    const staffList = staffResult.data || [];

    if (!service || service.service_type === "package") {
        return { error: "Bu hizmet online rezervasyona uygun degil." };
    }

    const eligibleStaff = staffList.filter((staff: any) => {
        const skills = new Set((staff.staff_services || []).map((item: any) => item.service_id));
        return skills.has(serviceId);
    });

    const staffIds = eligibleStaff.map((staff: any) => staff.id);

    const [timeOffResult, appointmentsResult, staffWorkingHoursResult] = await Promise.all([
        staffIds.length > 0
            ? supabase
                .from("staff_time_off")
                .select("staff_id, start_date, end_date")
                .eq("business_id", businessId)
                .in("staff_id", staffIds)
                .eq("status", "approved")
                .lte("start_date", dateStr)
                .gte("end_date", dateStr)
            : Promise.resolve({ data: [] }),
        supabase
            .from("appointments")
            .select("id, staff_id, appointment_time, total_duration_minutes")
            .eq("business_id", businessId)
            .eq("appointment_date", dateStr)
            .in("status", ACTIVE_BOOKING_STATUSES),
        staffIds.length > 0
            ? supabase
                .from("staff_working_hours")
                .select("staff_id, day_of_week, is_closed, start_time, end_time, break_start, break_end")
                .eq("business_id", businessId)
                .eq("day_of_week", dayOfWeek)
                .in("staff_id", staffIds)
            : Promise.resolve({ data: [] })
    ]);

    return {
        service,
        workingHours,
        eligibleStaff,
        timeOffs: timeOffResult.data || [],
        appointments: appointmentsResult.data || [],
        staffWorkingHours: staffWorkingHoursResult.data || []
    };
}

function buildAvailabilitySlots(context: any, dateStr: string) {
    if (!context.service || !context.workingHours || context.workingHours.is_closed) {
        return [];
    }

    const duration = Number(context.service.duration_minutes) || 30;
    const shiftStart = timeToMinutes(context.workingHours.start_time);
    const shiftEnd = timeToMinutes(context.workingHours.end_time);
    const breakStart = context.workingHours.break_start ? timeToMinutes(context.workingHours.break_start) : null;
    const breakEnd = context.workingHours.break_end ? timeToMinutes(context.workingHours.break_end) : null;
    const todayStr = getTodayInIstanbul();
    const nowParts = getIstanbulParts(new Date());
    const nowMinutes = (nowParts.hour * 60) + nowParts.minute;

    const timeOffStaffIds = new Set((context.timeOffs || []).map((item: any) => item.staff_id));
    const workingHoursByStaff = new Map<string, StaffWorkingHoursRow>(
        (context.staffWorkingHours || []).map((item: StaffWorkingHoursRow) => [item.staff_id, item])
    );

    const slots = [];
    for (let slotStart = shiftStart; slotStart + duration <= shiftEnd; slotStart += 30) {
        if (breakStart !== null && breakEnd !== null && slotStart < breakEnd && (slotStart + duration) > breakStart) {
            continue;
        }

        if (dateStr === todayStr && slotStart <= nowMinutes + 60) {
            continue;
        }

        let availableStaffIds: string[] = [];
        if ((context.eligibleStaff || []).length === 0) {
            availableStaffIds = ["unassigned"];
        } else {
            availableStaffIds = context.eligibleStaff
                .filter((staff: any) => !timeOffStaffIds.has(staff.id))
                .filter((staff: any) => {
                    const staffHours = workingHoursByStaff.get(staff.id);
                    if (!staffHours) return true;
                    if (staffHours.is_closed) return false;

                    if (staffHours.start_time && staffHours.end_time) {
                        const staffStart = timeToMinutes(staffHours.start_time);
                        const staffEnd = timeToMinutes(staffHours.end_time);
                        if (slotStart < staffStart || (slotStart + duration) > staffEnd) {
                            return false;
                        }
                    }

                    if (staffHours.break_start && staffHours.break_end) {
                        const staffBreakStart = timeToMinutes(staffHours.break_start);
                        const staffBreakEnd = timeToMinutes(staffHours.break_end);
                        if (slotStart < staffBreakEnd && (slotStart + duration) > staffBreakStart) {
                            return false;
                        }
                    }

                    return true;
                })
                .filter((staff: any) => {
                    return !(context.appointments || []).some((appointment: any) => {
                        if (appointment.staff_id !== staff.id) return false;
                        const appointmentStart = timeToMinutes(appointment.appointment_time);
                        const appointmentEnd = appointmentStart + (Number(appointment.total_duration_minutes) || 0);
                        return slotStart < appointmentEnd && (slotStart + duration) > appointmentStart;
                    });
                })
                .map((staff: any) => staff.id);
        }

        slots.push({
            time: minutesToTime(slotStart),
            available: availableStaffIds.length > 0,
            available_staff_ids: availableStaffIds
        });
    }

    return slots;
}

export async function getPublicBusinessProfile(slug: string) {
    const supabase = createAdminClient();
    const business = await getPublicBusinessBySlug(supabase, slug);

    if (!business) {
        return { success: false, error: "Isletme bulunamadi veya online rezervasyon kapali." };
    }

    return { success: true, data: business };
}

export async function getPublicServices(businessSlug: string) {
    const supabase = createAdminClient();
    const business = await getPublicBusinessBySlug(supabase, businessSlug);

    if (!business) {
        return { success: false, error: "Isletme bulunamadi." };
    }

    const { data: services, error } = await supabase
        .from("services")
        .select(`
            id,
            name,
            category_id,
            duration_minutes,
            price,
            description,
            service_type,
            service_categories!inner (
                id,
                name,
                color_code,
                icon
            )
        `)
        .eq("business_id", business.id)
        .eq("is_active", true)
        .eq("service_type", "single")
        .order("name");

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: services || [] };
}

export async function getPublicStaffForService(businessSlug: string, serviceId: string) {
    const supabase = createAdminClient();
    const business = await getPublicBusinessBySlug(supabase, businessSlug);

    if (!business) {
        return { success: false, error: "Isletme bulunamadi." };
    }

    const { data: staffServices, error } = await supabase
        .from("staff_services")
        .select(`
            staff:staff (
                id,
                first_name,
                last_name,
                role,
                is_active
            )
        `)
        .eq("business_id", business.id)
        .eq("service_id", serviceId);

    if (error) {
        return { success: false, error: error.message };
    }

    const uniqueStaff = new Map<string, any>();
    for (const item of (staffServices || []) as any[]) {
        if (item.staff?.is_active) {
            uniqueStaff.set(item.staff.id, item.staff);
        }
    }

    return { success: true, data: Array.from(uniqueStaff.values()) };
}

export async function getPublicAvailability(
    businessSlug: string,
    dateStr: string,
    serviceId: string,
    staffId: string | null = null
) {
    const supabase = createAdminClient();
    const business = await getPublicBusinessBySlug(supabase, businessSlug);

    if (!business) {
        return { success: false, error: "Isletme bulunamadi." };
    }

    const context = await getBookingContext(supabase, business.id, dateStr, serviceId, staffId);

    if (context.error) {
        return { success: false, error: context.error };
    }

    return {
        success: true,
        data: buildAvailabilitySlots(context, dateStr)
    };
}

export async function createPublicBooking(
    businessSlug: string,
    serviceId: string,
    staffId: string | "any",
    dateStr: string,
    timeStr: string,
    customerInfo: { firstName: string; lastName: string; phone: string },
    otpCode?: string
) {
    const supabase = createAdminClient();
    const business = await getPublicBusinessBySlug(supabase, businessSlug);

    if (!business) {
        return { success: false, error: "Isletme bulunamadi." };
    }

    const requireOtp = business.booking_settings?.require_otp === true;
    if (requireOtp) {
        if (!otpCode) {
            return { success: false, error: "Dogrulama kodu gerekli." };
        }
        if (otpCode !== "123456") {
            return { success: false, error: "Gecersiz dogrulama kodu." };
        }
    }

    const trimmedFirstName = customerInfo.firstName.trim();
    const trimmedLastName = customerInfo.lastName.trim();
    const normalizedPhone = normalizePhone(customerInfo.phone);

    if (!trimmedFirstName || !trimmedLastName || normalizedPhone.length < 10) {
        return { success: false, error: "Ad, soyad veya telefon bilgisi gecersiz." };
    }

    const requestedStaffId = staffId === "any" ? null : staffId;
    const context = await getBookingContext(supabase, business.id, dateStr, serviceId, requestedStaffId);
    if (context.error) {
        return { success: false, error: context.error };
    }

    const slots = buildAvailabilitySlots(context, dateStr);
    const selectedSlot = slots.find((slot: any) => slot.time === timeStr);

    if (!selectedSlot?.available) {
        return { success: false, error: "Secilen saat artik musait degil." };
    }

    const assignedStaffId =
        requestedStaffId ||
        (selectedSlot.available_staff_ids.find((id: string) => id !== "unassigned") || null);

    const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", business.id)
        .eq("phone", normalizedPhone)
        .limit(1)
        .maybeSingle();

    let customerId = existingCustomer?.id;

    if (!customerId) {
        const { data: newCustomer, error: customerInsertError } = await supabase
            .from("customers")
            .insert({
                business_id: business.id,
                first_name: trimmedFirstName,
                last_name: trimmedLastName,
                phone: normalizedPhone
            })
            .select("id")
            .single();

        if (customerInsertError || !newCustomer) {
            const { data: fallbackCustomer } = await supabase
                .from("customers")
                .select("id")
                .eq("business_id", business.id)
                .eq("phone", normalizedPhone)
                .limit(1)
                .maybeSingle();

            if (!fallbackCustomer?.id) {
                return {
                    success: false,
                    error: customerInsertError?.message || "Musteri kaydi olusturulamadi."
                };
            }

            customerId = fallbackCustomer.id;
        } else {
            customerId = newCustomer.id;
        }
    }

    const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .insert({
            business_id: business.id,
            customer_id: customerId,
            staff_id: assignedStaffId,
            salon_id: null,
            appointment_date: dateStr,
            appointment_time: timeStr,
            status: "scheduled",
            total_duration_minutes: context.service.duration_minutes,
            total_price: context.service.price || 0,
            notes: "Online randevu"
        })
        .select("id")
        .single();

    if (appointmentError || !appointment) {
        return { success: false, error: appointmentError?.message || "Randevu olusturulamadi." };
    }

    const { error: appointmentServiceError } = await supabase
        .from("appointment_services")
        .insert({
            appointment_id: appointment.id,
            service_id: serviceId,
            price_at_booking: context.service.price || 0
        });

    if (appointmentServiceError) {
        await supabase.from("appointments").delete().eq("id", appointment.id);
        return {
            success: false,
            error: appointmentServiceError.message || "Hizmet satiri eklenemedi."
        };
    }

    return {
        success: true,
        message: "Randevu basariyla olusturuldu.",
        data: { appointment_id: appointment.id }
    };
}
