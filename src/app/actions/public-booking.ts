"use server";

import { createAdminClient } from "@/utils/supabase/server";

/**
 * 1. GET PUBLIC BUSINESS PROFILE
 * Fetch business data using the unique slug. Includes settings.
 */
export async function getPublicBusinessProfile(slug: string) {
    const supabase = await createAdminClient();
    
    // Auth bypass is NOT needed here if RLS allows public read for businesses, 
    // BUT we might want to ensure we get specific non-sensitive fields.
    const { data: business, error } = await supabase
        .from('businesses')
        .select('id, name, slug, booking_settings, created_at')
        .eq('slug', slug)
        .single();
        
    if (error || !business) {
        return { success: false, error: "İşletme bulunamadı veya çevrimiçi randevu kabul etmiyor." };
    }
    
    return { success: true, data: business };
}

/**
 * 2. GET PUBLIC SERVICES
 * Fetch active services for a public business without auth requirement.
 */
export async function getPublicServices(businessId: string) {
    const supabase = await createAdminClient();
    
    const { data: services, error } = await supabase
        .from('services')
        .select(`
            id, 
            name, 
            category_id,
            duration_minutes, 
            price, 
            description,
            service_categories!inner (
                id, 
                name, 
                color_code, 
                icon
            )
        `)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
        
    if (error) return { success: false, error: error.message };
    
    return { success: true, data: services };
}

/**
 * 3. GET PUBLIC STAFF FOR SERVICE
 * Fetch staff that can perform a specific service.
 */
export async function getPublicStaffForService(businessId: string, serviceId: string) {
    const supabase = await createAdminClient();
    
    const { data: staffServices, error } = await supabase
        .from('staff_services')
        .select(`
            staff:staff (
                id,
                first_name,
                last_name,
                role,
                is_active
            )
        `)
        .eq('business_id', businessId)
        .eq('service_id', serviceId);
        
    if (error) return { success: false, error: error.message };
    
    // Filter out inactive staff
    const activeStaff = staffServices
        .map((ss: any) => ss.staff)
        .filter((s:any) => s && s.is_active);
        
    return { success: true, data: activeStaff };
}

/**
 * 4. GET PUBLIC AVAILABILITY
 * Complex logic to find available slots for a given date, service and (optional) staff.
 * MVP: Dummy array for now, we will hook it up to real logic later in 4B.
 */
export async function getPublicAvailability(businessId: string, dateStr: string, serviceId: string, staffId: string | null = null) {
    // 09:00 - 18:00 arası dummy saatler
    const slots = [
        { time: "09:00", available: true },
        { time: "10:00", available: true },
        { time: "11:00", available: false },
        { time: "13:30", available: true },
        { time: "14:30", available: true },
        { time: "16:00", available: true },
    ];
    return { success: true, data: slots };
}

/**
 * 5. CREATE PUBLIC BOOKING
 */
export async function createPublicBooking(
    businessId: string,
    serviceId: string,
    staffId: string | 'any',
    dateStr: string,
    timeStr: string,
    customerInfo: { firstName: string, lastName: string, phone: string },
    otpCode?: string
) {
    const supabase = await createAdminClient();

    // 1. İşletme kurallarını çek
    const { data: business } = await supabase.from("businesses").select("booking_settings").eq("id", businessId).single();
    if (!business) return { success: false, error: "İşletme bulunamadı." };

    const requireOtp = business.booking_settings?.require_otp === true;

    // 2. OTP Kontrolü
    if (requireOtp) {
        if (!otpCode) return { success: false, error: "Doğrulama kodu gereklidir." };
        // Gerçek OTP kontrolü burada yapılacak (booking_otps tablosu).
        // Şimdilik test amaçlı 123456 kabul edelim.
        if (otpCode !== "123456") {
            return { success: false, error: "Geçersiz doğrulama kodu." };
        }
    }

    // 3. Randevu Ekleme Simülasyonu
    // Burada aslında mevcut "createAppointment" sunucu eylemi benzeri bir işlem yapılacak.
    // Ancak authenticate olmadığımız için bunu service_role (supabase admin) key ile veya
    // anon kullanıcılara izin veren kısıtlı bir table insert policy ile yapmalıyız.
    
    // MVP olarak şu anlık sadece başarılı dönelim
    // await new Promise(r => setTimeout(r, 1000));

    return { success: true, message: "Randevu başarıyla oluşturuldu." };
}

