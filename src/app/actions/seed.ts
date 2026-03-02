"use server";

import { createClient } from "@/utils/supabase/server";

export async function seedDemoData(): Promise<{ success: boolean; message: string }> {
    const supabase = await createClient();

    // 1. Auth & Tenant kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, message: "Oturum açık değil." };
    }

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (bizError || !businessUser?.business_id) {
        return { success: false, message: "İşletme bulunamadı." };
    }

    const businessId = businessUser.business_id;

    // 2. Mevcut servisleri (hizmetleri) çek
    const { data: services, error: servErr } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes")
        .eq("business_id", businessId);

    if (servErr || !services || services.length === 0) {
        return { success: false, message: "Önce en az 1 hizmet ekleyin." };
    }

    // Doğum gününü bu ay yapmak için:
    const currentYear = 2026;
    const currentMonth = "03"; // Mart (01.03.2026 test target'ı)

    // 3. Müşteri verileri - AI TEST SENARYOLARI İÇİN ÖZEL HAZIRLANDI
    const customerList = [
        // 0: Sadık Müşteri, VIP, Doğum Günü Bu Ay
        { first_name: "Selin", last_name: "Aras", phone: "0532 555 1234", email: "selin.aras@example.com", is_vip: true, birth_date: `1990-${currentMonth}-15`, notes: "VIP müşteri. Cilt bakımına çok önem verir." },
        // 1: Düzenli Ziyaretçi (3 randevu son 90 gün)
        { first_name: "Ayşe", last_name: "Yılmaz", phone: "0533 222 3456", email: "ayse.yilmaz@gmail.com", is_vip: false, birth_date: "1985-06-20", notes: "Düzenli müşteri. Her ay gelir." },
        // 2: Riskli / Geri Kazanılabilir (100+ gündür gelmiyor)
        { first_name: "Merve", last_name: "Kaya", phone: "0542 111 9876", email: "merve.k@hotmail.com", is_vip: false, birth_date: "1992-11-05", notes: "Uzun süredir gelmiyor. Takip edilmeli." },
        // 3: Yeni Başlangıç (1 randevusu var)
        { first_name: "Zeynep", last_name: "Demir", phone: "0555 777 2211", email: "zeynep.demir@outlook.com", is_vip: false, birth_date: null, notes: "Yeni müşteri. İlk kez geldi." },
        // 4: Sadık Müşteri (10 randevu)
        { first_name: "Leyla", last_name: "Şahin", phone: "0544 888 4455", email: "leyla.sahin@gmail.com", is_vip: true, birth_date: "1988-02-14", notes: "En sadık müşteri." },
        // 5: Potansiyeli Yüksek (2 randevu ama pahalı hizmetler / VIP)
        { first_name: "Nur", last_name: "Çelik", phone: "0532 100 5566", email: "nur.celik@test.com", is_vip: true, birth_date: null, notes: "Kalıcı makyaj konusunda çok meraklı." },
        // 6: Riskli (Sadece 1 kez gelmiş, 6 ay önce)
        { first_name: "Canan", last_name: "Şen", phone: "0533 444 7788", email: null, is_vip: false, birth_date: "1995-08-30", notes: "Telefon ile de aranabilir." },
        // 7: Düzenli Ziyaretçi, VIP Doğum günü bu ay
        { first_name: "Fatma", last_name: "Öztürk", phone: "0542 999 3322", email: "fatma@example.com", is_vip: true, birth_date: `1980-${currentMonth}-22`, notes: "Düğün öncesi bakım paketi yaptı." },
        // 8: Yeni Başlangıç (Hiç randevusu yok, yeni kayıt)
        { first_name: "Gamze", last_name: "Arslan", phone: "0555 123 4567", email: "gamze.a@outlook.com", is_vip: false, birth_date: null, notes: "Kirpik uzatmaya ilgi duyuyor." },
        // 9: Riskli
        { first_name: "İpek", last_name: "Kurt", phone: "0544 456 7890", email: null, is_vip: false, birth_date: null, notes: "Aylardır gelmiyor." },
        // 10: Düzenli
        { first_name: "Büşra", last_name: "Aydın", phone: "0532 321 6543", email: "busra@test.com", is_vip: false, birth_date: "1994-01-10", notes: "Saç bakımı ve fön tercih eder." },
        // 11: Sadık
        { first_name: "Pınar", last_name: "Doğan", phone: "0533 654 3210", email: "pinar.dogan@gmail.com", is_vip: true, birth_date: null, notes: "Daima erken gelir." },
        // 12: Düzenli
        { first_name: "Deniz", last_name: "Aksoy", phone: "0542 777 8899", email: null, is_vip: false, birth_date: null, notes: "Haftalık cilt bakımı müşterisi." },
        // 13: Yeni
        { first_name: "Ece", last_name: "Sert", phone: "0555 234 5678", email: "ece.sert@mail.com", is_vip: false, birth_date: `1999-${currentMonth}-02`, notes: "Doğum Günü bu ay!" },
        // 14: Riskli
        { first_name: "Melis", last_name: "Yıldız", phone: "0544 567 8901", email: "melis.yildiz@hotmail.com", is_vip: false, birth_date: null, notes: "Hydrafacial müdavimiydi." },
        // 15: Düzenli ama dün gelmedi (No show)
        { first_name: "Buse", last_name: "Güler", phone: "0532 890 1234", email: null, is_vip: false, birth_date: null, notes: "Bazen iptal ediyor. Hatırlatıcı lazım." },
        // 16: Yeni Başlangıç (Gelecekte randevusu var sadece)
        { first_name: "Hande", last_name: "Koç", phone: "0533 012 3456", email: "hande.koc@example.com", is_vip: false, birth_date: null, notes: "Sadece ilk randevusu planlandı." },
        // 17: Sadık Müşteri VIP
        { first_name: "Tuğba", last_name: "Polat", phone: "0542 345 6789", email: null, is_vip: true, birth_date: "1987-12-12", notes: "Arkadaş tavsiyesiyle geldi, hiç bırakmadı." },
    ];

    // 4. Müşterileri ekle
    const { data: insertedCustomers, error: custErr } = await supabase
        .from("customers")
        .insert(customerList.map(c => ({ ...c, business_id: businessId })))
        .select("id, first_name, last_name");

    if (custErr || !insertedCustomers) {
        return { success: false, message: "Müşteriler eklenemedi: " + custErr?.message };
    }

    // 5. Baz tarih: 01.03.2026 (bugün)
    const getDateStr = (daysOffset: number) => {
        const d = new Date("2026-03-01T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + daysOffset);
        return d.toISOString().split("T")[0]; // YYYY-MM-DD
    };

    // 6. Rastgele hizmet seçici
    const pickService = (index: number) => services[index % services.length];

    // 7. Randevu planı: [müşteri_index, gün_offset_from_2026-03-01, saat, status, servis_indexleri, yapay_fiyat_artisi_cani_isteyenler_icin]
    // negatif = geçmiş (son 90 gün), 0 = bugün (01.03.2026), pozitif = gelecek
    type ApptPlan = [number, number, string, string, number[], number?];
    const appointmentPlans: ApptPlan[] = [
        // ================= SADIK MÜŞTERİ (Index 0 - Selin) (5+ randevu, son 60 gün) =================
        [0, -50, "10:00", "completed", [0, 1]],
        [0, -40, "11:00", "completed", [0]],
        [0, -30, "09:30", "completed", [1]],
        [0, -15, "14:00", "completed", [0]],
        [0, -5, "13:00", "completed", [0, 1]],
        [0, 2, "11:00", "scheduled", [0]], // Gelecek randevusu da var

        // ================= DÜZENLİ ZİYARETÇİ (Index 1 - Ayşe) (3-4 randevu, son 90 gün) =================
        [1, -80, "13:00", "completed", [0]],
        [1, -45, "10:30", "completed", [0]],
        [1, -10, "15:00", "completed", [1]],

        // ================= RİSKLİ/GERİ KAZANILABİLİR (Index 2 - Merve) (100+ gündür gelmiyor) =================
        [2, -150, "11:00", "completed", [0]],
        [2, -110, "14:30", "completed", [1]],

        // ================= YENİ BAŞLANGIÇ (Index 3 - Zeynep) (Sadece 1 geçmiş randevu) =================
        [3, -5, "09:00", "completed", [0]],

        // ================= SADIK MÜŞTERİ (Index 4 - Leyla) (10+ randevu) =================
        [4, -85, "16:00", "completed", [0]],
        [4, -75, "11:00", "completed", [1]],
        [4, -60, "14:30", "completed", [0]],
        [4, -45, "10:00", "completed", [1]],
        [4, -30, "12:00", "completed", [0]],
        [4, -15, "09:30", "completed", [1]],
        [4, 0, "14:00", "scheduled", [1]], // BUGÜN RANDVUSUO VAR

        // ================= POTANSİYELİ YÜKSEK (Index 5 - Nur) (Sadece 2 randevu ama toplamı 6000+ TL olsun) =================
        [5, -20, "12:00", "completed", [0, 1], 3500], // Extradan 3500 tl fiyat
        [5, -5, "09:30", "completed", [1], 4000],

        // ================= RİSKLİ (Index 6 - Canan) =================
        [6, -180, "13:00", "completed", [0]],

        // ================= DÜZENLİ ZİYARETÇİ (Index 7 - Fatma) =================
        [7, -85, "10:30", "completed", [1]],
        [7, -50, "14:00", "completed", [0, 1]],
        [7, -18, "11:00", "completed", [0]],

        // ================= RİSKLİ (Index 9 - İpek) =================
        [9, -200, "13:30", "completed", [0]],
        [9, -120, "10:30", "completed", [1]],

        // ================= DÜZENLİ ZİYARETÇİ (Index 10 - Büşra) =================
        [10, -70, "10:30", "completed", [1]],
        [10, -35, "14:00", "completed", [0]],
        [10, -10, "11:00", "completed", [0]],

        // ================= SADIK MÜŞTERİ (Index 11 - Pınar) =================
        [11, -80, "10:30", "completed", [1]],
        [11, -60, "14:00", "completed", [0]],
        [11, -40, "11:00", "completed", [0]],
        [11, -20, "11:00", "completed", [0]],
        [11, -5, "11:00", "completed", [0]],

        // ================= DÜZENLİ ZİYARETÇİ (Index 12 - Deniz) =================
        [12, -50, "10:30", "completed", [1]],
        [12, -25, "14:00", "completed", [0]],
        [12, -2, "11:00", "completed", [0]],

        // ================= YENİ BAŞLANGIÇ (Index 13 - Ece) =================
        [13, 1, "11:00", "scheduled", [0]], // Sadece yarın randevusu var

        // ================= RİSKLİ (Index 14 - Melis) =================
        [14, -130, "11:00", "completed", [0]],
        [14, -95, "11:00", "completed", [0]],

        // ================= DÜZENLİ AMA DÜN NO-SHOW (Index 15 - Buse) =================
        [15, -60, "11:00", "completed", [0]],
        [15, -40, "11:00", "completed", [0]],
        [15, -20, "11:00", "completed", [0]],
        [15, -1, "10:00", "no_show", [0]],

        // ================= YENİ BAŞLANGIÇ (Index 16 - Hande) =================
        [16, 5, "13:00", "scheduled", [1]],

        // ================= SADIK MÜŞTERİ (Index 17 - Tuğba) =================
        [17, -90, "11:00", "completed", [0]],
        [17, -70, "11:00", "completed", [0]],
        [17, -50, "11:00", "completed", [0]],
        [17, -30, "11:00", "completed", [0]],
        [17, -10, "11:00", "completed", [0]],

        // ===== BUGÜN PLANLANMIŞ EXTRA (Riskli vs listesinde olmayan ama bugün gelen) =====
        [10, 0, "16:30", "scheduled", [0]],
    ];

    let totalInserted = 0;
    for (const apptPlan of appointmentPlans) {
        // tuple uzunluğunu kontrol edip destructure ediyoruz
        const custIdx = apptPlan[0] as number;
        const daysOffset = apptPlan[1] as number;
        const time = apptPlan[2] as string;
        const status = apptPlan[3] as string;
        const serviceIdxList = apptPlan[4] as number[];
        const customPrice = apptPlan[5] as number | undefined;

        const customer = insertedCustomers[custIdx];
        if (!customer) continue;

        const srvList = serviceIdxList.map(i => pickService(i));
        const totalDuration = srvList.reduce((s, sv) => s + (sv.duration_minutes || 60), 0);
        const totalPrice = customPrice || srvList.reduce((s, sv) => s + (Number(sv.price) || 0), 0);

        const { data: appt, error: apptErr } = await supabase
            .from("appointments")
            .insert([{
                business_id: businessId,
                customer_id: customer.id,
                appointment_date: getDateStr(daysOffset),
                appointment_time: time,
                status,
                total_duration_minutes: totalDuration,
                total_price: totalPrice,
                notes: null,
            }])
            .select("id")
            .single();

        if (apptErr || !appt) continue;

        const srvInserts = srvList.map(sv => ({
            appointment_id: appt.id,
            service_id: sv.id,
            price_at_booking: customPrice ? Math.round(customPrice / srvList.length) : (Number(sv.price) || 0),
        }));
        await supabase.from("appointment_services").insert(srvInserts);
        totalInserted++;
    }

    return {
        success: true,
        message: `✅ ${insertedCustomers.length} müşteri ve ${totalInserted} randevu (VIP, Sadık, Riskli vb. AI test verisiyle) başarıyla eklendi!`,
    };
}
