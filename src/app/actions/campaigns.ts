"use server";

import { createClient } from "@/utils/supabase/server";
import { getCustomersWithStats } from "./customers";

export async function getCampaigns() {
    const supabase = await createClient();

    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse?.user) {
        throw new Error("Kullanıcı doğrulanamadı.");
    }

    const { data: businessUser, error: bizError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", userResponse.user.id)
        .single();

    if (bizError || !businessUser?.business_id) {
        throw new Error("İşletme yetkiniz bulunamadı.");
    }

    const { data: campaigns, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq("business_id", businessUser.business_id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Kampanyalar çekilirken hata (Detaylı):", error.message, error.details, error.code, error.hint);
        return [];
    }

    return campaigns || [];
}

export async function getCampaignById(id: string) {
    const supabase = await createClient();

    const { data: campaign, error } = await supabase
        .from('campaigns')
        .select(`
            *,
            campaign_targets(
                *,
                customers(*)
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error("Kampanya detayı çekilirken hata:", error);
        return null;
    }

    return campaign;
}

// Yeni Kampanya Oluşturur ve Snapshot (Hedef Kitle Sabitlemesi) yapar
export async function createCampaign(campaignData: any) {
    const supabase = await createClient();

    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse?.user) {
        throw new Error("Kullanıcı doğrulanamadı.");
    }

    const { data: businessUser, error: businessError } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', userResponse.user.id)
        .single();

    if (businessError || !businessUser) {
        throw new Error("Kullanıcının bağlı olduğu bir işletme bulunamadı.");
    }

    const businessId = businessUser.business_id;

    // Kanalına göre gönderim statüsü belirle (Array logic)
    let sendStatus = 'draft';
    const channels: string[] = campaignData.channel || ['none'];

    // Eğer kanallar içinde SMS, Email, Push vs varsa entegrasyon bekler.
    const hasDigitalChannel = channels.some(ch => ['whatsapp', 'sms', 'email', 'push'].includes(ch));
    if (hasDigitalChannel) {
        sendStatus = 'integration_pending';
    } else if (channels.includes('manual')) {
        sendStatus = 'ready';
    }

    // 1. Kampanyayı oluştur
    const { data: newCampaign, error: insertError } = await supabase
        .from('campaigns')
        .insert({
            business_id: businessId,
            name: campaignData.name,
            description: campaignData.description || null,
            type: campaignData.type,
            offer_type: campaignData.offer_type,
            offer_details: campaignData.offer_details,
            target_segment: campaignData.target_segment,
            channel: channels,
            status: campaignData.status || 'draft',
            send_status: sendStatus,
            start_date: campaignData.start_date || null,
            end_date: campaignData.end_date || null,
            expected_revenue_impact: campaignData.expected_revenue_impact || 0,
            estimated_conversion_count: campaignData.estimated_conversion_count || 0
        })
        .select()
        .single();

    if (insertError) {
        console.error("Kampanya eklenirken hata:", insertError);
        return { success: false, error: insertError.message };
    }

    // 2. Hedef Kitle (Segment) Hesaplama Kural Motoru
    let matchedCustomerIds: string[] = [];

    // Yüksek data read'den kaçınmak yerine, direkt business içindeki tüm müşterileri istatistikleriyle çekip filtreliyoruz (Rule Engine).
    const allCustomers = await getCustomersWithStats();

    if (campaignData.target_segment === 'risk') {
        matchedCustomerIds = allCustomers
            .filter(c => (c.stats.daysSinceLastVisit !== null && c.stats.daysSinceLastVisit > 90) || (c.stats.totalAppointments > 0 && !c.stats.lastVisitDate))
            .map(c => c.id);
    }
    else if (campaignData.target_segment === 'vip') {
        matchedCustomerIds = allCustomers
            .filter(c => c.is_vip === true || c.segment === 'VIP')
            .map(c => c.id);
    }
    else if (campaignData.target_segment === 'new') {
        matchedCustomerIds = allCustomers
            .filter(c => c.stats.totalAppointments === 1) // Sadece 1 kez gelmiş
            .map(c => c.id);
    }
    else if (campaignData.target_segment === 'loyal') {
        matchedCustomerIds = allCustomers
            .filter(c => c.stats.totalAppointments >= 3) // 3 veya daha fazla kez gelmiş
            .map(c => c.id);
    }
    else {
        // all
        matchedCustomerIds = allCustomers.map(c => c.id);
    }

    // 3. Snapshot: Bulunan müşterileri campaign_targets tablosuna ekle
    if (matchedCustomerIds.length > 0) {
        const targetsToInsert = matchedCustomerIds.map(customerId => ({
            campaign_id: newCampaign.id,
            customer_id: customerId,
            status: 'pending'
        }));

        const { error: targetError } = await supabase
            .from('campaign_targets')
            .insert(targetsToInsert);

        if (targetError) {
            console.error("Hedef kitle eklenirken hata:", targetError);
            // Non-blocking, but good to log it
        }

        // 4. Ana kampanya tablosunu gerçek kitle (audience count) sayısı ile güncelle
        await supabase
            .from('campaigns')
            .update({ estimated_audience_count: matchedCustomerIds.length })
            .eq('id', newCampaign.id);
    }

    return { success: true, data: newCampaign, audienceCount: matchedCustomerIds.length };
}

// Hedef Kitle (Segment) Önizleme Fonksiyonu
export async function previewCampaignTargets(segment: string) {
    const allCustomers = await getCustomersWithStats();
    let matchedCustomers = [];

    if (segment === 'risk') {
        matchedCustomers = allCustomers.filter(c => (c.stats.daysSinceLastVisit !== null && c.stats.daysSinceLastVisit > 90) || (c.stats.totalAppointments > 0 && !c.stats.lastVisitDate));
    }
    else if (segment === 'vip') {
        matchedCustomers = allCustomers.filter(c => c.is_vip === true || c.segment === 'VIP');
    }
    else if (segment === 'new') {
        matchedCustomers = allCustomers.filter(c => c.stats.totalAppointments === 1);
    }
    else if (segment === 'loyal') {
        matchedCustomers = allCustomers.filter(c => c.stats.totalAppointments >= 3);
    }
    else {
        matchedCustomers = allCustomers;
    }

    return {
        count: matchedCustomers.length,
        sample: matchedCustomers.slice(0, 5).map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, phone: c.phone, lastVisit: c.stats.lastVisitDate }))
    };
}

// Kampanya durumunu günceller
export async function updateCampaignStatus(id: string, newStatus: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }
    return { success: true };
}

// AI İsteklerini ve Sonuçlarını Loglamak İçin Sistem Metodu
export async function logAiAction(moduleStr: string, promptText: string, responseText: string | null, errorMsg: string | null, durationMs: number) {
    const supabase = await createClient();

    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse?.user) return; // Silent fail if auth error

    const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', userResponse.user.id)
        .single();

    if (!businessUser) return;

    await supabase
        .from('ai_logs')
        .insert({
            business_id: businessUser.business_id,
            module: moduleStr,
            prompt: promptText,
            response: responseText,
            error_message: errorMsg,
            duration_ms: durationMs
        });
}
