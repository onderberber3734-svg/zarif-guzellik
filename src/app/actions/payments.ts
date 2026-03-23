"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function addPayment(data: {
    customer_id: string;
    session_plan_id?: string;
    appointment_id?: string;
    amount: number;
    payment_method: 'cash' | 'credit_card' | 'bank_transfer' | 'other';
    notes?: string;
}) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: "Oturum açmanız gerekiyor." };
    }

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (bizError || !businessUser?.business_id) {
        return { success: false, error: "İşletme bulunamadı." };
    }

    try {
        // 1. Ödemeyi kaydet
        const { data: payment, error: paymentError } = await supabase
            .from("payments")
            .insert({
                business_id: businessUser.business_id,
                customer_id: data.customer_id,
                session_plan_id: data.session_plan_id || null,
                appointment_id: data.appointment_id || null,
                amount: data.amount,
                payment_method: data.payment_method,
                notes: data.notes || '',
            })
            .select()
            .single();

        if (paymentError) throw paymentError;

        // 2. Eğer session_plan_id var ise session_planes'ı güncelle (paid_amount artır)
        if (data.session_plan_id) {
            // Mevcut session_plan çek
            const { data: plan, error: planError } = await supabase
                .from("session_plans")
                .select("paid_amount, package_total_price")
                .eq("id", data.session_plan_id)
                .single();

            if (planError) throw planError;

            const newPaidAmount = (Number(plan.paid_amount) || 0) + Number(data.amount);
            let payment_status = 'partial';

            if (plan.package_total_price && newPaidAmount >= Number(plan.package_total_price)) {
                payment_status = 'paid';
            }

            const { error: updateError } = await supabase
                .from("session_plans")
                .update({
                    paid_amount: newPaidAmount,
                    payment_status: payment_status
                })
                .eq("id", data.session_plan_id);

            if (updateError) throw updateError;
        }

        revalidatePath("/musteriler/" + data.customer_id);
        revalidatePath("/musteriler");
        revalidatePath("/paket-seans");

        return { success: true, data: payment };
    } catch (err: any) {
        console.error("Ödeme ekleme hatası:", err.message);
        return { success: false, error: err.message || "Bilinmeyen hata" };
    }
}
