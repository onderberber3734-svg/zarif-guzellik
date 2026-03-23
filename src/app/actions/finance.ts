"use server";

import { createClient } from "@/utils/supabase/server";

// 1. Get Finance Summary (Revenue, Collections, Outstanding, Profit)
export async function getFinanceSummary(startDateStr?: string, endDateStr?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

    if (!businessUser) return { success: false, error: "Business not found" };

    try {
        const today = new Date();
        const start = startDateStr ? new Date(startDateStr) : new Date(today.getFullYear(), today.getMonth(), 1);
        const end = endDateStr ? new Date(endDateStr) : today;
        end.setHours(23, 59, 59, 999); // Güne dahil olması için

        // 1. REVENUE & SINGLE SESSION CASH: Tamamlanan Randevular
        const { data: appointments } = await supabase
            .from('appointments')
            .select(`
                id, appointment_date, status,
                services:appointment_services(price_at_booking, session_plan_id)
            `)
            .eq('business_id', businessUser.business_id)
            .eq('status', 'completed')
            .gte('appointment_date', start.toISOString().split('T')[0])
            .lte('appointment_date', end.toISOString().split('T')[0]);

        let totalRevenue = 0;
        let singleSessionCash = 0;

        appointments?.forEach(appt => {
            appt.services?.forEach((srv: any) => {
                const price = Number(srv.price_at_booking) || 0;
                totalRevenue += price;
                if (!srv.session_plan_id) {
                    // Paket dışı işlem bittiyse para cebe (kasaya) girmiştir.
                    singleSessionCash += price;
                }
            });
        });

        // 2. COLLECTIONS FROM PACKAGES: Paket tahsilatları (Gerçek Giren Para)
        const { data: payments } = await supabase
            .from('payments')
            .select('amount, paid_at')
            .eq('business_id', businessUser.business_id)
            .gte('paid_at', start.toISOString())
            .lte('paid_at', end.toISOString());

        const paymentsCash = payments?.reduce((acc, p) => acc + (Number(p.amount) || 0), 0) || 0;
        
        // 🚀 KASA / TOTAL COLLECTIONS: Paketten Kasaya Girenler + Tekil Seanslardan Direkt Alınanlar
        const totalCollections = paymentsCash + singleSessionCash;

        // 3. OUTSTANDING: Bekleyen Alacak (Paketlerden Kalan Toplam Borç)
        const { data: activePlans } = await supabase
            .from('session_plans')
            .select('package_total_price, paid_amount')
            .eq('business_id', businessUser.business_id)
            .eq('status', 'active');

        let totalOutstanding = 0;
        activePlans?.forEach(plan => {
            const total = Number(plan.package_total_price) || 0;
            const paid = Number(plan.paid_amount) || 0;
            if (total > paid) totalOutstanding += (total - paid);
        });

        // 4. EXPENSES: Giderler (Maaş, kira, kozmetik vb.)
        const { data: expenses } = await supabase
            .from('expenses')
            .select('amount')
            .eq('business_id', businessUser.business_id)
            .gte('expense_date', start.toISOString().split('T')[0])
            .lte('expense_date', end.toISOString().split('T')[0]);

        const totalExpenses = expenses?.reduce((acc, e) => acc + (Number(e.amount) || 0), 0) || 0;

        // Net Kâr (Tahsilat bazlı)
        const profit = totalCollections - totalExpenses;

        return {
            success: true,
            data: {
                revenue: totalRevenue,
                collections: totalCollections,
                outstanding: totalOutstanding,
                expenses: totalExpenses,
                profit: profit
            }
        };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 2. Bekleyen Tahsilatlar - Gecikmiş Paketler (Aksiyon Paneli İçin)
export async function getOutstandingPayments() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

    if (!businessUser) return { success: false, error: "Business not found" };

    try {
        // En yüksek borçları olan ve aktif olan paketleri getirelim
        const { data: plans } = await supabase
            .from('session_plans')
            .select(`
                id,
                package_total_price,
                paid_amount,
                next_recommended_date,
                completed_sessions,
                total_sessions,
                status,
                customers (id, first_name, last_name, phone),
                services (id, name)
            `)
            .eq('business_id', businessUser.business_id)
            .eq('status', 'active');
            
        // Filtreleyip sadece borcu olanları alalım
        const outstandingPlans = (plans || [])
            .filter((p: any) => {
                const total = Number(p.package_total_price) || 0;
                const paid = Number(p.paid_amount) || 0;
                return total > paid;
            })
            .sort((a: any, b: any) => {
                // Öncelik: Borcu fazla olanlar ve recommended_date'i geçmiş olanlar öne gelsin
                const aDebt = (Number(a.package_total_price) || 0) - (Number(a.paid_amount) || 0);
                const bDebt = (Number(b.package_total_price) || 0) - (Number(b.paid_amount) || 0);
                return bDebt - aDebt; // Azalan sıranda
            });

        return { success: true, data: outstandingPlans };
    } catch (e: any) {
         return { success: false, error: e.message };
    }
}

// 3. Gider Yönetimi
export async function getExpenses(startDateStr?: string, endDateStr?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

    if (!businessUser) return { success: false, error: "Business not found" };

    try {
        let query = supabase
            .from('expenses')
            .select('*')
            .eq('business_id', businessUser.business_id)
            .order('expense_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (startDateStr) query = query.gte('expense_date', startDateStr);
        if (endDateStr) query = query.lte('expense_date', endDateStr);

        const { data: expenses, error } = await query;
        if (error) throw error;

        return { success: true, data: expenses };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addExpense(expenseData: { expense_date: string, category: string, title: string, amount: number, notes?: string }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

    if (!businessUser) return { success: false, error: "Business not found" };

    try {
        const { error } = await supabase
            .from('expenses')
            .insert({
                business_id: businessUser.business_id,
                ...expenseData
            });

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteExpense(expenseId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

    if (!businessUser) return { success: false, error: "Business not found" };

    try {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', expenseId)
            .eq('business_id', businessUser.business_id);

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getTopServices(startDateStr?: string, endDateStr?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

    if (!businessUser) return { success: false, error: "Business not found" };

    try {
        const today = new Date();
        const start = startDateStr ? new Date(startDateStr) : new Date(today.getFullYear(), today.getMonth(), 1);
        const end = endDateStr ? new Date(endDateStr) : today;
        end.setHours(23, 59, 59, 999); 
        
        const { data: apptServices } = await supabase
            .from('appointment_services')
            .select(`
                price_at_booking,
                services!inner(name),
                appointments!inner(status, appointment_date, business_id)
            `)
            .eq('appointments.business_id', businessUser.business_id)
            .eq('appointments.status', 'completed')
            .gte('appointments.appointment_date', start.toISOString().split('T')[0])
            .lte('appointments.appointment_date', end.toISOString().split('T')[0]);

        const serviceCountAndRev: Record<string, { count: number, revenue: number }> = {};
        
        apptServices?.forEach((asrv: any) => {
            const name = asrv.services?.name;
            if (!name) return;
            const price = Number(asrv.price_at_booking) || 0;
            if (!serviceCountAndRev[name]) {
                serviceCountAndRev[name] = { count: 0, revenue: 0 };
            }
            serviceCountAndRev[name].count += 1;
            serviceCountAndRev[name].revenue += price;
        });

        const sorted = Object.entries(serviceCountAndRev)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5); // top 5

        return { success: true, data: sorted };
    } catch(e:any) {
        return { success: false, error: e.message };
    }
}
