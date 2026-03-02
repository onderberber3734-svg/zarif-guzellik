"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Hizmetleri Getirme (Read)
export async function getServices() {
    const supabase = await createClient();

    // RLS sayesinde, veritabanı zaten sadece giriş yapan kullanıcının işletmesine (business_id) ait verileri döndürecektir.
    const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Hizmetler çekilirken hata oluştu:", error.message);
        return [];
    }

    return data || [];
}

// 2. Yeni Hizmet Ekleme (Create)
export async function addService(serviceData: {
    name: string;
    category?: string;
    duration_minutes: number;
    price: number;
    description?: string;
    icon?: string;
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

    // Adım 3: Hizmeti Veritabanına Yazma
    const { data, error } = await supabase
        .from("services")
        .insert([
            {
                business_id: businessUser.business_id, // Çok kritik: Hangi şubeye ekleniyor?
                name: serviceData.name,
                category: serviceData.category || "Yapay Zeka Atanacak",
                duration_minutes: serviceData.duration_minutes,
                price: serviceData.price,
                description: serviceData.description,
                icon: serviceData.icon || "auto_awesome",
                is_active: true
            }
        ])
        .select()
        .single();

    if (error) {
        console.error("Kayıt hatası:", error.message);
        return { success: false, error: error.message };
    }

    // Next.js Cache Temizleme
    revalidatePath("/(dashboard)/hizmetler", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");

    return { success: true, data };
}

// 3. Hizmeti Güncelleme (Update)
export async function updateService(
    serviceId: string | number,
    updateData: {
        name?: string;
        category?: string;
        duration_minutes?: number;
        price?: number;
        description?: string;
        icon?: string;
        is_active?: boolean;
    }
) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "İşlem yapmak için oturum açmalısınız. Detay: " + (authError?.message || "User bulunamadı") };
    }

    const { data, error } = await supabase
        .from("services")
        .update(updateData)
        .eq("id", serviceId)
        .select()
        .single();

    if (error) {
        console.error("Güncelleme hatası:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath("/(dashboard)/hizmetler", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");
    return { success: true, data };
}

// 4. Hizmet Silme (Delete)
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
