"use server";

import { createClient } from "@/utils/supabase/server";
import { fakerTR as faker } from "@faker-js/faker";
import { addDays, subDays, startOfDay, format } from "date-fns";
import { revalidatePath } from "next/cache";

export async function runBusinessSeed() {
    try {
        const supabase = await createClient();
        
        // 1. Session & Owner (Tenant) tespiti
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { success: false, error: "İşlem yapmak için oturum açmalısınız." };
        }

        const { data: businessUser, error: buError } = await supabase
            .from("business_users")
            .select("business_id")
            .eq("user_id", user.id)
            .single();

        if (buError || !businessUser?.business_id) {
            return { success: false, error: "Kullanıcıya tanımlı bir işletme bulunamadı." };
        }
        
        const business_id = businessUser.business_id;
        const today = startOfDay(new Date());

        // 2. TENTANT-AWARE CLEANUP (Silme Sırası: FK'lere göre sondan başa)
        await supabase.from("expenses").delete().eq("business_id", business_id);
        await supabase.from("ai_insights").delete().eq("business_id", business_id);
        await supabase.from("payments").delete().eq("business_id", business_id);
        await supabase.from("appointment_services").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // appointment_services business_id tasimadigi icin (eger tasimiyorsa) FK triggeri halleder. Ama eger sadece appointment_id uzerinden gidiliyorsa, appointment silinince o da silinir cascade ile! Biz guvenlik icin asagiya gececegiz.
        await supabase.from("appointments").delete().eq("business_id", business_id);
        await supabase.from("session_plans").delete().eq("business_id", business_id);
        
        await supabase.from("staff_time_off").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Cascade
        await supabase.from("staff_services").delete().eq("business_id", business_id);
        await supabase.from("staff_working_hours").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Cascade
        await supabase.from("staff").delete().eq("business_id", business_id);
        
        await supabase.from("salon_services").delete().eq("business_id", business_id);
        await supabase.from("salons").delete().eq("business_id", business_id);
        // Önceki denemelerden veya manuelden kalan hizmetleri SIFIRLA (İsteğe bağlı)
        await supabase.from("services").delete().eq("business_id", business_id);
        
        // Müşterileri siliyoruz
        await supabase.from("customers").delete().eq("business_id", business_id);

        // ==========================================
        // A) SERVICES (ONBOARDING VARSAYILANLARI)
        // ==========================================
        const defaultServices = [
            // Tekil Hizmetler (Single)
            { business_id, name: "Tüm Vücut Lazer", category: "Lazer & Epilasyon", duration_minutes: 60, price: 1000, service_type: 'single' },
            { business_id, name: "Bacak + Koltuk Altı Lazer", category: "Lazer & Epilasyon", duration_minutes: 45, price: 600, service_type: 'single' },
            { business_id, name: "Yüz Bölgesi Lazer", category: "Lazer & Epilasyon", duration_minutes: 30, price: 400, service_type: 'single' },
            { business_id, name: "Hydrafacial Cilt Bakımı", category: "Cilt Bakımı", duration_minutes: 60, price: 1200, service_type: 'single' },
            { business_id, name: "Klasik Cilt Bakımı", category: "Cilt Bakımı", duration_minutes: 45, price: 800, service_type: 'single' },
            { business_id, name: "Leke Bakımı", category: "Cilt Bakımı", duration_minutes: 45, price: 1000, service_type: 'single' },
            { business_id, name: "G5 / Selülit Bakımı", category: "Bölgesel İncelme", duration_minutes: 30, price: 500, service_type: 'single' },
            { business_id, name: "Bölgesel İncelme (Full Body)", category: "Bölgesel İncelme", duration_minutes: 60, price: 1500, service_type: 'single' },
            
            // Paket Şablonları (Packages - Onboarding'den)
            { business_id, name: "Tüm Vücut Lazer Paketi (8 Seans)", category: "Lazer & Epilasyon", duration_minutes: 60, price: 0, service_type: 'package', default_total_sessions: 8, default_interval_days: 30, default_package_price: 6000 },
            { business_id, name: "Yüz Bölgesi Lazer Paketi (6 Seans)", category: "Lazer & Epilasyon", duration_minutes: 30, price: 0, service_type: 'package', default_total_sessions: 6, default_interval_days: 30, default_package_price: 2000 },
            { business_id, name: "Hydrafacial Paketi (6 Seans)", category: "Cilt Bakımı", duration_minutes: 60, price: 0, service_type: 'package', default_total_sessions: 6, default_interval_days: 14, default_package_price: 6000 },
            { business_id, name: "Leke Bakımı Paketi (4 Seans)", category: "Cilt Bakımı", duration_minutes: 45, price: 0, service_type: 'package', default_total_sessions: 4, default_interval_days: 14, default_package_price: 3500 },
            { business_id, name: "G5 / Selülit Bakımı Paketi (8 Seans)", category: "Bölgesel İncelme", duration_minutes: 30, price: 0, service_type: 'package', default_total_sessions: 8, default_interval_days: 7, default_package_price: 3500 },
            { business_id, name: "Bölgesel İncelme Paketi (10 Seans)", category: "Bölgesel İncelme", duration_minutes: 60, price: 0, service_type: 'package', default_total_sessions: 10, default_interval_days: 7, default_package_price: 12000 }
        ];

        const { data: insertedServices, error: srvErr } = await supabase.from('services').insert(defaultServices).select('*');
        if (srvErr) throw new Error("Hizmetler eklenemedi: " + srvErr.message);
        
        const allServices = insertedServices || [];
        let packages = allServices.filter(s => s.service_type === 'package');
        let singleServices = allServices.filter(s => s.service_type !== 'package');

        // ==========================================
        // B) ROOMS / SALONS
        // ==========================================
        const roomNames = ["Güzellik Odası 1", "Güzellik Odası 2", "VIP Salon"];
        const { data: salonsRes } = await supabase.from('salons').insert(
            roomNames.map((name) => ({
                business_id,
                name,
                color_code: faker.color.rgb({ format: 'hex', casing: 'upper' })
            }))
        ).select();
        const salons = salonsRes || [];

        const salonServicesToInsert = [];
        for (const salon of salons) {
            // Açıkta hizmet kalmaması için TÜM gerçek hizmetleri TÜM odalara atıyoruz
            for (const s of allServices) {
                salonServicesToInsert.push({ salon_id: salon.id, service_id: s.id, business_id });
            }
        }
        const { error: ssErr } = await supabase.from("salon_services").insert(salonServicesToInsert);
        if (ssErr) console.error("Salon Services Hata:", ssErr.message);

        // ==========================================
        // C) STAFF
        // ==========================================
        const staffToInsert = [
            { business_id, first_name: "Patron", last_name: "Kullanıcı", role: "owner", user_id: user.id, is_active: true },
            { business_id, first_name: "Ayşe", last_name: "Yılmaz", role: "staff", is_active: true },
            { business_id, first_name: "Fatma", last_name: "Kaya", role: "staff", is_active: true },
            { business_id, first_name: "Ece", last_name: "Demir", role: "staff", is_active: true },
            { business_id, first_name: "Deniz", last_name: "Ateş", role: "staff", is_active: true },
        ];
        const { data: staffRes } = await supabase.from("staff").insert(staffToInsert).select();
        const staffList = staffRes || [];

        const staffServicesToInsert = [];
        for (const s of staffList) {
            // Açıkta personel veya hizmet kalmaması için TÜM gerçek hizmetleri TÜM personellere atıyoruz
            for (const srv of allServices) {
                staffServicesToInsert.push({ staff_id: s.id, service_id: srv.id, business_id });
            }
        }
        const { error: stsErr } = await supabase.from("staff_services").insert(staffServicesToInsert);
        if (stsErr) console.error("Staff Services Hata:", stsErr.message);

        const workingHours = [];
        for (const s of staffList) {
            for (let day=0; day<=6; day++) {
                workingHours.push({
                    staff_id: s.id,
                    day_of_week: day,
                    start_time: "09:00",
                    end_time: "19:00",
                    break_start: "12:30",
                    break_end: "13:30",
                    is_closed: day === 0
                });
            }
        }
        await supabase.from("staff_working_hours").insert(workingHours);

        if (staffList.length > 2) {
            await supabase.from("staff_time_off").insert([
                { staff_id: staffList[1].id, start_date: format(addDays(today, 3), 'yyyy-MM-dd'), end_date: format(addDays(today, 5), 'yyyy-MM-dd'), status: 'approved', reason: 'Hastalık' },
                { staff_id: staffList[2].id, start_date: format(subDays(today, 6), 'yyyy-MM-dd'), end_date: format(subDays(today, 5), 'yyyy-MM-dd'), status: 'approved', reason: 'Yıllık İzin' },
            ]);
        }

        // ==========================================
        // D) CUSTOMERS
        // ==========================================
        const customersToInsert = [];
        for(let i=0; i<300; i++) {
            customersToInsert.push({
                business_id,
                first_name: faker.person.firstName('female'),
                last_name: faker.person.lastName(),
                phone: "+905" + faker.string.numeric(9),
                email: faker.internet.email().toLowerCase(),
            });
        }
        const { data: custRes, error: ccErr } = await supabase.from("customers").insert(customersToInsert).select();
        if (ccErr) console.error("Customer error:", ccErr);
        const customers = custRes || [];

        const loyalCust = customers.slice(10, 100);
        const midCust = customers.slice(100, 200);
        const riskCust = customers.slice(200, 300);

        // ==========================================
        // E) SESSION PLANS
        // ==========================================
        const planScenarios = [
            ...Array(40).fill("no_debt"), // 40 plan no debt
            ...Array(30).fill("debt"),    // 30 plan with debt
            ...Array(10).fill("overdue")   // 10 overdue
        ];

        const plansToInsert = [];
        for (let i = 0; i < 80; i++) {
            const cust = faker.helpers.arrayElement(customers);
            const pkg = faker.helpers.arrayElement(packages);
            if(!pkg) continue;

            const scenario = planScenarios[i];
            const totalAmount = pkg.default_package_price || 5000;
            let pricingModel = faker.helpers.arrayElement(['package_total', 'per_session']);
            
            // Tarihlerin rastgele olması için created_at ekliyoruz
            const createdOffset = faker.number.int({min: 20, max: 180});
            const planCreatedAt = subDays(today, createdOffset);
            
            let nextDate = addDays(today, faker.number.int({min: 1, max: 15}));
            
            if (scenario === "overdue") nextDate = subDays(today, faker.number.int({min: 5, max: 40}));

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
                paid_amount: 0,
                created_at: planCreatedAt.toISOString()
            });
        }
        const { data: plansRes, error: planErr } = await supabase.from("session_plans").insert(plansToInsert).select();
        if (planErr) throw new Error("Session Plans Insert Hata: " + planErr.message);
        const sessionPlans = plansRes || [];

        // ==========================================
        // F) PAYMENTS
        // ==========================================
        const paymentsToInsert = [];
        for (let i = 0; i < sessionPlans.length; i++) {
            const p = sessionPlans[i];
            const scenario = planScenarios[i];
            const total = p.package_total_price || (p.per_session_price! * p.total_sessions);
            let amountToPay = 0;
            
            if (scenario === "no_debt") amountToPay = total;
            else if (scenario === "debt") amountToPay = total * 0.3;
            else amountToPay = total * 0.5;
            
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
        
        for (let i=0; i<3; i++) {
            if (sessionPlans.length > 0) {
                paymentsToInsert.push({
                    business_id,
                    customer_id: faker.helpers.arrayElement(customers).id,
                    session_plan_id: faker.helpers.arrayElement(sessionPlans).id,
                    amount: faker.helpers.arrayElement([500, 1000, 1500]),
                    payment_method: 'cash',
                    paid_at: new Date().toISOString()
                });
            }
        }
        const { error: payErr } = await supabase.from("payments").insert(paymentsToInsert);
        if (payErr) throw new Error("Payments Insert Hata: " + payErr.message);

        for (const p of sessionPlans) {
            const totalPaid = paymentsToInsert.filter(x => x.session_plan_id === p.id).reduce((sum, item) => sum + item.amount, 0);
            await supabase.from('session_plans').update({ paid_amount: totalPaid }).eq('id', p.id);
        }

        // ==========================================
        // G) APPOINTMENTS
        // ==========================================
        const appointmentsToInsert: any[] = [];
        const appointmentServicesToInsert: any[] = [];
        
        function createAppt(custGroup: any[], datePool: [number, number], status: 'completed'|'scheduled'|'canceled'|'no_show', pack?: any) {
            if (!custGroup.length) return;
            const cust = faker.helpers.arrayElement(custGroup);
            const staff = faker.helpers.arrayElement(staffList);
            const room = faker.helpers.arrayElement(salons);
            
            const daysOffset = faker.number.int({ min: datePool[0], max: datePool[1] });
            const apptDate = addDays(today, daysOffset);
            
            const isPackage = !!pack;
            const singleSrv = faker.helpers.arrayElement(singleServices);
            
            if (!singleSrv && !isPackage) return; // Hizmet yoksa randevu oluşturma!
            
            let sessionNum = null;
            if (isPackage) {
                pack._current_session = (pack._current_session || 0) + 1;
                sessionNum = pack._current_session;
                // Eğer paketin toplam seans sayısından daha fazla randevu girmeye çalışıyorsak durdur (Unique constraint patlamasın)
                if (sessionNum > pack.total_sessions) return;
            }
            
            // Eğer paketse, appointment_services pack'in EXACT service_id'sini alsın! Null olmasın.
            const srvId = isPackage ? pack.service_id : singleSrv.id;
            const srvDuration = isPackage 
                ? (packages.find(p => p.id === srvId)?.duration_minutes || 60) 
                : (singleSrv?.duration_minutes || 60);
            const srvPrice = isPackage ? 0 : (singleSrv?.price || 0);
            
            const hour = faker.number.int({min: 9, max: 18});
            const minute = faker.helpers.arrayElement(["00", "30"]);
            
            let finalStatus = status;
            
            // Eğer bugünse ve saat geçmişse, scheduled olanları 'completed' yapalım ki "Gelmedi" yığılması olmasın
            if (daysOffset === 0 && status === 'scheduled') {
                const currentHour = new Date().getHours();
                if (hour < currentHour) {
                    finalStatus = 'completed';
                }
            }
            
            const apptId = faker.string.uuid();
            appointmentsToInsert.push({
                id: apptId,
                business_id,
                customer_id: cust.id,
                staff_id: staff.id,
                salon_id: room?.id || null, // Tüm odalara tüm hizmetler atandı, rastgele oda güvenli
                appointment_date: format(apptDate, 'yyyy-MM-dd'),
                appointment_time: `${hour.toString().padStart(2, '0')}:${minute}`,
                status: finalStatus,
                total_duration_minutes: srvDuration,
                total_price: srvPrice,
                notes: ""
            });
            
            appointmentServicesToInsert.push({
                appointment_id: apptId,
                service_id: srvId, // 🌟 Kesinlikle dolu olacak!
                price_at_booking: srvPrice,
                session_plan_id: isPackage ? pack.id : null,
                session_number: sessionNum,
            });

            if (status === 'completed' && isPackage) {
                pack.temp_completed = (pack.temp_completed || 0) + 1;
            }
        }

        for(let i=0; i<500; i++) createAppt(loyalCust.concat(midCust), [-90, -1], 'completed');
        for(let i=0; i<30; i++) createAppt(customers, [-90, -1], 'canceled'); // İptaller
        for(let i=0; i<150; i++) createAppt(riskCust, [-180, -91], 'completed'); // Gerçekçi risk data

        for(let p of sessionPlans) {
            createAppt([customers.find(c => c.id === p.customer_id)], [-60, -5], 'completed', p);
            if (p.next_recommended_date > format(today, 'yyyy-MM-dd')) {
                createAppt([customers.find(c => c.id === p.customer_id)], [1, 15], 'scheduled', p);
            }
        }

        for(let i=0; i<25; i++) createAppt(customers, [0, 0], 'scheduled'); // Bugün için randevu oluştur
        for(let i=0; i<5; i++) createAppt(customers, [0, 0], 'completed', sessionPlans[0]);
        for(let i=0; i<100; i++) createAppt(customers, [1, 30], 'scheduled'); // İleri tarihli randevular

        const chunkSize = 100;
        for(let i=0; i<appointmentsToInsert.length; i+=chunkSize) {
            const { error: apptErr } = await supabase.from("appointments").insert(appointmentsToInsert.slice(i, i+chunkSize));
            if (apptErr) throw new Error("Appointments Insert Hata: " + apptErr.message);
        }
        for(let i=0; i<appointmentServicesToInsert.length; i+=chunkSize) {
            const { error: apptSrvErr } = await supabase.from("appointment_services").insert(appointmentServicesToInsert.slice(i, i+chunkSize));
            if (apptSrvErr) throw new Error("Appointment Services Insert Hata: " + apptSrvErr.message);
        }

        for(let p of sessionPlans) {
            if (p.temp_completed > 0) {
                 await supabase.from('session_plans').update({ completed_sessions: p.temp_completed }).eq('id', p.id);
            }
        }

        revalidatePath('/', 'layout');
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
