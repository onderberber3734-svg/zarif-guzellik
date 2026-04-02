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

    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse?.user) {
        return null;
    }

    const { data: businessUser, error: businessError } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", userResponse.user.id)
        .single();

    if (businessError || !businessUser?.business_id) {
        return null;
    }

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
        .eq('business_id', businessUser.business_id)
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

    // UUID kontrolü (Özel segment mi?)
    const isCustomSegment = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignData.target_segment);

    if (isCustomSegment) {
        const { data: members } = await supabase
            .from('campaign_segment_members')
            .select('customer_id')
            .eq('segment_id', campaignData.target_segment);
        if (members) {
            matchedCustomerIds = members.map(m => m.customer_id);
        }
    } else {
        // Standart Kural Motoru
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
    const isCustomSegment = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

    if (isCustomSegment) {
        const details = await getSegmentDetails(segment);
        if (details) return { count: details.count, sample: details.sample, name: details.name };
    }

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
        sample: matchedCustomers.slice(0, 100).map(c => ({ id: c.id, name: `${c.first_name} ${c.last_name}`, phone: c.phone, lastVisit: c.stats.lastVisitDate })),
        name: undefined
    };
}

// Kampanya durumunu günceller (Status: active, paused, draft, vb.)
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

// Kampanyayı tamamen siler
export async function deleteCampaign(id: string) {
    const supabase = await createClient();

    // RLS will ensure users can only delete their own business's campaigns
    const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }
    return { success: true };
}

// Kampanya detaylarını günceller (Edit form action)
export async function updateCampaignDetails(id: string, campaignData: any) {
    const supabase = await createClient();

    // Kanalına göre gönderim statüsü belirle (Array logic)
    let sendStatus = 'draft';
    const channels: string[] = campaignData.channel || ['none'];

    if (channels.some(ch => ['whatsapp', 'sms', 'email', 'push'].includes(ch))) {
        sendStatus = 'integration_pending';
    } else if (channels.includes('manual')) {
        sendStatus = 'ready';
    }

    const { data: updatedCampaign, error: updateError } = await supabase
        .from('campaigns')
        .update({
            name: campaignData.name,
            description: campaignData.description || null,
            offer_type: campaignData.offer_type,
            offer_details: campaignData.offer_details,
            target_segment: campaignData.target_segment,
            channel: channels,
            send_status: sendStatus,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (updateError) {
        console.error("Kampanya güncellenirken hata:", updateError);
        return { success: false, error: updateError.message };
    }

    return { success: true, data: updatedCampaign };
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

// Kampanyadan dönüş yapan müşterileri (converted) getirir
export async function getConvertedTargets(campaignId: string) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Yetkisiz erişim");

    const { data, error } = await supabase
        .from('campaign_targets')
        .select(`
            id,
            status,
            converted_at,
            converted_appointment_id,
            customers(first_name, last_name, phone)
        `)
        .eq('campaign_id', campaignId)
        .eq('status', 'converted')
        .order('converted_at', { ascending: false });

    if (error) {
        console.error("Dönüşen müşteriler çekilirken hata:", error);
        return [];
    }

    return data || [];
}

// --------------------------------------------------------------------------------------
// Akıllı Boş Slot Hedefleme (Time Slot Affinity) Algoritması
// --------------------------------------------------------------------------------------

export async function getTimeSlotAffinityAudience(supabase: any, businessId: string, emptySlots: {date: string, time: string}[]) {
    if (!emptySlots || emptySlots.length === 0) return { audience: [], summary: "Boş slot yok." };

    // Sadece ilk günün slotlarına odaklan (hepsi aynı gün kabul ediliyor)
    const targetDate = new Date(emptySlots[0].date);
    const targetWeekday = targetDate.getDay(); // 0: Sun, 1: Mon, ...
    
    // Algoritma: 
    // 1. Son 90 günün tüm tamamlanmış randevularını çek
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyStr = ninetyDaysAgo.toISOString().split("T")[0];

    // 2. Müşterilerin paket/seans gecikmelerini de çekmek için session_plans
    const { data: appointments } = await supabase
        .from("appointments")
        .select(`
            customer_id, appointment_date, appointment_time, status,
            customers (id, first_name, last_name, phone),
            appointment_services (service_id)
        `)
        .eq("business_id", businessId)
        .eq("status", "completed")
        .gte("appointment_date", ninetyStr);

    const { data: activePlans } = await supabase
        .from("session_plans")
        .select("customer_id, next_recommended_date")
        .eq("business_id", businessId)
        .eq("status", "active");

    const overdueCustomerIds = new Set(
        (activePlans || [])
        .filter((p: any) => p.next_recommended_date && new Date(p.next_recommended_date) < new Date())
        .map((p: any) => p.customer_id)
    );

    const customerScores = new Map<string, { id: string, name: string, score: number, reasons: string[], excluded: boolean, last_visit_days: number, slot_match_count: number }>();

    (appointments || []).forEach((a: any) => {
        if (!a.customers) return;
        const cid = a.customer_id;
        const cname = `${a.customers.first_name || ''} ${a.customers.last_name || ''}`.trim();

        if (!customerScores.has(cid)) {
            customerScores.set(cid, { 
                id: cid, 
                name: cname, 
                score: 0, 
                reasons: [], 
                excluded: false,
                last_visit_days: 999,
                slot_match_count: 0
            });
        }
        const cData = customerScores.get(cid)!;

        // Skip processing if already excluded
        if (cData.excluded) return;

        const aDate = new Date(a.appointment_date);
        const aWeekday = aDate.getDay();
        const daysSinceAppt = Math.floor((new Date().getTime() - aDate.getTime()) / (1000 * 60 * 60 * 24));
        
        cData.last_visit_days = Math.min(cData.last_visit_days, daysSinceAppt);

        // EXCLUSION CHECK (A) - Genel Ziyaret Kontrolü
        // Eğer müşteri son 14 gün içinde herhangi bir hizmet aldıysa, onu bu boş slot hedef kitlesinden KESİNLİKLE DÜŞÜYORUZ.
        // Bu sayede "daha 5 gün önce gelmiş" müşteriye spam kampanya atılmıyor.
        if (daysSinceAppt <= 14) {
            cData.excluded = true;
            return;
        }

        // DİKKAT: Spesifik Hizmet Kontrolü (Aşırmalı koruma) artık evaluateCampaignExclusions içinde post-AI olarak dinamik kontrol edilecek. Müşterinin spesifik olarak aynı hizmeti veya paketi alıp almadığı burada kontrol edilmez.

        
        // Time match check
        const aTimeMin = a.appointment_time ? parseInt(a.appointment_time.split(":")[0]) * 60 + parseInt(a.appointment_time.split(":")[1]) : -1;
        
        let timeMatched = false;
        if (aWeekday === targetWeekday) {
            for (const slot of emptySlots) {
                const sTimeMin = parseInt(slot.time.split(":")[0]) * 60 + parseInt(slot.time.split(":")[1]);
                if (Math.abs(sTimeMin - aTimeMin) <= 60) {
                    timeMatched = true;
                    break;
                }
            }
        }

        if (timeMatched) {
            cData.slot_match_count += 1;
            if (!cData.reasons.includes("slot_match")) {
                cData.score += 40;
                cData.reasons.push("slot_match"); // Aynı gün ve saatte geldi
            }
        }

        if (daysSinceAppt <= 30 && !cData.reasons.includes("recent_visit")) {
            cData.score += 25;
            cData.reasons.push("recent_visit"); // Son 1 ayda aktif
        }
    });

    // Add overdue packet bonus
    for (const [cid, cData] of customerScores.entries()) {
        if (cData.excluded) continue;
        
        if (overdueCustomerIds.has(cid)) {
            cData.score += 10;
            cData.reasons.push("overdue_session"); // Gecikmiş seansı var
        }
    }

    // Bütün eşleşen kitleyi al (Yapay sınırları kaldır)
    const sortedAudience = Array.from(customerScores.values())
        .filter(c => c.score > 0 && !c.excluded)
        .sort((a, b) => b.score - a.score);

    const summary = sortedAudience.length > 0
        ? `Bu saatlerde daha önce gelmiş ${sortedAudience.length} kişi tespit edildi.`
        : "Bu slotlara özel güçlü eşleşme bulunamadı.";

    return { audience: sortedAudience, summary };
}

export async function createSegmentFromAudience(segmentType: string, segmentName: string, sourceContext: any, audienceParams: {id: string, score: number}[]) {
    const supabase = await createClient();

    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse?.user) {
        throw new Error("Kullanıcı doğrulanamadı.");
    }

    const { data: businessUser, error: bizError } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', userResponse.user.id)
        .single();

    if (bizError || !businessUser?.business_id) {
        throw new Error("İşletme yetkiniz bulunamadı.");
    }

    const businessId = businessUser.business_id;

    // 1. Create segment
    const { data: segment, error: segmentError } = await supabase
        .from('campaign_segments')
        .insert({
            business_id: businessId,
            type: segmentType,
            name: segmentName,
            source_context: sourceContext
        })
        .select('id')
        .single();

    if (segmentError) {
        console.error("Segment oluşturulurken hata:", segmentError);
        return { success: false, error: segmentError.message };
    }

    // 2. Insert members
    if (audienceParams && audienceParams.length > 0) {
        const membersToInsert = audienceParams.map(a => ({
            business_id: businessId,
            segment_id: segment.id,
            customer_id: a.id,
            score: a.score || 0
        }));

        const { error: membersError } = await supabase
            .from('campaign_segment_members')
            .insert(membersToInsert);

        if (membersError) {
             console.error("Segment üyeleri eklenirken hata:", membersError);
             return { success: false, error: membersError.message };
        }
    }

    return { success: true, segment_id: segment.id };
}

export async function getSegmentDetails(segmentId: string) {
    if (!segmentId) return null;
    
    const supabase = await createClient();
    
    // Check auth/business to conform with existing RLS
    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    if (userError || !userResponse?.user) return null;

    const { data: businessUser } = await supabase
        .from('business_users')
        .select('business_id')
        .eq('user_id', userResponse.user.id)
        .single();

    if (!businessUser) return null;

    // Fetch segment info
    const { data: segment } = await supabase
        .from('campaign_segments')
        .select('*')
        .eq('id', segmentId)
        .eq('business_id', businessUser.business_id)
        .single();
        
    if (!segment) return null;

    // Fetch members with limited details
    const { data: members } = await supabase
        .from('campaign_segment_members')
        .select('customer_id, customers(first_name, last_name, phone)')
        .eq('segment_id', segmentId);

    const formattedMembers = (members || []).map(m => {
        const c = Array.isArray(m.customers) ? m.customers[0] : m.customers;
        return {
            id: m.customer_id,
            name: `${(c as any)?.first_name || ''} ${(c as any)?.last_name || ''}`.trim(),
            phone: (c as any)?.phone
        };
    });

    return {
        id: segment.id,
        name: segment.name,
        type: segment.type,
        count: formattedMembers.length,
        sample: formattedMembers.slice(0, 100),
        source_context: segment.source_context
    };
}

export async function evaluateCampaignExclusions(baseAudience: any[], serviceId: string, businessId: string) {
    if (!serviceId) return { audience: baseAudience, stats: { total: 0, active_plan: 0, planned_appointment: 0, recent_same_service: 0, recent_category: 0 } };

    const supabase = await createClient();

    // Kampanya hizmetinin adını ve kategorisini al
    const { data: svc } = await supabase.from('services').select('id, name, category').eq('id', serviceId).single();
    const serviceName = svc?.name || "";
    const category = svc?.category;

    // Aynı hizmet adını içeren TÜM servis/paket ID'lerini bul
    // Örn: "Bacak + Koltuk Altı Lazer" → "Lazer" kelimesiyle "Tüm Vücut Lazer" de yakalanmalı
    let relatedServiceIds = [serviceId];
    if (serviceName) {
        // Hizmet adından anlamlı anahtar kelimeleri çıkar (stop word'leri filtrele)
        const stopWords = ['ve', 'ile', 'için', 'bir', 'altı', 'üstü', 'ön', 'arka', 'paket', 'paketi', 'seans', 'seansı', '+', '/', '(', ')'];
        const keywords = serviceName
            .split(/[\s+\/\(\),]+/)
            .map((w: string) => w.trim())
            .filter((w: string) => w.length >= 3 && !stopWords.includes(w.toLowerCase()));
        
        // Her anahtar kelime ile eşleşen servisleri bul
        const allRelatedIds = new Set([serviceId]);
        for (const keyword of keywords) {
            const { data: matchedServices } = await supabase
                .from('services')
                .select('id, name')
                .eq('business_id', businessId)
                .ilike('name', `%${keyword}%`);
            
            if (matchedServices) {
                matchedServices.forEach((s: any) => allRelatedIds.add(s.id));
            }
        }
        
        relatedServiceIds = [...allRelatedIds];
    }

    // A) Active Plan Exclusions — Aktif paketi/seans planı olan müşteriler (ilişkili TÜM service_id'ler kontrol edilir)
    const { data: activePlans } = await supabase
        .from('session_plans')
        .select('customer_id')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .in('service_id', relatedServiceIds);

    const activePlanCusts = new Set((activePlans || []).map((p: any) => p.customer_id));

    // D) Planned/Upcoming Appointment Exclusion — İleri tarihli randevusu olan müşteriler (ilişkili TÜM service_id'ler)
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
    const { data: plannedAppts } = await supabase
        .from('appointments')
        .select(`
            customer_id,
            appointment_services (service_id)
        `)
        .eq('business_id', businessId)
        .in('status', ['scheduled', 'checked_in'])
        .gte('appointment_date', todayStr);

    const plannedSameServiceCusts = new Set<string>();
    (plannedAppts || []).forEach((a: any) => {
        const srvs = Array.isArray(a.appointment_services) ? a.appointment_services : [a.appointment_services];
        for (const s of srvs) {
            if (!s) continue;
            if (relatedServiceIds.includes(String(s.service_id))) {
                plannedSameServiceCusts.add(a.customer_id);
            }
        }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyStr = thirtyDaysAgo.toISOString().split("T")[0];

    const { data: recentAppts } = await supabase
        .from('appointments')
        .select(`
            customer_id, appointment_date,
            appointment_services (service_id, services(category))
        `)
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .gte('appointment_date', thirtyStr);

    const recentSameServiceCusts = new Set<string>();
    const recentCategoryCusts = new Set<string>();

    (recentAppts || []).forEach((a: any) => {
        const srvs = Array.isArray(a.appointment_services) ? a.appointment_services : [a.appointment_services];
        const daysSinceAppt = Math.floor((new Date().getTime() - new Date(a.appointment_date).getTime()) / (1000 * 60 * 60 * 24));
        
        for (const s of srvs) {
            if (!s) continue;
            // B) 30-day same service
            if (String((s as any).service_id) === String(serviceId)) {
                recentSameServiceCusts.add(a.customer_id);
            }
            // C) 14-day same category
            if (category && (s as any).services?.category === category && daysSinceAppt <= 14) {
                recentCategoryCusts.add(a.customer_id);
            }
        }
    });

    const finalAudience = [];
    let excludedActivePlan = 0;
    let excludedPlannedAppt = 0;
    let excludedRecentService = 0;
    let excludedRecentCategory = 0;

    for (const member of baseAudience) {
        if (activePlanCusts.has(member.id)) {
            excludedActivePlan++;
        } else if (plannedSameServiceCusts.has(member.id)) {
            excludedPlannedAppt++;
        } else if (recentSameServiceCusts.has(member.id)) {
            excludedRecentService++;
        } else if (recentCategoryCusts.has(member.id)) {
            excludedRecentCategory++;
        } else {
            finalAudience.push(member);
        }
    }

    const totalExcluded = excludedActivePlan + excludedPlannedAppt + excludedRecentService + excludedRecentCategory;

    return {
        audience: finalAudience,
        stats: {
            total: totalExcluded,
            active_plan: excludedActivePlan,
            planned_appointment: excludedPlannedAppt,
            recent_same_service: excludedRecentService,
            recent_category: excludedRecentCategory
        }
    };
}

export async function createDraftFromAi(alternative: any) {
    const supabase = await createClient();
    const { data: userResponse } = await supabase.auth.getUser();
    if (!userResponse?.user) throw new Error("Kullanıcı doğrulanamadı.");
    
    const { data: businessUser } = await supabase.from('business_users').select('business_id').eq('user_id', userResponse.user.id).single();
    if (!businessUser) throw new Error("İşletme yetkiniz bulunamadı.");
    const businessId = businessUser.business_id;

    // 1) Kitle belirleme: Reminder mı yoksa normal kampanya mı?
    let audience: any[] = [];
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
    const validDates = Array.isArray(alternative.valid_dates) ? alternative.valid_dates : [];

    if (alternative.offer_type === 'reminder') {
        // Reminder tipi: Gerçekten gecikmiş (gelecek randevusu OLMAYAN) müşterileri kullan
        const currentDate = todayStr;
        const { data: overduePlans } = await supabase
            .from("session_plans")
            .select(`
                customer_id,
                appointment_services (
                    id,
                    appointments:appointment_id (id, appointment_date, status)
                )
            `)
            .eq('business_id', businessId)
            .eq('status', 'active')
            .lt('next_recommended_date', currentDate);
        
        const seenIds = new Set<string>();
        audience = (overduePlans || []).filter((p: any) => {
            // Zaten gelecek randevusu varsa, gecikmiş değil
            const hasFutureAppt = (p.appointment_services || []).some((as: any) => {
                const apt = as.appointments;
                return apt && apt.appointment_date >= currentDate && 
                       (apt.status === 'scheduled' || apt.status === 'checked_in');
            });
            if (hasFutureAppt) return false;
            
            // Deduplike
            if (seenIds.has(p.customer_id)) return false;
            seenIds.add(p.customer_id);
            return true;
        }).map((p: any) => ({ id: p.customer_id, score: 100 }));
    } else {
        // Normal kampanya: exclusion kurallarını uygula
        const emptySlots = validDates
            .filter((slot: any) => slot?.date && slot?.time)
            .map((slot: any) => ({ date: slot.date, time: slot.time }));

        if (emptySlots.length === 0) {
            throw new Error("Taslak oluşturulamadı: geçerli slot bilgisi bulunamadı.");
        }

        const { audience: baseAudience } = await getTimeSlotAffinityAudience(supabase, businessId, emptySlots);
        const result = await evaluateCampaignExclusions(baseAudience, alternative.service_id, businessId);
        audience = result.audience;
    }

    if (audience.length === 0) {
        throw new Error("Bu hizmet için hedeflenebilecek uygun müşteri bulunamadı.");
    }

    const draftFingerprint = JSON.stringify({
        concept_name: alternative.concept_name || "",
        service_id: alternative.service_id || "",
        offer_type: alternative.offer_type || "",
        offer_value: alternative.offer_value || "",
        message: alternative.message_templates?.[0]?.content || "",
        valid_dates: validDates
    });

    let segment_id: string | null = null;
    const { data: existingSegment } = await supabase
        .from("campaign_segments")
        .select("id")
        .eq("business_id", businessId)
        .contains("source_context", { draft_fingerprint: draftFingerprint })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingSegment?.id) {
        segment_id = existingSegment.id;
    }

    // 3) Create Segment
    const internalAudience = audience.map((a: any) => ({ id: a.id, score: a.score || 0 }));
    if (!segment_id) {
        const segmentName = `AI Draft: ${alternative.concept_name || alternative.service_name || 'Hedef Kitle'}`;
        const createSegResult = await createSegmentFromAudience("ai_generated", segmentName, {
            service: alternative.service_id,
            draft_fingerprint: draftFingerprint,
            valid_dates: validDates
        }, internalAudience);

        if (!createSegResult.success || !createSegResult.segment_id) {
            throw new Error("Segment oluşturulamadı: " + createSegResult.error);
        }

        segment_id = createSegResult.segment_id;
    }

    // 4) Create Draft Campaign (gerçek DB şemasına uygun)
    const offerDetails: any = {
        service_id: alternative.service_id,
        service_name: alternative.service_name || "",
        offer_value: alternative.offer_value || "",
        message: alternative.message_templates?.[0]?.content || "",
        valid_dates: validDates
    };

    const draftPayload = {
        business_id: businessId,
        name: alternative.concept_name || "AI Kampanyası",
        description: alternative.description || null,
        type: "custom",
        offer_type: alternative.offer_type || "fixed_discount",
        offer_details: offerDetails,
        target_segment: segment_id,
        channel: ["whatsapp"],
        status: "draft",
        send_status: "draft",
        start_date: validDates[0]?.date || null,
        end_date: validDates.length > 0 ? validDates[validDates.length - 1]?.date || null : null,
        estimated_audience_count: audience.length
    };

    const { data: existingDraft } = await supabase
        .from("campaigns")
        .select("id")
        .eq("business_id", businessId)
        .eq("status", "draft")
        .eq("name", draftPayload.name)
        .eq("target_segment", segment_id)
        .maybeSingle();

    let draft = existingDraft;
    let campErr: any = null;

    if (existingDraft?.id) {
        const result = await supabase
            .from("campaigns")
            .update(draftPayload)
            .eq("id", existingDraft.id)
            .select("id")
            .single();

        draft = result.data;
        campErr = result.error;
    } else {
        const result = await supabase
            .from("campaigns")
            .insert(draftPayload)
            .select("id")
            .single();

        draft = result.data;
        campErr = result.error;
    }

    if (campErr || !draft) throw new Error("Taslak oluşturulamadı: " + (campErr?.message || "Bilinmeyen hata"));

    return { success: true, draft_id: draft.id, segment_id };
}

// ═══════════════════════════════════════════════════════
// AI CHAT FİLTRELİ KAMPANYA SİSTEMİ
// 1) filterCustomersByAiCriteria — ortak filtre mantığı
// 2) previewFilteredAudience — anlık önizleme (chat kartı)
// 3) createFilteredCampaignDraft — segment + kampanya oluştur
// ═══════════════════════════════════════════════════════

export interface AiCampaignFilters {
    min_days_inactive?: number | null;
    max_days_inactive?: number | null;
    service_name_filter?: string | null;
    exclude_service_name?: string | null;
    min_visits?: number | null;
    max_visits?: number | null;
    min_total_spent?: number | null;
}

function normalizeFilterString(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.toLocaleLowerCase("tr-TR").trim();
    return normalized.length > 0 ? normalized : null;
}

function normalizeFilterNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function sanitizeAiCampaignFilters(filters: AiCampaignFilters | Record<string, unknown> | null | undefined): AiCampaignFilters {
    return {
        min_days_inactive: normalizeFilterNumber(filters?.min_days_inactive),
        max_days_inactive: normalizeFilterNumber(filters?.max_days_inactive),
        service_name_filter: normalizeFilterString(filters?.service_name_filter),
        exclude_service_name: normalizeFilterString(filters?.exclude_service_name),
        min_visits: normalizeFilterNumber(filters?.min_visits),
        max_visits: normalizeFilterNumber(filters?.max_visits),
        min_total_spent: normalizeFilterNumber(filters?.min_total_spent)
    };
}

// ── ORTAK FİLTRE FONKSİYONU ──────────────────────────
async function filterCustomersByAiCriteria(
    supabase: any,
    businessId: string,
    filters: AiCampaignFilters
): Promise<{ audience: { id: string; name: string; score: number; daysSince: number }[]; stats: { total: number; excluded_active_plan: number; excluded_future_appt: number; filtered_out: number } }> {
    const safeFilters = sanitizeAiCampaignFilters(filters);

    // ═══ AYRI SORGULAR (nested join güvenilmez) ═══

    // 1) Tüm müşteriler
    const { data: allCustomers } = await supabase
        .from("customers")
        .select("id, first_name, last_name, phone")
        .eq("business_id", businessId);

    if (!allCustomers || allCustomers.length === 0) {
        return { audience: [], stats: { total: 0, excluded_active_plan: 0, excluded_future_appt: 0, filtered_out: 0 } };
    }

    // 2) Tüm randevular + hizmet bilgileri (2 kademe: appointments → appointment_services → services)
    //    ÖNEMLİ: appointment_services tablosunda business_id yok!
    //    Bu yüzden appointments tablosundan başlayarak nested select yapıyoruz.
    const { data: allAppointments } = await supabase
        .from("appointments")
        .select("id, customer_id, appointment_date, status, total_price, appointment_services(service_id, services:service_id(name))")
        .eq("business_id", businessId);

    // 4) Aktif seans planları
    const { data: activePlans } = await supabase
        .from("session_plans")
        .select("customer_id, services:service_id (name)")
        .eq("business_id", businessId)
        .eq("status", "active");

    // ═══ HARITALARI OLUŞTUR ═══

    // appointment_id → hizmet adları listesi (allAppointments'ın nested appointment_services verisinden)
    const apptServiceMap = new Map<string, string[]>();
    let totalServiceLinks = 0;
    (allAppointments || []).forEach((a: any) => {
        const svcs: string[] = [];
        (a.appointment_services || []).forEach((as: any) => {
            const name = as.services?.name?.toLowerCase() || "";
            if (name) {
                svcs.push(name);
                totalServiceLinks++;
            }
        });
        if (svcs.length > 0) {
            apptServiceMap.set(a.id, svcs);
        }
    });

    // customer_id → randevu listesi (hizmet adlarıyla zenginleştirilmiş)
    const customerApptMap = new Map<string, { id: string; date: string; status: string; price: number; services: string[] }[]>();
    (allAppointments || []).forEach((a: any) => {
        if (!customerApptMap.has(a.customer_id)) customerApptMap.set(a.customer_id, []);
        customerApptMap.get(a.customer_id)!.push({
            id: a.id,
            date: a.appointment_date,
            status: a.status,
            price: Number(a.total_price) || 0,
            services: apptServiceMap.get(a.id) || []
        });
    });

    // customer_id → aktif seans planı hizmet adları
    const activePlanMap = new Map<string, string[]>();
    (activePlans || []).forEach((p: any) => {
        if (!activePlanMap.has(p.customer_id)) activePlanMap.set(p.customer_id, []);
        const sn = p.services?.name;
        if (sn) activePlanMap.get(p.customer_id)!.push(sn.toLowerCase());
    });

    // Gelecek randevular → customer_id → hizmet adları
    const nowStr = new Date().toISOString().split("T")[0];
    const futureMap = new Map<string, string[]>();
    (allAppointments || []).forEach((a: any) => {
        if (a.appointment_date >= nowStr && ["scheduled", "confirmed", "checked_in"].includes(a.status)) {
            if (!futureMap.has(a.customer_id)) futureMap.set(a.customer_id, []);
            const svcs = apptServiceMap.get(a.id) || [];
            futureMap.get(a.customer_id)!.push(...svcs);
        }
    });

    // ═══ FİLTRELEME ═══
    const today = new Date();
    const audience: { id: string; name: string; score: number; daysSince: number }[] = [];
    let exPlan = 0, exFuture = 0, exFilter = 0;
    const svcFilter = safeFilters.service_name_filter || null;
    const excludeSvcFilter = safeFilters.exclude_service_name || null;

    console.log(`[AI-Filter] Filtreler:`, JSON.stringify(safeFilters));
    console.log(`[AI-Filter] Toplam müşteri: ${allCustomers.length}, randevu: ${(allAppointments||[]).length}, hizmet bağlantısı: ${totalServiceLinks}`);

    for (const c of allCustomers) {
        const appts = customerApptMap.get(c.id) || [];
        const done = appts.filter(a => a.status === "completed");

        // Hiç completed randevusu yok → sadece geçmiş veriye ihtiyaç duyan filtreler varsa atla
        const needsVisitHistory = (safeFilters.min_days_inactive != null && safeFilters.min_days_inactive > 0) || 
                                   safeFilters.min_visits != null || 
                                   safeFilters.min_total_spent != null ||
                                   !!svcFilter;
        if (done.length === 0 && needsVisitHistory) { exFilter++; continue; }

        // ── EXCLUSION: Aktif seans planı & gelecek randevu ──
        const isTargetingInactive = safeFilters.min_days_inactive != null && safeFilters.min_days_inactive > 0;
        const isServiceSpecific = !!svcFilter || !!excludeSvcFilter;
        const shouldExcludeActive = isTargetingInactive || isServiceSpecific;

        if (shouldExcludeActive) {
            const relevantSvc = svcFilter || excludeSvcFilter;
            if (activePlanMap.has(c.id)) {
                const plans = activePlanMap.get(c.id)!;
                if (relevantSvc) {
                    if (plans.some(s => s.includes(relevantSvc))) { exPlan++; continue; }
                } else { exPlan++; continue; }
            }
            if (futureMap.has(c.id)) {
                const fsvcs = futureMap.get(c.id)!;
                if (relevantSvc) {
                    if (fsvcs.some(s => s.includes(relevantSvc))) { exFuture++; continue; }
                } else { exFuture++; continue; }
            }
        }

        // ── min/max visits ──
        if (safeFilters.min_visits != null && done.length < safeFilters.min_visits) { exFilter++; continue; }
        if (safeFilters.max_visits != null && done.length > safeFilters.max_visits) { exFilter++; continue; }

        // ── min_total_spent ──
        if (safeFilters.min_total_spent != null) {
            const spent = done.reduce((s, a) => s + a.price, 0);
            if (spent < safeFilters.min_total_spent) { exFilter++; continue; }
        }

        // ── Son ziyaret → kaç gün önceydi ──
        let daysSince = 0;
        if (done.length > 0) {
            const sorted = [...done].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            daysSince = Math.floor((today.getTime() - new Date(sorted[0].date).getTime()) / 86400000);
        }
        if (safeFilters.min_days_inactive != null && daysSince < safeFilters.min_days_inactive) { exFilter++; continue; }
        if (safeFilters.max_days_inactive != null && daysSince > safeFilters.max_days_inactive) { exFilter++; continue; }

        // ── service_name_filter: Bu hizmeti ALMIŞ olmalı ──
        if (svcFilter) {
            const allCustomerSvcs = appts.flatMap(a => a.services);
            const has = allCustomerSvcs.some(s => s.includes(svcFilter));
            if (!has) { exFilter++; continue; }
        }

        // ── exclude_service_name: Bu hizmeti HİÇ ALMMAMIŞ olmalı ──
        if (excludeSvcFilter) {
            const allCustomerSvcs = appts.flatMap(a => a.services);
            const hasService = allCustomerSvcs.some(s => s.includes(excludeSvcFilter));
            if (hasService) { exFilter++; continue; }
        }

        audience.push({ id: c.id, name: `${c.first_name || ""} ${c.last_name || ""}`.trim(), score: Math.min(100, Math.max(daysSince, 1)), daysSince });
    }

    console.log(`[AI-Filter] SONUÇ: ${allCustomers.length} müşteri → ${audience.length} eşleşti (hariç: ${exPlan} aktif plan, ${exFuture} gelecek randevu, ${exFilter} filtre)`);
    return { audience, stats: { total: allCustomers.length, excluded_active_plan: exPlan, excluded_future_appt: exFuture, filtered_out: exFilter } };
}

// ── PREVIEW: Chat kartı AI filtreleriyle anında gerçek kişi sayısı gösterir ──
export async function previewFilteredAudience(filters: AiCampaignFilters) {
    const supabase = await createClient();
    const { data: userResponse } = await supabase.auth.getUser();
    if (!userResponse?.user) return { success: false, count: 0, sample: [], stats: null };
    const { data: businessUser } = await supabase.from('business_users').select('business_id').eq('user_id', userResponse.user.id).single();
    if (!businessUser) return { success: false, count: 0, sample: [], stats: null };

    const result = await filterCustomersByAiCriteria(supabase, businessUser.business_id, sanitizeAiCampaignFilters(filters));
    return {
        success: true,
        count: result.audience.length,
        sample: result.audience.slice(0, 5).map(c => ({ name: c.name, daysSince: c.daysSince })),
        stats: result.stats
    };
}

// ── CREATE: Segment + taslak kampanya oluştur ──
export async function createFilteredCampaignDraft(
    campaignInfo: { concept_name: string; description: string; offer_type: string; offer_value: string; message_content: string },
    filters: AiCampaignFilters
) {
    const supabase = await createClient();
    const { data: userResponse } = await supabase.auth.getUser();
    if (!userResponse?.user) throw new Error("Kullanıcı doğrulanamadı.");
    const { data: businessUser } = await supabase.from('business_users').select('business_id').eq('user_id', userResponse.user.id).single();
    if (!businessUser) throw new Error("İşletme yetkiniz bulunamadı.");
    const businessId = businessUser.business_id;

    const safeFilters = sanitizeAiCampaignFilters(filters);
    const { audience } = await filterCustomersByAiCriteria(supabase, businessId, safeFilters);
    if (audience.length === 0) return { success: false, error: "Bu filtrelere uyan müşteri bulunamadı. AI'a farklı kriterler söylemeyi deneyin." } as any;

    const internalAudience = audience.map(a => ({ id: a.id, score: a.score }));
    const segResult = await createSegmentFromAudience("ai_generated", `AI Chat: ${campaignInfo.concept_name}`, { filters: JSON.stringify(safeFilters) }, internalAudience);
    if (!segResult.success || !segResult.segment_id) throw new Error("Segment oluşturulamadı: " + segResult.error);

    const { data: draft, error: campErr } = await supabase.from('campaigns').insert({
        business_id: businessId,
        name: campaignInfo.concept_name,
        description: campaignInfo.description || null,
        type: "custom",
        offer_type: campaignInfo.offer_type || "percentage_discount",
        offer_details: { offer_value: campaignInfo.offer_value, message: campaignInfo.message_content, ai_filters: filters },
        target_segment: segResult.segment_id,
        channel: ["whatsapp"],
        status: "draft",
        send_status: "draft",
        estimated_audience_count: audience.length
    }).select('id').single();

    if (campErr || !draft) throw new Error("Taslak oluşturulamadı: " + (campErr?.message || ""));
    return { success: true, draft_id: draft.id, segment_id: segResult.segment_id, audience_count: audience.length };
}
