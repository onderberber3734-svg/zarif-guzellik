import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { fakerTR as faker } from "@faker-js/faker";
import { addDays, subDays, startOfDay, format, isAfter, isBefore } from "date-fns";
import { toZonedTime, format as formatTz } from "date-fns-tz";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing Supabase env vars!");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const TIMEZONE = "Europe/Istanbul";

function getIstanbulDate(date: Date = new Date()) {
    return toZonedTime(date, TIMEZONE);
}

const today = startOfDay(getIstanbulDate());

async function runSeed() {
    console.log("🌱 ZARIF GUZELLIK SEED SCRIPT BAŞLIYOR...");

    // 1. Business & Owner tespiti
    const { data: businessUsers, error: buError } = await supabase
        .from("business_users")
        .select("business_id, user_id")
        .limit(1);

    if (buError || !businessUsers || businessUsers.length === 0) {
         console.error("❌ Veritabanında (business_users) aktif işletme bulunamadı! Lütfen arayüzden kayıt olun.");
         process.exit(1);
    }
    const { business_id, user_id } = businessUsers[0];
    console.log(`✅ İşletme (${business_id}) seçildi. Temizlik başlıyor...`);

    // 2. TENTANT-AWARE CLEANUP (Silme Sırası: FK'lere göre sondan başa)
    await supabase.from("expenses").delete().eq("business_id", business_id);
    await supabase.from("ai_insights").delete().eq("business_id", business_id);
    await supabase.from("payments").delete().eq("business_id", business_id);
    await supabase.from("appointment_services").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Cascade yoksa manuel. Normalde var.
    await supabase.from("appointments").delete().eq("business_id", business_id);
    await supabase.from("session_plans").delete().eq("business_id", business_id);
    
    await supabase.from("staff_time_off").delete().neq("id", "00000000-0000-0000-0000-000000000000"); 
    await supabase.from("staff_services").delete().eq("business_id", business_id);
    await supabase.from("staff_working_hours").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("staff").delete().eq("business_id", business_id);
    
    await supabase.from("salon_services").delete().eq("business_id", business_id);
    await supabase.from("salons").delete().eq("business_id", business_id);
    await supabase.from("services").delete().eq("business_id", business_id);
    await supabase.from("customers").delete().eq("business_id", business_id);
    
    console.log(`🧹 Temizlik tamamlandı. Seed (Üretim) başlıyor...`);

    // ==========================================
    // A) SERVICES (Hizmetler 18-25 adet)
    // ==========================================
    const serviceCategories = ["Lazer", "Cilt Bakımı", "Bölgesel İncelme", "Masaj", "Kalıcı Makyaj", "Diğer"];
    const servicesToInsert: any[] = [];
    
    // Single Services
    for(let i=1; i<=14; i++) {
        servicesToInsert.push({
            business_id,
            name: `${faker.helpers.arrayElement(serviceCategories)} - Tekil ${i}`,
            category: faker.helpers.arrayElement(serviceCategories),
            duration_minutes: faker.helpers.arrayElement([30, 45, 60, 90]),
            price: faker.helpers.arrayElement([500, 800, 1200, 1500, 2000]),
            service_type: 'single'
        });
    }

    // Packages
    for(let i=1; i<=8; i++) {
        servicesToInsert.push({
            business_id,
            name: `${faker.helpers.arrayElement(["Lazer", "Cilt Bakımı", "İncelme"])} Paketi ${i} Seans`,
            category: "Paketler",
            duration_minutes: faker.helpers.arrayElement([45, 60]),
            price: 0,
            service_type: 'package',
            default_total_sessions: faker.helpers.arrayElement([4, 6, 8, 10]),
            default_interval_days: faker.helpers.arrayElement([15, 21, 30]),
            default_package_price: faker.helpers.arrayElement([4000, 6000, 8000, 12000])
        });
    }

    const { data: servicesRes } = await supabase.from('services').insert(servicesToInsert).select();
    const allServices = servicesRes || [];
    const packages = allServices.filter(s => s.service_type === 'package');
    const singleServices = allServices.filter(s => s.service_type === 'single');

    // ==========================================
    // B) ROOMS / SALONS (3-6 Odalar)
    // ==========================================
    const roomNames = ["Lazer Odası", "Cilt Bakım VİP", "Masaj Odası", "Diyot Odası", "G5 İncelme"];
    const { data: salonsRes } = await supabase.from('salons').insert(
        roomNames.map((name, i) => ({
            business_id,
            name,
            color_code: faker.color.rgb({ format: 'hex', casing: 'upper' })
        }))
    ).select();
    const salons = salonsRes || [];

    // Room-Service eşleştirme
    const salonServicesToInsert: any[] = [];
    let unassignedServiceId = singleServices[0].id; // 1 hizmet kesin boşta kalsın
    for (const salon of salons) {
        // Her Salona 3-5 rastgele hizmet
        const srvs = faker.helpers.arrayElements(singleServices.filter(s => s.id !== unassignedServiceId), { min: 3, max: 7 });
        for (const s of srvs) {
            salonServicesToInsert.push({ salon_id: salon.id, service_id: s.id, business_id });
        }
    }
    await supabase.from("salon_services").insert(salonServicesToInsert);

    // ==========================================
    // C) STAFF (5 Kişi)
    // ==========================================
    const staffToInsert = [
        { business_id, first_name: "Patron", last_name: "Hanım", role: "owner", user_id, is_active: true },
        { business_id, first_name: "Ayşe", last_name: "Yılmaz", role: "staff", is_active: true },
        { business_id, first_name: "Fatma", last_name: "Kaya", role: "staff", is_active: true },
        { business_id, first_name: "Ece", last_name: "Demir", role: "staff", is_active: true },
        { business_id, first_name: "Deniz", last_name: "Ateş", role: "staff", is_active: true },
    ];
    const { data: staffRes } = await supabase.from("staff").insert(staffToInsert).select();
    const staffList = staffRes || [];

    // Staff Services
    const staffServicesToInsert: any[] = [];
    for (const s of staffList) {
        const srvs = faker.helpers.arrayElements(allServices, { min: 5, max: 12 });
        for (const srv of srvs) {
            staffServicesToInsert.push({ staff_id: s.id, service_id: srv.id, business_id });
        }
    }
    await supabase.from("staff_services").insert(staffServicesToInsert);

    // Staff Working Hours
    const workingHours: any[] = [];
    for (const s of staffList) {
        for (let day=0; day<=6; day++) {
            workingHours.push({
                staff_id: s.id,
                day_of_week: day,
                start_time: "09:00",
                end_time: "19:00",
                break_start: "12:30",
                break_end: "13:30",
                is_closed: day === 0 // Pazar kapalı
            });
        }
    }
    await supabase.from("staff_working_hours").insert(workingHours);

    // Staff Time Off
    const staffOff1 = staffList[1];
    const staffOff2 = staffList[2];
    await supabase.from("staff_time_off").insert([
        { staff_id: staffOff1.id, start_date: format(addDays(today, 3), 'yyyy-MM-dd'), end_date: format(addDays(today, 5), 'yyyy-MM-dd'), status: 'approved', reason: 'Hastalık' },
        { staff_id: staffOff2.id, start_date: format(subDays(today, 6), 'yyyy-MM-dd'), end_date: format(subDays(today, 5), 'yyyy-MM-dd'), status: 'approved', reason: 'Yıllık İzin' },
    ]);

    // ==========================================
    // D) CUSTOMERS (70 Kişi)
    // ==========================================
    const customersToInsert: any[] = [];
    for(let i=0; i<70; i++) {
        customersToInsert.push({
            business_id,
            first_name: faker.person.firstName('female'),
            last_name: faker.person.lastName(),
            phone: "+905" + faker.string.numeric(9),
            email: faker.internet.email().toLowerCase(),
        });
    }
    const { data: custRes } = await supabase.from("customers").insert(customersToInsert).select();
    const customers = custRes || [];

    // Segments: 10 VIP, 20 loyal, 20 medium, 20 riskli
    const vipCust = customers.slice(0, 10);
    const loyalCust = customers.slice(10, 30);
    const midCust = customers.slice(30, 50);
    const riskCust = customers.slice(50, 70);

    // ==========================================
    // E) SESSION PLANS (25 Paket)
    // ==========================================
    // 6 Plan -> "borc yok"
    // 10 Plan -> "kalan var" (ödenmemiş borç)
    // 5 Plan -> "gecikmiş", 4 Plan -> "çok gecikmiş"
    
    const planScenarios = [
        ...Array(6).fill("no_debt"),
        ...Array(10).fill("debt"),
        ...Array(5).fill("overdue"),
        ...Array(4).fill("very_overdue")
    ];

    const plansToInsert: any[] = [];
    for (let i = 0; i < 25; i++) {
        const cust = faker.helpers.arrayElement(customers);
        const pkg = faker.helpers.arrayElement(packages);
        const scenario = planScenarios[i];
        
        const totalAmount = pkg.default_package_price || 5000;
        let paidAmount = 0;
        let pricingModel = faker.helpers.arrayElement(['package_total', 'per_session']);
        
        let nextDate = addDays(today, 5); // Default future
        
        if (scenario === "no_debt") {
            paidAmount = totalAmount;
            pricingModel = 'package_total';
        } else if (scenario === "debt") {
            paidAmount = totalAmount * 0.3; // 30% peşinat ödenmiş
        } else if (scenario === "overdue") {
            nextDate = subDays(today, 10);
            paidAmount = totalAmount * 0.5;
        } else if (scenario === "very_overdue") {
            nextDate = subDays(today, 95);
            paidAmount = totalAmount * 0.5;
        }

        plansToInsert.push({
            business_id,
            customer_id: cust.id,
            service_id: pkg.id,
            total_sessions: pkg.default_total_sessions || 6,
            completed_sessions: 0,
            recommended_interval_days: pkg.default_interval_days || 30,
            next_recommended_date: format(nextDate, 'yyyy-MM-dd'),
            status: 'active',
            pricing_model: pricingModel,
            package_total_price: pricingModel === 'package_total' ? totalAmount : null,
            per_session_price: pricingModel === 'per_session' ? (totalAmount / (pkg.default_total_sessions||6)) : null,
            paid_amount: 0 // Payment'lar sonra trigger'la güncellenecek ama şimdilik manual atabiliriz, scriptin ilerisinde db güncelleyeceğiz
        });
    }

    const { data: plansRes } = await supabase.from("session_plans").insert(plansToInsert).select();
    const sessionPlans = plansRes || [];

    // ==========================================
    // F) PAYMENTS
    // ==========================================
    const paymentsToInsert: any[] = [];
    for (const p of sessionPlans) {
        const scenario = planScenarios[sessionPlans.indexOf(p)];
        const total = p.package_total_price || (p.per_session_price! * p.total_sessions);
        let amountToPay = 0;
        
        if (scenario === "no_debt") amountToPay = total;
        else if (scenario === "debt") amountToPay = total * 0.3;
        else if (scenario === "overdue" || scenario === "very_overdue") amountToPay = total * 0.5;
        
        if (amountToPay > 0) {
            paymentsToInsert.push({
                business_id,
                customer_id: p.customer_id,
                session_plan_id: p.id,
                amount: amountToPay,
                payment_method: 'credit_card',
                paid_at: subDays(today, faker.number.int({min: 1, max: 60})).toISOString()
            });
        }
    }
    
    // BUGÜN İÇİN 3 ÖDEME! (Daily Summary Test)
    for (let i=0; i<3; i++) {
        paymentsToInsert.push({
            business_id,
            customer_id: faker.helpers.arrayElement(customers).id,
            session_plan_id: faker.helpers.arrayElement(sessionPlans).id,
            amount: faker.helpers.arrayElement([500, 1000, 1500]),
            payment_method: 'cash',
            paid_at: today.toISOString()
        });
    }
    
    await supabase.from("payments").insert(paymentsToInsert);

    // Paid amount'u session_plan'lere update et (Trigger varsa da garanti olsun)
    for (const p of sessionPlans) {
        const totalPaid = paymentsToInsert.filter(x => x.session_plan_id === p.id).reduce((sum, item) => sum + item.amount, 0);
        await supabase.from('session_plans').update({ paid_amount: totalPaid }).eq('id', p.id);
    }

    // ==========================================
    // G) APPOINTMENTS (200+ adet)
    // ==========================================
    const appointmentsToInsert: any[] = [];
    const appointmentServicesToInsert: any[] = [];
    
    function createAppt(custGroup: any[], datePool: [number, number], status: 'completed'|'scheduled'|'canceled'|'no_show'|'checked_in', pack?: any) {
        const cust = faker.helpers.arrayElement(custGroup);
        const staff = faker.helpers.arrayElement(staffList);
        const room = faker.helpers.arrayElement(salons);
        
        const daysOffset = faker.number.int({ min: datePool[0], max: datePool[1] });
        const apptDate = addDays(today, daysOffset);
        
        const isPackage = !!pack;
        const srv = isPackage ? packages.find(s => s.id === pack.service_id) : faker.helpers.arrayElement(singleServices);
        
        const hour = faker.number.int({min: 9, max: 18});
        const minute = faker.helpers.arrayElement(["00", "30"]);
        
        const apptId = faker.string.uuid();
        appointmentsToInsert.push({
            id: apptId,
            business_id,
            customer_id: cust.id,
            staff_id: staff.id,
            salon_id: room.id,
            appointment_date: format(apptDate, 'yyyy-MM-dd'),
            appointment_time: `${hour.toString().padStart(2, '0')}:${minute}`,
            status,
            total_duration_minutes: srv?.duration_minutes || 60,
            total_price: isPackage ? 0 : (srv?.price || 0),
            notes: faker.lorem.sentence()
        });
        
        appointmentServicesToInsert.push({
            appointment_id: apptId,
            service_id: srv?.id,
            price_at_booking: isPackage ? 0 : (srv?.price || 0),
            session_plan_id: isPackage ? pack.id : null,
            session_number: isPackage ? faker.number.int({min: 1, max: pack.total_sessions}) : null,
        });

        // Paketin completed_sessions'ını artır
        if (status === 'completed' && isPackage) {
            pack.temp_completed = (pack.temp_completed || 0) + 1;
        }
    }

    // Geçmiş Randevular (Tamamlanmış vb, %65 comp, 10% canc, 5% noshow)
    for(let i=0; i<150; i++) createAppt(loyalCust.concat(midCust, vipCust), [-90, -1], 'completed');
    for(let i=0; i<30; i++) createAppt(customers, [-90, -1], 'canceled');
    for(let i=0; i<15; i++) createAppt(customers, [-90, -1], 'no_show');

    // Riskli müşterilere geçmişte randevu (son gün 90-120)
    for(let i=0; i<40; i++) createAppt(riskCust, [-120, -70], 'completed');

    // Paket oturumları
    for(let p of sessionPlans) {
        createAppt([customers.find(c => c.id === p.customer_id)], [-60, -5], 'completed', p);
        createAppt([customers.find(c => c.id === p.customer_id)], [-30, -2], 'completed', p);
        if (p.next_recommended_date > format(today, 'yyyy-MM-dd')) {
            createAppt([customers.find(c => c.id === p.customer_id)], [1, 15], 'scheduled', p);
        }
    }

    // TODAY (Bugün en az 8 randevu. 3'ü paket)
    for(let i=0; i<5; i++) createAppt(customers, [0, 0], faker.helpers.arrayElement(['scheduled', 'checked_in', 'completed']));
    for(let i=0; i<3; i++) createAppt(customers, [0, 0], 'completed', sessionPlans.find(p => p.package_total_price && p.paid_amount < p.package_total_price));

    // FUTURE (Yarın ve ilerisi %20)
    for(let i=0; i<40; i++) createAppt(customers, [1, 30], 'scheduled');

    // Insert appointments chunk by chunk to avoid limits
    const chunkSize = 100;
    for(let i=0; i<appointmentsToInsert.length; i+=chunkSize) {
        await supabase.from("appointments").insert(appointmentsToInsert.slice(i, i+chunkSize));
    }
    
    for(let i=0; i<appointmentServicesToInsert.length; i+=chunkSize) {
        await supabase.from("appointment_services").insert(appointmentServicesToInsert.slice(i, i+chunkSize));
    }

    // Paket session sayılarını manual DB'ye yazalım (Trigger fail ihtimaline karşı seed'i garantile)
    for(let p of sessionPlans) {
        if (p.temp_completed > 0) {
             await supabase.from('session_plans').update({ completed_sessions: p.temp_completed }).eq('id', p.id);
        }
    }

    console.log(`\n================================`);
    console.log(`✅ SEED BAŞARIYLA TAMAMLANDI!`);
    console.log(`================================`);
    console.log(`👥 Müşteriler: 70`);
    console.log(`👩‍⚕️ Personel: 5`);
    console.log(`💆‍♀️ Hizmet (Tekil): 14`);
    console.log(`🎁 Hizmet (Paket): 8`);
    console.log(`📅 Paket Planları (Seanslar): 25`);
    console.log(`🤝 Toplam Randevular: ${appointmentsToInsert.length} (Completed/Scheduled/Canceled/No_Show)`);
    console.log(`💰 Toplam Ödeme Kayıtları: ${paymentsToInsert.length}`);
    console.log(`================================\n`);
    
    process.exit(0);
}

runSeed().catch(console.error);
