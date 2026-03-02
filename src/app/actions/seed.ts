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

    // 3. İsim ve Soyisim Havuzları
    const firstNamesFemale = ["Selin", "Ayşe", "Merve", "Zeynep", "Leyla", "Nur", "Canan", "Fatma", "Gamze", "İpek", "Büşra", "Pınar", "Deniz", "Ece", "Melis", "Buse", "Hande", "Tuğba", "Elif", "Derya", "Gözde", "Ceren", "Eylül", "Aslı", "Sinem", "Damla", "Gizem", "Cansu", "Özge", "Esra"];
    const firstNamesMale = ["Ahmet", "Mehmet", "Can", "Burak", "Emre", "Cem", "Mert", "Ali", "Ozan", "Hakan"];
    const lastNames = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Şen", "Öztürk", "Arslan", "Kurt", "Aydın", "Doğan", "Aksoy", "Sert", "Yıldız", "Güler", "Koç", "Polat", "Aras", "Kılıç", "Özdemir", "Çetin", "Tekin", "Erdoğan", "Yavuz", "Güneş", "Aslan"];

    // Rastgele eleman seçici
    const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // Rastgele tarih (Yıl aralığı)
    const randomDate = (startYear: number, endYear: number, forceCurrentMonth: boolean = false) => {
        const year = startYear + Math.floor(Math.random() * (endYear - startYear));
        const month = forceCurrentMonth ? currentMonth : String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Rastgele Türk telefon numarası
    const generatePhone = () => {
        const prefixes = ["532", "533", "555", "542", "544", "505", "507", "530"];
        const prefix = randomItem(prefixes);
        const p1 = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
        const p2 = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        return `0${prefix} ${p1} ${p2.substring(0, 2)} ${p2.substring(2)}`;
    };

    // 4. Müşteri (Customer) Üretimi (65 adet)
    const generatedCustomers = [];
    const NUM_CUSTOMERS = 65;

    for (let i = 0; i < NUM_CUSTOMERS; i++) {
        const isFemale = Math.random() > 0.15; // %85 Kadın müşteri (Sektör doğası gereği)
        const fn = randomItem(isFemale ? firstNamesFemale : firstNamesMale);
        const ln = randomItem(lastNames);

        let targetSegment = 'all'; // Kategorileme fikir vermesi için
        const randSeed = Math.random();

        let is_vip = false;
        let bDayForce = false;
        let notes = "";

        if (randSeed < 0.10) {
            // 10% VIP
            is_vip = true;
            targetSegment = 'vip';
            notes = "VIP müşteri. İlgilenilmeli.";
        } else if (randSeed < 0.30) {
            // 20% Düzenli
            targetSegment = 'loyal';
        } else if (randSeed < 0.55) {
            // 25% Riskli / Geri kazanılabilir (Çok eski)
            targetSegment = 'risk';
        } else if (randSeed < 0.70) {
            // 15% Doğum Günü
            bDayForce = true;
            notes = "Bu ay doğum günü var!";
        } else {
            //Kalanı Yeni / Normal
            targetSegment = 'new';
        }

        generatedCustomers.push({
            first_name: fn,
            last_name: ln,
            phone: generatePhone(),
            email: Math.random() > 0.4 ? `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com` : null,
            is_vip: is_vip,
            birth_date: Math.random() > 0.3 ? randomDate(1975, 2002, bDayForce) : null,
            notes: notes || null,
            _targetSegment: targetSegment // Kendi içimizde takip için
        });
    }

    // 5. Müşterileri veritabanına ekle
    const { data: insertedCustomers, error: custErr } = await supabase
        .from("customers")
        .insert(generatedCustomers.map(c => {
            const { _targetSegment, ...rest } = c;
            return { ...rest, business_id: businessId };
        }))
        .select("id, first_name, last_name");

    if (custErr || !insertedCustomers) {
        return { success: false, message: "Müşteriler eklenemedi: " + custErr?.message };
    }

    // 6. Randevuları Planlama ve Eklemeler
    const getDateStr = (daysOffset: number) => {
        const d = new Date("2026-03-01T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + daysOffset);
        return d.toISOString().split("T")[0]; // YYYY-MM-DD
    };

    const pickService = () => randomItem(services);

    let totalApptsInserted = 0;

    // Her müşteri için kategorisine göre randevu üret
    for (let cIdx = 0; cIdx < insertedCustomers.length; cIdx++) {
        const c_db = insertedCustomers[cIdx];
        const c_meta = generatedCustomers[cIdx];
        const segment = c_meta._targetSegment;

        // Hangi günlere randevu atayacağız (Offsetler)
        let apptOffsets: number[] = [];

        if (segment === 'vip' || segment === 'loyal') {
            // Sık gelenler: Son 120 gün içinde 3-8 randevu, belki gelecekte 1 randevu
            const count = Math.floor(Math.random() * 5) + 3;
            for (let i = 0; i < count; i++) apptOffsets.push(-Math.floor(Math.random() * 120));
            if (Math.random() > 0.5) apptOffsets.push(Math.floor(Math.random() * 10) + 1); // Gelecek 1-10 gün
        } else if (segment === 'risk') {
            // Riskli: Uzun süredir gelmiyor (60-200 gün arası geçmişte 1-3 randevu)
            const count = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < count; i++) apptOffsets.push(-Math.floor(Math.random() * 140) - 60);
        } else if (segment === 'new') {
            // Yeni: Son 30 gün içinde sadece 1 randevu veya sadece gelecekte 1 randevu
            if (Math.random() > 0.3) {
                apptOffsets.push(-Math.floor(Math.random() * 30));
            } else {
                apptOffsets.push(Math.floor(Math.random() * 15) + 1);
            }
        } else {
            // Karışık
            const count = Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) apptOffsets.push(-Math.floor(Math.random() * 90));
        }

        // Offsetleri tarihe göre sırala
        apptOffsets.sort((a, b) => a - b);

        for (const offset of apptOffsets) {
            const timeHour = String(Math.floor(Math.random() * 9) + 9).padStart(2, '0'); // 09 - 17 arası
            const timeMin = Math.random() > 0.5 ? "00" : "30";
            const time = `${timeHour}:${timeMin}`;

            let status = 'completed';
            if (offset > 0) status = 'scheduled';
            if (offset === 0) status = Math.random() > 0.5 ? 'completed' : 'scheduled';
            if (offset < 0 && Math.random() > 0.95) status = 'no_show'; // %5 ihtimalle geçmişte gelmedi
            if (offset < 0 && Math.random() > 0.95) status = 'canceled'; // %5 ihtimalle iptal

            // 1-2 servis seç
            const srvCount = Math.random() > 0.7 ? 2 : 1;
            const chosenServices = [];
            for (let s = 0; s < srvCount; s++) chosenServices.push(pickService());

            const totalDuration = chosenServices.reduce((s, sv) => s + (sv.duration_minutes || 60), 0);
            const totalPrice = chosenServices.reduce((s, sv) => s + (Number(sv.price) || 0), 0);

            const { data: appt, error: apptErr } = await supabase
                .from("appointments")
                .insert([{
                    business_id: businessId,
                    customer_id: c_db.id,
                    appointment_date: getDateStr(offset),
                    appointment_time: time,
                    status,
                    total_duration_minutes: totalDuration,
                    total_price: totalPrice,
                    notes: null,
                }])
                .select("id")
                .single();

            if (apptErr || !appt) continue;

            const srvInserts = chosenServices.map(sv => ({
                appointment_id: appt.id,
                service_id: sv.id,
                price_at_booking: Number(sv.price) || 0,
            }));
            await supabase.from("appointment_services").insert(srvInserts);
            totalApptsInserted++;
        }
    }

    return {
        success: true,
        message: `✅ ${insertedCustomers.length} müşteri ve ${totalApptsInserted} randevu rastgele dağılımla başarıyla eklendi!`,
    };
}
