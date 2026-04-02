"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/server-admin";

export async function signUp(formData: { email: string; password: string; firstName: string; lastName: string; businessName?: string }) {
    const supabase = await createClient();

    // Supabase Hata Mesajlarını Türkçeleştirme
    const translateAuthError = (message: string) => {
        if (!message) return "Bilinmeyen bir hata oluştu.";
        const msg = message.toLowerCase();

        if (msg.includes("rate limit") || msg.includes("too many requests")) return "Çok fazla deneme yaptınız. Lütfen biraz bekleyip (yaklaşık 1 dakika) tekrar deneyiniz.";
        if (msg.includes("invalid login credentials")) return "E-posta adresiniz veya şifreniz hatalı. Lütfen kontrol edin.";
        if (msg.includes("user already registered")) return "Bu e-posta adresi ile sisteme zaten kayıtlı bir hesap bulunuyor.";
        if (msg.includes("password should be at least 6 characters")) return "Güvenliğiniz için şifreniz en az 6 karakterden oluşmalıdır.";
        if (msg.includes("invalid email")) return "Lütfen geçerli bir e-posta adresi giriniz.";
        if (msg.includes("email not confirmed")) return "E-posta adresiniz henüz onaylanmamış. Lütfen e-posta kutunuzu kontrol edin veya Supabase ayarlarından email onayını kapatın.";

        return message; // Eşleşmeyenleri orijinal haliyle bırak
    };

    // 1. Supabase Auth Kaydı (Bu işlem kullanıcıyı auth.users tablosuna atar)
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
            data: {
                first_name: formData.firstName,
                last_name: formData.lastName,
                full_name: `${formData.firstName} ${formData.lastName}`
            }
        }
    });

    if (authError || !authData.user) {
        return { error: authError ? translateAuthError(authError.message) : "Kayıt işlemi başarısız oldu." };
    }

    const userId = authData.user.id;

    // 2. İşletme Oluşturma ve İlişkilendirmeyi "SÜPER YETKİLİ (SERVICE_ROLE)" ile yap.
    // Çünkü şu an kullanıcının sisteme yazma yetkisi (RLS) kısıtlıdır. Sadece Admin yazabilir.
    const adminSupabase = createAdminClient();

    // İşletme adını geçici olarak ad soyad üzerinden oluşturuyoruz veya gelen bilgiyi kullanıyoruz.
    const tempBusinessName = formData.businessName || `${formData.firstName} ${formData.lastName} İşletmesi`;

    const { data: businessData, error: bizError } = await adminSupabase
        .from("businesses")
        .insert([{ name: tempBusinessName }])
        .select()
        .single(); // Oluşan kaydı döndürür ki business_id'yi alalım.

    if (bizError || !businessData) {
        // Atomic işlem bozuldu! Kullanıcı açıldı ama işletme kurulamadı. Rollback yapılabilir:
        return { error: "Kullanıcı oluşturuldu ancak işletme tablosuna kayıt başarısız oldu: " + bizError?.message };
    }

    const businessId = businessData.id;

    // 3. İlişkilendirme: İşletme <-> Kullanıcı Bağlantısını Kurma (Owner Yetkisiyle)
    const { error: relationError } = await adminSupabase
        .from("business_users")
        .insert([{
            business_id: businessId,
            user_id: userId,
            role: "owner"
        }]);

    if (relationError) {
        return { error: "Yetkilendirme sırasında hata oluştu: " + relationError.message };
    }

    // 4. Varsayılan Hizmetleri (Seed) Oluşturma
    // Yeni bir işletme açıldığında boş bir ekran görmemesi için sektör standartlarında başlangıç verileri ekleyelim.
    const defaultServices = [
        {
            business_id: businessId,
            name: "Lazer Epilasyon (Tüm Vücut)",
            category: "Lazer & Epilasyon",
            duration_minutes: 60,
            price: 1500,
            description: "Diod buz lazer teknolojisi ile acısız tüm vücut epilasyon seansı.",
            icon: "wb_incandescent",
            is_active: true
        },
        {
            business_id: businessId,
            name: "Medikal Cilt Bakımı",
            category: "Cilt Bakımı",
            duration_minutes: 45,
            price: 850,
            description: "Derinlemesine temizlik ve vitamin serumları ile profesyonel cilt yenileme.",
            icon: "face",
            is_active: true
        },
        {
            business_id: businessId,
            name: "Kaş Tasarımı & Alım",
            category: "Yüz & Kaş",
            duration_minutes: 20,
            price: 250,
            description: "Altın oran kaş alımı ve yüz tipinize uygun modern tasarım.",
            icon: "brush",
            is_active: true
        },
        {
            business_id: businessId,
            name: "Kalıcı Oje & Manikür",
            category: "El & Ayak",
            duration_minutes: 45,
            price: 500,
            description: "Kuru manikür işlemi ve detaylı kalıcı oje uygulaması.",
            icon: "dry_cleaning",
            is_active: true
        },
        {
            business_id: businessId,
            name: "Keratin Bakım",
            category: "Saç Tasarımı",
            duration_minutes: 90,
            price: 1200,
            description: "Saçları besleyen ve elektriklenmeyi önleyen profesyonel keratin yüklemesi.",
            icon: "water_drop",
            is_active: true
        }
    ];

    await adminSupabase.from("services").insert(defaultServices);

    return { success: true, user: authData.user, business: businessData };
}

export async function signIn(formData: { email: string; password: string }) {
    const supabase = await createClient();

    // Supabase Hata Mesajlarını Türkçeleştirme
    const translateAuthError = (message: string) => {
        if (!message) return "Bilinmeyen bir hata oluştu.";
        const msg = message.toLowerCase();

        if (msg.includes("rate limit") || msg.includes("too many requests")) return "Çok fazla deneme yaptınız. Lütfen biraz bekleyip (yaklaşık 1 dakika) tekrar deneyiniz.";
        if (msg.includes("invalid login credentials")) return "E-posta adresiniz veya şifreniz hatalı. Lütfen kontrol edin.";
        if (msg.includes("user already registered")) return "Bu e-posta adresi ile sisteme zaten kayıtlı bir hesap bulunuyor.";
        if (msg.includes("password should be at least 6 characters")) return "Güvenliğiniz için şifreniz en az 6 karakterden oluşmalıdır.";
        if (msg.includes("invalid email")) return "Lütfen geçerli bir e-posta adresi giriniz.";
        if (msg.includes("email not confirmed")) return "E-posta adresiniz henüz onaylanmamış. Lütfen e-posta kutunuzu kontrol edin veya Supabase ayarlarından email onayını kapatın.";

        return message;
    };

    // Sadece email ve şifre ile güvenli oturum açma (JWT Cookie olarak inecektir)
    const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
    });

    if (error) {
        return { error: translateAuthError(error.message) };
    }

    return { success: true, user: data.user };
}

export async function logOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
}

export async function updateUserProfile(data: { fullName: string }) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
        data: { full_name: data.fullName }
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
}
