"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

function getCompletedAppointments(appointments: any[] = []) {
    return appointments.filter((appointment) => appointment.status === "completed");
}

function getAppointmentDateMs(dateValue?: string | null) {
    if (!dateValue) return 0;
    const dateMs = new Date(`${dateValue}T12:00:00+03:00`).getTime();
    return Number.isNaN(dateMs) ? 0 : dateMs;
}

function getSingleSessionCollected(appointments: any[] = []) {
    return appointments.reduce((sum: number, appointment: any) => {
        const lines = Array.isArray(appointment.appointment_services) ? appointment.appointment_services : [];

        if (lines.length === 0) {
            return sum + (Number(appointment.total_price) || 0);
        }

        return sum + lines
            .filter((line: any) => !line.session_plan_id)
            .reduce((lineSum: number, line: any) => lineSum + (Number(line.price_at_booking) || 0), 0);
    }, 0);
}

function getSessionPlanOutstanding(sessionPlans: any[] = []) {
    return sessionPlans.reduce((sum: number, plan: any) => {
        if (plan.status !== "active") return sum;

        const total = Number(plan.package_total_price) || 0;
        const paid = Number(plan.paid_amount) || 0;
        return total > paid ? sum + (total - paid) : sum;
    }, 0);
}

function buildCustomerStats(customer: any, paymentsArray: any[] = []) {
    const completedAppointments = getCompletedAppointments(customer.appointments || []);
    const totalAppointments = completedAppointments.length;

    const sortedCompleted = [...completedAppointments].sort(
        (a: any, b: any) => getAppointmentDateMs(b.appointment_date) - getAppointmentDateMs(a.appointment_date)
    );

    const totalRevenue = completedAppointments.reduce((sum: number, appointment: any) => {
        return sum + (Number(appointment.total_price) || 0);
    }, 0);

    const totalCollected = getSingleSessionCollected(completedAppointments) + paymentsArray.reduce(
        (sum: number, payment: any) => sum + (Number(payment.amount) || 0),
        0
    );

    const lastVisitMs = sortedCompleted.length > 0 ? getAppointmentDateMs(sortedCompleted[0].appointment_date) : 0;
    const firstVisitMs = sortedCompleted.length > 0 ? getAppointmentDateMs(sortedCompleted[sortedCompleted.length - 1].appointment_date) : 0;
    const todayMs = Date.now();

    const lastVisitDate = lastVisitMs > 0 ? new Date(lastVisitMs).toISOString() : null;
    const firstVisitDate = firstVisitMs > 0 ? new Date(firstVisitMs).toISOString() : null;
    const daysSinceLastVisit = lastVisitMs > 0
        ? Math.max(0, Math.floor((todayMs - lastVisitMs) / (1000 * 60 * 60 * 24)))
        : null;

    const distinctServices = new Set<string>();
    completedAppointments.forEach((appointment: any) => {
        (appointment.appointment_services || []).forEach((line: any) => {
            const serviceName = line.services?.name;
            if (serviceName) distinctServices.add(serviceName);
        });
    });

    return {
        totalAppointments,
        totalRevenue,
        totalSpent: totalCollected,
        totalCollected,
        lastVisitDate,
        firstVisitDate,
        daysSinceLastVisit,
        outstandingBalance: getSessionPlanOutstanding(customer.session_plans || []),
        servicesTaken: Array.from(distinctServices)
    };
}

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
                    total_price,
                    appointment_services (
                        price_at_booking,
                        session_plan_id
                    )
                ),
                session_plans (
                    status,
                    next_recommended_date,
                    package_total_price,
                    paid_amount,
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

    const paymentsByCustomer: Record<string, {amount: number, paid_at: string}[]> = {};
    for (const pmt of paymentsData) {
        if (!paymentsByCustomer[pmt.customer_id]) paymentsByCustomer[pmt.customer_id] = [];
        paymentsByCustomer[pmt.customer_id].push(pmt);
    }

    const enhancedCustomers = customersData.map((customer: any) => {
        const paymentsArray = paymentsByCustomer[customer.id] || [];
        const stats = buildCustomerStats(customer, paymentsArray);

        let ai_summary = "Yeni Başlangıç";
        const isVip = customer.is_vip === true;

        if (stats.totalAppointments >= 5 && stats.daysSinceLastVisit !== null && stats.daysSinceLastVisit <= 60) {
            ai_summary = "Sadık Müşteri";
        } else if (stats.totalAppointments >= 3 && stats.daysSinceLastVisit !== null && stats.daysSinceLastVisit <= 90) {
            ai_summary = "Düzenli Ziyaretçi";
        } else if (stats.totalAppointments >= 1 && stats.totalSpent >= 5000) {
            ai_summary = "Potansiyeli Yüksek";
        } else if (stats.totalAppointments > 0 && stats.daysSinceLastVisit !== null && stats.daysSinceLastVisit > 90) {
            ai_summary = "Geri Kazanılabilir";
        } else if (stats.totalAppointments <= 1) {
            ai_summary = "Yeni Başlangıç";
        }

        return {
            ...customer,
            stats,
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

    const appts = customer.appointments || [];
    const sortedAppts = [...appts].sort(
        (a: any, b: any) => getAppointmentDateMs(b.appointment_date) - getAppointmentDateMs(a.appointment_date)
    );
    const completedAppts = getCompletedAppointments(sortedAppts);
    const stats = buildCustomerStats(customer, paymentsArray);
    let lastServiceName = "Hizmet Alınmadı";

    if (completedAppts.length > 0) {
        const lastAppt = completedAppts[0];
        if (lastAppt.appointment_services && lastAppt.appointment_services.length > 0) {
            const serviceNames = lastAppt.appointment_services
                .map((as: any) => as.services?.name)
                .filter(Boolean);
            if (serviceNames.length > 0) {
                lastServiceName = serviceNames.join(", ");
            }
        }
    }

    let ai_summary = "Yeni Başlangıç";
    const isVip = customer.is_vip === true;

    if (stats.totalAppointments >= 3 && stats.daysSinceLastVisit !== null && stats.daysSinceLastVisit <= 30) {
        ai_summary = "Sadık Müşteri";
    } else if (stats.daysSinceLastVisit !== null && stats.daysSinceLastVisit >= 90) {
        ai_summary = "Geri Kazanılabilir";
    } else if (stats.totalAppointments > 0 && stats.daysSinceLastVisit !== null && stats.daysSinceLastVisit > 60) {
        ai_summary = "Riskli";
    } else if (stats.totalAppointments <= 1) {
        ai_summary = "Yeni Başlangıç";
    } else {
        ai_summary = "Düzenli Ziyaretçi";
    }

    if (stats.daysSinceLastVisit !== null && stats.daysSinceLastVisit > 90) {
        ai_summary = "Geri Kazanılabilir";
    }

    return {
        ...customer,
        stats: {
            ...stats,
            lastServiceName
        },
        ai_summary,
        segment: isVip ? "VIP" : "Standart",
        sortedAppointments: sortedAppts
    };
}
