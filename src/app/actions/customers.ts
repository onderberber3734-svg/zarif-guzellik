"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 1. AI ve İstatistik Destekli Müşterileri Getirme (Read)
export async function getCustomersWithStats() {
    const supabase = await createClient();

    // Müşterileri ve ilişkili randevularını çekiyoruz
    const [customersRes, paymentsRes] = await Promise.all([
        supabase
            .from("customers")
            .select(`
                *,
                appointments (
                    id,
                    appointment_date,
                    status,
                    total_price
                ),
                session_plans (
                    status,
                    next_recommended_date,
                    services (name)
                )
            `)
            .order("created_at", { ascending: false }),
        supabase
            .from("payments")
            .select("customer_id, amount, paid_at")
    ]);

    const { data: customersData, error } = customersRes;
    const paymentsData = paymentsRes.data || [];

    if (error) {
        console.error("Müşteriler çekilirken hata oluştu:", error.message);
        return [];
    }

    if (!customersData) return [];

    // Ödemeleri customer_id'ye göre grupla
    const paymentsByCustomer: Record<string, {amount: number, paid_at: string}[]> = {};
    for (const pmt of paymentsData) {
        if (!paymentsByCustomer[pmt.customer_id]) paymentsByCustomer[pmt.customer_id] = [];
        paymentsByCustomer[pmt.customer_id].push(pmt);
    }

    const today = new Date();
    const todayMs = today.getTime();

    const enhancedCustomers = customersData.map((customer: any) => {
        const appts = customer.appointments || [];

        // Sadece geçmiş veya bugünkü TAMAMLANMIŞ randevular 'harcama' ve 'son ziyaret' için geçerlidir
        const validAppts = appts.filter((a: any) => a.status === "completed");
        const paymentsArray = paymentsByCustomer[customer.id] || [];

        const totalAppointments = validAppts.length;
        const apptSpent = validAppts.reduce((sum: number, a: any) => sum + (Number(a.total_price) || 0), 0);
        const paymentSpent = paymentsArray.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
        const totalSpent = apptSpent + paymentSpent;

        let lastVisitDate = null;
        let daysSinceLastVisit = null;

        // Randevulardan gelen en son ziyaret tarihi
        let maxApptDate = 0;
        if (validAppts.length > 0) {
            const sortedAppts = [...validAppts].sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());
            maxApptDate = new Date(sortedAppts[0].appointment_date).getTime();
        }

        // Ödemelerden gelen en son işlem tarihi (Ödeme yapıldıysa müşteri gelmiş demektir)
        let maxPaymentDate = 0;
        if (paymentsArray.length > 0) {
            const sortedPayments = [...paymentsArray].sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
            maxPaymentDate = new Date(sortedPayments[0].paid_at).getTime();
        }

        const trueLastVisitMs = Math.max(maxApptDate, maxPaymentDate);

        if (trueLastVisitMs > 0) {
            lastVisitDate = new Date(trueLastVisitMs).toISOString();
            if (trueLastVisitMs <= todayMs) {
                daysSinceLastVisit = Math.floor((todayMs - trueLastVisitMs) / (1000 * 60 * 60 * 24));
            } else {
                daysSinceLastVisit = 0;
            }
        }

        // --- YAPAY ZEKA MÜŞTERİ ÖZETİ ve SEGMENTASYON ---
        let ai_summary = "Yeni Başlangıç";
        const isVip = customer.is_vip === true;

        if (totalAppointments >= 5 && daysSinceLastVisit !== null && daysSinceLastVisit <= 60) {
            ai_summary = "Sadık Müşteri";
        } else if (totalAppointments >= 3 && daysSinceLastVisit !== null && daysSinceLastVisit <= 90) {
            ai_summary = "Düzenli Ziyaretçi";
        } else if (totalAppointments >= 1 && totalSpent >= 5000) {
            ai_summary = "Potansiyeli Yüksek";
        } else if (totalAppointments > 0 && daysSinceLastVisit !== null && daysSinceLastVisit > 90) {
            ai_summary = "Geri Kazanılabilir";
        } else if (totalAppointments <= 1) {
            ai_summary = "Yeni Başlangıç";
        }

        return {
            ...customer,
            stats: {
                totalAppointments,
                totalSpent,
                lastVisitDate,
                daysSinceLastVisit
            },
            ai_summary,
            segment: isVip ? "VIP" : "Standart"
        };
    });

    return enhancedCustomers;
}


// Eski fonksiyon geriye dönük uyumluluk veya saf customer datası ihtiyacı için
export async function getCustomers() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customers")
        .select(`
            *,
            session_plans (
                id,
                service_id,
                total_sessions,
                completed_sessions,
                next_recommended_date,
                recommended_interval_days,
                status,
                package_total_price,
                paid_amount,
                payment_mode,
                payment_status,
                pricing_model,
                services (name)
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Müşteriler çekilirken hata:", error.message);
        return [];
    }
    return data || [];
}


// 2. Yeni Müşteri Ekleme (Create) - GÜNCELLENDİ
export async function addCustomer(customerData: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    notes?: string;
    is_vip?: boolean;
    birth_date?: string;
}) {
    const supabase = await createClient();

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

    // Doğum tarihi boşsa undefind yerine undefined / null kontrolü
    const payload: any = {
        business_id: businessUser.business_id,
        first_name: customerData.first_name,
        last_name: customerData.last_name,
        phone: customerData.phone,
        email: customerData.email,
        notes: customerData.notes,
        is_vip: customerData.is_vip || false
    };

    if (customerData.birth_date) {
        payload.birth_date = customerData.birth_date;
    }

    const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error("Müşteri kayıt hatası:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath("/(dashboard)/musteriler", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");

    return { success: true, data };
}


// 3. Müşteri Güncelleme (Update) - GÜNCELLENDİ
export async function updateCustomer(
    customerId: string | number,
    updateData: {
        first_name?: string;
        last_name?: string;
        phone?: string;
        email?: string;
        notes?: string;
        is_vip?: boolean;
        birth_date?: string;
    }
) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "İşlem yapmak için oturum açmalısınız." };
    }

    // Doğum tarihi boşsa ve gelmişse updateData'ya dahil edelim
    const payload = { ...updateData };

    const { data, error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", customerId)
        .select()
        .single();

    if (error) {
        console.error("Müşteri güncelleme hatası:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath("/(dashboard)/musteriler", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");
    return { success: true, data };
}


// 4. Müşteri Silme (Delete)
export async function deleteCustomer(customerId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerId);

    if (error) {
        console.error("Müşteri silme hatası:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath("/(dashboard)/musteriler", "page");
    revalidatePath("/(dashboard)/randevu-olustur", "page");
    return { success: true };
}


// 5. Müşteri Detay ve Randevu Geçmişi (Profil Ekranı İçin)
export async function getAppointedCustomerDetails(customerId: string) {
    const supabase = await createClient();

    // Önce müşteri + randevu + seans planı bilgilerini çek
    const [customerRes, paymentsRes] = await Promise.all([
        supabase
            .from("customers")
            .select(`
                *,
                appointments (
                    *,
                    appointment_services (
                        *,
                        services (*),
                        session_plans (
                            id,
                            total_sessions
                        )
                    )
                ),
                session_plans (
                    *,
                    services (name)
                )
            `)
            .eq("id", customerId)
            .single(),
        supabase
            .from("payments")
            .select("*")
            .eq("customer_id", customerId)
            .order("paid_at", { ascending: false })
    ]);

    const { data: customer, error } = customerRes;
    const paymentsArray = paymentsRes.data || [];

    if (error || !customer) {
        console.error("Müşteri detayı çekilirken HATA DETAYI:", JSON.stringify(error, null, 2));
        return null;
    }

    const todayMs = new Date().getTime();

    // Tüm randevuları azalan (yeni->eski) tarihe göre sırala
    const appts = customer.appointments || [];
    const sortedAppts = [...appts].sort((a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());

    // Sadece "completed" (tamamlandı) statüsündekiler
    const completedAppts = sortedAppts.filter((a: any) => a.status === "completed");

    const totalAppointments = appts.length;
    
    const apptSpent = completedAppts.reduce((sum: number, a: any) => sum + (Number(a.total_price) || 0), 0);
    const paymentSpent = paymentsArray.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const totalSpent = apptSpent + paymentSpent;

    let lastVisitDate = null;
    let firstVisitDate = null;
    let daysSinceLastVisit = null;
    let lastServiceName = "Hizmet Alınmadı";

    // Randevulardan gelen tarihler
    let maxApptDate = 0;
    let minApptDate = Infinity;

    if (completedAppts.length > 0) {
        const lastAppt = completedAppts[0]; // En yeni tamamlanan
        maxApptDate = new Date(lastAppt.appointment_date).getTime();
        
        const firstAppt = completedAppts[completedAppts.length - 1]; // En eski tamamlanan
        minApptDate = new Date(firstAppt.appointment_date).getTime();

        if (lastAppt.appointment_services && lastAppt.appointment_services.length > 0) {
            const serviceNames = lastAppt.appointment_services
                .map((as: any) => as.services?.name)
                .filter(Boolean);
            if (serviceNames.length > 0) {
                lastServiceName = serviceNames.join(", ");
            }
        }
    }

    // Ödemelerden gelen tarihler
    let maxPaymentDate = 0;
    let minPaymentDate = Infinity;
    if (paymentsArray.length > 0) {
        const sortedPayments = [...paymentsArray].sort((a: any, b: any) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime());
        maxPaymentDate = new Date(sortedPayments[0].paid_at).getTime();
        minPaymentDate = new Date(sortedPayments[sortedPayments.length - 1].paid_at).getTime();
    }

    const trueLastVisitMs = Math.max(maxApptDate, maxPaymentDate);
    const trueFirstVisitMs = Math.min(minApptDate, minPaymentDate);

    if (trueLastVisitMs > 0) {
        lastVisitDate = new Date(trueLastVisitMs).toISOString();
        if (trueLastVisitMs <= todayMs) {
            daysSinceLastVisit = Math.floor((todayMs - trueLastVisitMs) / (1000 * 60 * 60 * 24));
        } else {
            daysSinceLastVisit = 0;
        }
    } else {
        // Tamamlanan randevu yok, ödeme de yok, ama bekleyen randevu var mı?
        const validAppt = sortedAppts.filter((a: any) => a.status !== "canceled" && a.status !== "no_show");
        if (validAppt.length > 0) {
            const lastValidMs = new Date(validAppt[0].appointment_date).getTime();
            if (lastValidMs <= todayMs) {
                daysSinceLastVisit = Math.floor((todayMs - lastValidMs) / (1000 * 60 * 60 * 24));
            }
        }
    }

    if (trueFirstVisitMs !== Infinity) {
        firstVisitDate = new Date(trueFirstVisitMs).toISOString();
    }

    // AI Özet Karar Mekanizması
    let ai_summary = "Yeni Başlangıç";
    const isVip = customer.is_vip === true;

    // Senaryolarla Uyumlu Etiket:
    if (completedAppts.length >= 3 && daysSinceLastVisit !== null && daysSinceLastVisit <= 30) {
        ai_summary = "Sadık Müşteri";
    } else if (daysSinceLastVisit !== null && daysSinceLastVisit >= 90) {
        ai_summary = "Geri Kazanılabilir"; // Veya Riskli (Liste eşleşmesi için)
    } else if (totalAppointments > 0 && daysSinceLastVisit !== null && daysSinceLastVisit > 60) {
        ai_summary = "Riskli";
    } else if (completedAppts.length <= 1) {
        ai_summary = "Yeni Başlangıç";
    } else {
        ai_summary = "Düzenli Ziyaretçi";
    }

    // Liste ekranındaki Geri Kazanılabilir etiketinin tam yakalanması
    if (daysSinceLastVisit !== null && daysSinceLastVisit > 90) {
        ai_summary = "Geri Kazanılabilir";
    }

    return {
        ...customer,
        stats: {
            totalAppointments,
            totalSpent,
            lastVisitDate,
            firstVisitDate,
            daysSinceLastVisit,
            lastServiceName
        },
        ai_summary,
        segment: isVip ? "VIP" : "Standart",
        sortedAppointments: sortedAppts
    };
}
