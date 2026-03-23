"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Hizmet Kategorilerini Getirme
export async function getServiceCategories() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Kategoriler çekilirken hata oluştu:", error.message);
        return [];
    }

    return data || [];
}

// 2. Yeni Hizmet Kategorisi Ekleme
export async function addServiceCategory(name: string) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Oturum açmalısınız." };

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (bizError || !businessUser?.business_id) return { success: false, error: "İşletme bulunamadı." };

    const { data, error } = await supabase
        .from("service_categories")
        .insert([{ business_id: businessUser.business_id, name }])
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/(dashboard)/hizmetler", "page");
    return { success: true, data };
}

// 3. Hizmet Kategorisi Güncelleme
export async function updateServiceCategory(id: string, name: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("service_categories")
        .update({ name })
        .eq("id", id)
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/(dashboard)/hizmetler", "page");
    return { success: true, data };
}

// 4. Hizmet Kategorisi Silme
export async function deleteServiceCategory(id: string) {
    const supabase = await createClient();

    // Check if category has services
    const { count, error: countError } = await supabase
        .from("services")
        .select("*", { count: 'exact', head: true })
        .eq("category_id", id);

    if (countError) return { success: false, error: countError.message };
    if (count && count > 0) return { success: false, error: "Bu kategoriye ait hizmetler var. Önce hizmetleri silin veya başka kategoriye taşıyın." };

    const { error } = await supabase
        .from("service_categories")
        .delete()
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/(dashboard)/hizmetler", "page");
    return { success: true };
}

// Standart Katagori ve Hizmetleri Oluşturma (Onboarding İçin)
export async function seedStandardCatalog() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { success: false, error: "Oturum bulunamadı." };

    const { data: businessUser } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (!businessUser?.business_id) return { success: false, error: "İşletme bulunamadı." };

    const businessId = businessUser.business_id;

    // 1. Standart Kategoriler
    const defaultCategories = [
        "Lazer & Epilasyon",
        "Cilt Bakımı",
        "Yüz & Kaş",
        "El & Ayak",
        "Tırnak & El Ayak",
        "Saç Tasarımı",
        "Masaj",
        "Makyaj",
        "Erkek Berber/Tıraş",
        "Genel"
    ];

    const categoryInserts = defaultCategories.map((name, index) => ({
        business_id: businessId,
        name: name,
        sort_order: index
    }));

    const { data: insertedCats, error: catError } = await supabase
        .from("service_categories")
        .insert(categoryInserts)
        .select();

    if (catError || !insertedCats) {
        console.error("Kategoriler eklenirken hata:", catError?.message);
        return { success: false, error: "Kategoriler oluşturulamadı." };
    }

    // 2. Standart Hizmetleri Ekleme (Sadece hiç hizmet yoksa)
    const { count: servicesCount } = await supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId);

    if (servicesCount === 0) {
        const defaultServices = [];

        // Lazer
        const lazerCat = insertedCats.find(c => c.name === "Lazer & Epilasyon");
        if (lazerCat) {
            defaultServices.push({ business_id: businessId, category_id: lazerCat.id, name: "Tüm Vücut Lazer", duration_minutes: 60, price: 1500, icon: "flash_on", is_active: true, service_type: 'single' });
            defaultServices.push({ business_id: businessId, category_id: lazerCat.id, name: "Bölgesel Lazer", duration_minutes: 30, price: 500, icon: "flash_on", is_active: true, service_type: 'single' });
            defaultServices.push({ business_id: businessId, category_id: lazerCat.id, name: "Tüm Vücut Lazer Paketi (8 Seans)", duration_minutes: 60, price: 0, icon: "flash_on", is_active: true, service_type: 'package', default_total_sessions: 8, default_interval_days: 30, default_package_price: 10000 });
        }

        // Cilt Bakımı
        const ciltCat = insertedCats.find(c => c.name === "Cilt Bakımı");
        if (ciltCat) {
            defaultServices.push({ business_id: businessId, category_id: ciltCat.id, name: "Klasik Cilt Bakımı", duration_minutes: 60, price: 800, icon: "face", is_active: true, service_type: 'single' });
            defaultServices.push({ business_id: businessId, category_id: ciltCat.id, name: "Hydrafacial", duration_minutes: 45, price: 1200, icon: "face", is_active: true, service_type: 'single' });
            defaultServices.push({ business_id: businessId, category_id: ciltCat.id, name: "Hydrafacial Paketi (6 Seans)", duration_minutes: 45, price: 0, icon: "face", is_active: true, service_type: 'package', default_total_sessions: 6, default_interval_days: 21, default_package_price: 6000 });
        }

        // Saç
        const sacCat = insertedCats.find(c => c.name === "Saç Tasarımı");
        if (sacCat) {
            defaultServices.push({ business_id: businessId, category_id: sacCat.id, name: "Saç Kesimi", duration_minutes: 30, price: 400, icon: "content_cut", is_active: true });
            defaultServices.push({ business_id: businessId, category_id: sacCat.id, name: "Fön & Şekillendirme", duration_minutes: 30, price: 200, icon: "content_cut", is_active: true });
            defaultServices.push({ business_id: businessId, category_id: sacCat.id, name: "Dip Boya", duration_minutes: 90, price: 800, icon: "content_cut", is_active: true });
        }

        // Tırnak
        const tirnakCat = insertedCats.find(c => c.name === "Tırnak & El Ayak");
        if (tirnakCat) {
            defaultServices.push({ business_id: businessId, category_id: tirnakCat.id, name: "Manikür & Pedikür", duration_minutes: 60, price: 500, icon: "front_hand", is_active: true });
            defaultServices.push({ business_id: businessId, category_id: tirnakCat.id, name: "Kalıcı Oje", duration_minutes: 45, price: 400, icon: "front_hand", is_active: true });
        }

        // Masaj
        const masajCat = insertedCats.find(c => c.name === "Masaj");
        if (masajCat) {
            defaultServices.push({ business_id: businessId, category_id: masajCat.id, name: "İsveç Masajı", duration_minutes: 60, price: 1000, icon: "spa", is_active: true });
            defaultServices.push({ business_id: businessId, category_id: masajCat.id, name: "Medikal Masaj", duration_minutes: 60, price: 1200, icon: "spa", is_active: true });
        }

        if (defaultServices.length > 0) {
            await supabase.from("services").insert(defaultServices);
        }
    }

    return { success: true };
}

// 5. Hizmetleri Getirme (Read) -> Odaya atanma durumunu da getir (salon_services)
export async function getServices() {
    const supabase = await createClient();

    // RLS sayesinde, veritabanı zaten sadece giriş yapan kullanıcının işletmesine (business_id) ait verileri döndürecektir.
    const { data, error } = await supabase
        .from("services")
        .select(`
            *,
            service_categories (id, name),
            salon_services (salon_id),
            staff_services (staff_id)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Hizmetler çekilirken hata oluştu:", error.message);
        return [];
    }

    return data || [];
}

export async function addService(serviceData: {
    name: string;
    category_id?: string;
    category_name?: string;
    duration_minutes: number;
    price: number;
    description?: string;
    icon?: string;
    service_type?: "single" | "package";
    default_total_sessions?: number | null;
    default_interval_days?: number | null;
    default_package_price?: number | null;
    salon_ids?: string[];
    staff_ids?: string[];
}) {
    const supabase = await createClient();

    // Adım 1: Oturum (Session) Kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "İşlem yapmak için oturum açmalısınız. Detay: " + (authError?.message || "User bulunamadı") };
    }

    // Adım 2: İşletme (Tenant) Kontrolü
    // Kullanıcının bağlı olduğu business_id değerini ara tablodan alıyoruz.
    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (bizError || !businessUser?.business_id) {
        return { success: false, error: "Kullanıcıya tanımlı bir işletme (tenant) bulunamadı." };
    }

    let finalCategoryId = serviceData.category_id;

    // Eğer category_id gönderilmemiş ancak category_name gönderilmişse bul veya oluştur
    if (!finalCategoryId && serviceData.category_name) {
        // Kategori var mı?
        const { data: existingCat } = await supabase
            .from("service_categories")
            .select("id")
            .eq("business_id", businessUser.business_id)
            .ilike("name", serviceData.category_name)
            .single();

        if (existingCat) {
            finalCategoryId = existingCat.id;
        } else {
            // Yoksa oluştur
            const { data: newCat } = await supabase
                .from("service_categories")
                .insert([{ business_id: businessUser.business_id, name: serviceData.category_name }])
                .select("id")
                .single();
            if (newCat) finalCategoryId = newCat.id;
        }
    }

    // Adım 3: Hizmeti Veritabanına Yazma
    const { data, error } = await supabase
        .from("services")
        .insert([
            {
                business_id: businessUser.business_id, // Çok kritik: Hangi şubeye ekleniyor?
                name: serviceData.name,
                category_id: finalCategoryId || null,
                duration_minutes: serviceData.duration_minutes,
                price: serviceData.price,
                description: serviceData.description,
                icon: serviceData.icon || "auto_awesome",
                service_type: serviceData.service_type || 'single',
                default_total_sessions: serviceData.default_total_sessions,
                default_interval_days: serviceData.default_interval_days,
                default_package_price: serviceData.default_package_price,
                is_active: true
            }
        ])
        .select()
        .single();

    if (error) {
        console.error("Kayıt hatası:", error.message);
        return { success: false, error: error.message };
    }

    if (data && serviceData.salon_ids && serviceData.salon_ids.length > 0) {
        const salonServicesData = serviceData.salon_ids.map(salonId => ({
            salon_id: salonId,
            service_id: data.id,
            business_id: businessUser.business_id
        }));
        await supabase.from("salon_services").insert(salonServicesData);
        data.salon_services = salonServicesData;
    }

    // Personel ataması
    if (data && serviceData.staff_ids && serviceData.staff_ids.length > 0) {
        const staffServicesData = serviceData.staff_ids.map(staffId => ({
            staff_id: staffId,
            service_id: data.id,
            business_id: businessUser.business_id
        }));
        await supabase.from("staff_services").insert(staffServicesData);
    }

    // Next.js Cache Temizleme
    revalidatePath("/(dashboard)/hizmetler", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");
    revalidatePath("/(dashboard)/salonlar", "page");
    revalidatePath("/(dashboard)/personel", "page");

    return { success: true, data };
}

export async function addMultipleServices(servicesData: any[]) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: "İşlem yapmak için oturum açmalısınız. Detay: " + (authError?.message || "User bulunamadı") };
    }

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (bizError || !businessUser?.business_id) {
        return { success: false, error: "Kullanıcıya tanımlı bir işletme (tenant) bulunamadı." };
    }

    // Assign business_id to all items
    const rowsToInsert = servicesData.map(service => ({
        business_id: businessUser.business_id,
        name: service.name,
        category_id: service.category_id || null,
        duration_minutes: service.duration_minutes || 0,
        price: service.price || 0,
        description: service.description,
        icon: service.icon || "auto_awesome",
        service_type: service.service_type || 'single',
        default_total_sessions: service.default_total_sessions,
        default_interval_days: service.default_interval_days,
        default_package_price: service.default_package_price,
        is_active: true
    }));

    const { data, error } = await supabase
        .from("services")
        .insert(rowsToInsert)
        .select();

    if (error) {
        console.error("Çoklu kayıt hatası:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath("/(dashboard)/hizmetler", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");
    revalidatePath("/(dashboard)/salonlar", "page");

    return { success: true, data };
}

// 7. Hizmeti Güncelleme (Update)
export async function updateService(
    serviceId: string | number,
    updateData: {
        name?: string;
        category_id?: string | null;
        duration_minutes?: number;
        price?: number;
        description?: string;
        icon?: string;
        service_type?: "single" | "package";
        default_total_sessions?: number | null;
        default_interval_days?: number | null;
        default_package_price?: number | null;
        is_active?: boolean;
        salon_ids?: string[];
        staff_ids?: string[];
    }
) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "İşlem yapmak için oturum açmalısınız. Detay: " + (authError?.message || "User bulunamadı") };
    }

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (bizError || !businessUser?.business_id) {
        return { success: false, error: "İşletme yetkiniz bulunamadı." };
    }

    const { salon_ids, staff_ids, ...restUpdateData } = updateData;

    const { data, error } = await supabase
        .from("services")
        .update(restUpdateData)
        .eq("id", serviceId)
        .select()
        .single();

    if (error) {
        console.error("Güncelleme hatası:", error.message);
        return { success: false, error: error.message };
    }

    if (data && salon_ids !== undefined) {
        await supabase.from("salon_services").delete().eq("service_id", data.id);
        if (salon_ids.length > 0) {
            const salonServicesData = salon_ids.map(salonId => ({
                salon_id: salonId,
                service_id: data.id,
                business_id: businessUser.business_id
            }));
            await supabase.from("salon_services").insert(salonServicesData);
        }
    }

    // Personel ataması güncelle
    if (data && staff_ids !== undefined) {
        await supabase.from("staff_services").delete().eq("service_id", data.id);
        if (staff_ids.length > 0) {
            const staffServicesData = staff_ids.map(staffId => ({
                staff_id: staffId,
                service_id: data.id,
                business_id: businessUser.business_id
            }));
            await supabase.from("staff_services").insert(staffServicesData);
        }
    }

    revalidatePath("/(dashboard)/hizmetler", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");
    revalidatePath("/(dashboard)/salonlar", "page");
    revalidatePath("/(dashboard)/personel", "page");

    // Refresh to get the latest salon_services format
    const { data: updatedData } = await supabase
        .from("services")
        .select("*, service_categories(id, name), salon_services(salon_id)")
        .eq("id", data.id)
        .single();

    return { success: true, data: updatedData || data };
}

// 8. Hizmet Silme (Delete)
export async function deleteService(serviceId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);

    if (error) {
        console.error("Silme hatası:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath("/(dashboard)/hizmetler", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");
    return { success: true };
}
