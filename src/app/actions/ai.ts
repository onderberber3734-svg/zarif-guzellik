"use server";

import { createClient } from "@/utils/supabase/server";
import { runAI, ProviderError } from "@/lib/ai/provider";
import { getTimeSlotAffinityAudience, evaluateCampaignExclusions } from "./campaigns";
import { buildDailySummaryPrompt, dailySummaryFallback } from "@/lib/ai/prompts/daily_summary";
import { buildFillEmptySlotsPrompt, fillEmptySlotsFallback } from "@/lib/ai/prompts/fill_empty_slots";
import { buildCampaignCopyPrompt, campaignCopyFallback } from "@/lib/ai/prompts/campaign_copy";
import { buildWinbackPrompt, winbackFallback } from "@/lib/ai/prompts/winback";
import { AiOutputSchema } from "@/lib/ai/prompts/_base";
import { revalidatePath } from "next/cache";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

export type InsightType = "daily_summary" | "fill_empty_slots" | "campaign_copy" | "winback";

interface AiInsight {
    id: string;
    business_id: string;
    insight_type: string;
    params_hash: string | null;
    payload: any;
    generated_at: string;
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

/** Stabil JSON stringify — key'leri sıralı */
function stableStringify(obj: Record<string, any>): string {
    const sorted: Record<string, any> = {};
    for (const key of Object.keys(obj).sort()) {
        sorted[key] = obj[key];
    }
    return JSON.stringify(sorted);
}

/** SHA-256 hash üretimi (Web Crypto API) */
async function sha256(input: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Params → stabil hash */
async function computeParamsHash(params?: Record<string, any>): Promise<string | null> {
    if (!params || Object.keys(params).length === 0) return null;
    return sha256(stableStringify(params));
}

/** Auth + business_id çıkar */
async function getBusinessScope() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: biz } = await supabase
        .from("business_users")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

    if (!biz) return null;

    return { supabase, userId: user.id, businessId: biz.business_id };
}

/** Yanıttan JSON parse et */
function parseJsonSafe(text: string): any {
    let cleaned = text.trim();
    
    // Markdown code block temizliği
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    if (firstBrace === -1 && firstBracket === -1) {
        throw new Error('No JSON object found in response');
    }
    
    let startIndex = 0;
    let endIndex = 0;
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIndex = firstBrace;
        endIndex = cleaned.lastIndexOf('}');
    } else {
        startIndex = firstBracket;
        endIndex = cleaned.lastIndexOf(']');
    }

    if (endIndex !== -1 && endIndex >= startIndex) {
        cleaned = cleaned.substring(startIndex, endIndex + 1);
    }
    
    // Kontrol karakterlerini temizle (tab, CR, LF string değer içinde sorun yaratabilir)
    cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch) => {
        if (ch === '\n' || ch === '\r' || ch === '\t') return ' ';
        return '';
    });
    
    try {
        return JSON.parse(cleaned);
    } catch {
        // Trailing comma sorunu olabilir
        cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(cleaned);
    }
}

// ═══════════════════════════════════════════════════════
// 1. READ: DB'den AI Insight Oku
// ═══════════════════════════════════════════════════════

const CACHE_RULES: Record<InsightType, number> = {
    daily_summary: 3,
    fill_empty_slots: 0.16, // 10 minutes
    winback: 3,
    campaign_copy: 0
};

export async function getAiInsight(
    type: InsightType,
    params?: Record<string, any>
): Promise<{ success: boolean; data?: AiInsight; isStale?: boolean; error?: string }> {
    const scope = await getBusinessScope();
    if (!scope) return { success: false, error: "Yetkisiz." };

    const paramsHash = await computeParamsHash(params);

    let query = scope.supabase
        .from("ai_insights")
        .select("*")
        .eq("business_id", scope.businessId)
        .eq("insight_type", type);

    if (paramsHash) {
        query = query.eq("params_hash", paramsHash);
    } else {
        query = query.is("params_hash", null);
    }

    const { data, error } = await query.order("generated_at", { ascending: false }).limit(1).maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: true, data: undefined };

    const generatedAt = new Date(data.generated_at).getTime();
    const now = Date.now();
    const cacheHours = CACHE_RULES[type] || 6;
    const hoursDiff = (now - generatedAt) / (1000 * 60 * 60);

    return { success: true, data, isStale: hoursDiff >= cacheHours };
}

// ═══════════════════════════════════════════════════════
// 2. REFRESH: Veri Hazırla → Provider → Upsert
// ═══════════════════════════════════════════════════════

let refreshQueue = Promise.resolve();

export async function refreshAiInsight(
    type: InsightType,
    params?: Record<string, any>,
    forceRefresh: boolean = false
): Promise<{ success: boolean; data?: any; fallback?: boolean; error?: string }> {
    return new Promise((resolve) => {
        refreshQueue = refreshQueue.then(async () => {
            try {
                const result = await internalRefreshAiInsight(type, params, forceRefresh);
                resolve(result);
            } catch (err: any) {
                resolve({ success: false, error: err.message });
            }
        });
    });
}

async function internalRefreshAiInsight(
    type: InsightType,
    params?: Record<string, any>,
    forceRefresh: boolean = false
): Promise<{ success: boolean; data?: any; fallback?: boolean; error?: string }> {
    const scope = await getBusinessScope();
    if (!scope) return { success: false, error: "Yetkisiz." };

    const paramsHash = await computeParamsHash(params);

    // ─── CACHE KONTROLÜ ─────────────────────────────
    let cacheQuery = scope.supabase
        .from("ai_insights")
        .select("*")
        .eq("business_id", scope.businessId)
        .eq("insight_type", type);

    if (paramsHash) {
        cacheQuery = cacheQuery.eq("params_hash", paramsHash);
    } else {
        cacheQuery = cacheQuery.is("params_hash", null);
    }

    const { data: existing } = await cacheQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (existing && !forceRefresh) {
        const generatedAt = new Date(existing.generated_at).getTime();
        const now = Date.now();
        const cacheHours = CACHE_RULES[type] || 6;
        const hoursDiff = (now - generatedAt) / (1000 * 60 * 60);

        if (hoursDiff < cacheHours) {
            console.log(`[AI] Hit Cache for ${type} (Age: ${hoursDiff.toFixed(2)}h)`);
            return { success: true, data: existing.payload, fallback: false };
        }
    }

    console.log(`[AI] ÜRETİM BAŞLIYOR: ${type} (Hash: ${paramsHash})`);
    const t0 = Date.now();

    // ─── VERİ HAZIRLAMA ─────────────────────────────
    let contextData: any;
    let prompt: string;
    let fallbackPayload: any;

    try {
        switch (type) {
            case "daily_summary": {
                contextData = await collectDailySummaryData(scope.supabase, scope.businessId);
                prompt = buildDailySummaryPrompt(contextData);
                fallbackPayload = dailySummaryFallback(contextData);
                break;
            }
            case "fill_empty_slots": {
                contextData = await collectEmptySlotsData(scope.supabase, scope.businessId);
                const baseAudience = contextData.base_audience;
                delete contextData.base_audience; // Prompt'a gereksiz ID listesi gitmesin
                prompt = buildFillEmptySlotsPrompt(contextData);
                fallbackPayload = fillEmptySlotsFallback(contextData);
                contextData.base_audience = baseAudience; // Sonrası için geri koy
                break;
            }
            case "campaign_copy": {
                if (!params) return { success: false, error: "Kampanya parametreleri gerekli." };
                contextData = params;
                prompt = buildCampaignCopyPrompt(contextData);
                fallbackPayload = campaignCopyFallback(contextData);
                break;
            }
            case "winback": {
                contextData = await collectWinbackData(scope.supabase, scope.businessId);
                prompt = buildWinbackPrompt(contextData);
                fallbackPayload = winbackFallback(contextData);
                break;
            }
            default:
                return { success: false, error: `Bilinmeyen insight türü: ${type}` };
        }
    } catch (dataError: any) {
        console.error(`[AI] Veri toplama hatası (${type}):`, dataError);
        return { success: false, error: "Veri hazırlanırken hata oluştu." };
    }

    const t1 = Date.now();
    const data_prepare_ms = t1 - t0;
    console.log(`[AI-Prof] ${type} Data Prepare: ${data_prepare_ms}ms`);

    // ─── AI PROVIDER ÇAĞRISI VE REPAIR FLOW ───────────────────
    let payload: any;
    let fallbackUsed = false;
    let repair_called = false;
    let provider_call_ms = 0;
    let parse_ms = 0;

    try {
        const pt0 = Date.now();
        let aiResult = await runAI(prompt);
        provider_call_ms = Date.now() - pt0;
        
        const ptParse0 = Date.now();
        let parsedJSON = parseJsonSafe(aiResult.payload);
        let parseAttempt = AiOutputSchema.safeParse(parsedJSON);
        parse_ms = Date.now() - ptParse0;
        
        // Dinamik iş kuralları validasyonu (Özellikle fill_empty_slots için)
        let parseErrorMsg = parseAttempt.success ? "" : parseAttempt.error.message;
        
        if (parseAttempt.success && type === "fill_empty_slots" && contextData) {
            const data = parseAttempt.data;
            const hasSlotsToFill = contextData.empty_slots && contextData.empty_slots.length > 0;
            
            if (hasSlotsToFill) {
                if (!data.campaign_alternatives || data.campaign_alternatives.length === 0) {
                    parseErrorMsg = "HATA: campaign_alternatives dizisi eksik veya boş. En az 1 alternatif kampanya üretmelisin.";
                } else if (contextData.allowed_services && contextData.allowed_services.length > 0) {
                    // Her alternatifin service_id'si valid mi?
                    for (const alt of data.campaign_alternatives) {
                        if (!alt.service_id) {
                            parseErrorMsg = `HATA: "${alt.concept_name}" adlı alternatif için service_id eksik!`;
                            break;
                        }
                        const matchedService = contextData.allowed_services.find((s: any) => String(s.id) === String(alt.service_id));
                        if (!matchedService) {
                            parseErrorMsg = `HATA: "${alt.service_name}" (${alt.service_id}) geçerli allowed_services listesinde YOK! Sadece izin verilen IDleri kullan.`;
                            break;
                        }
                        // service_name'i DB'deki gerçek isimle override et (AI farklı yazmış olabilir)
                        alt.service_name = matchedService.name;
                    }
                }

                if (contextData.audience_count > 0 && (!data.audience_count || Number(data.audience_count) <= 0)) {
                    parseErrorMsg = `HATA: 'audience_count' data içerisinde ${contextData.audience_count} olarak verilmiş. Lütfen bu değeri aynen kopyala.`;
                }
            }
        }
        
        if (!parseAttempt.success || parseErrorMsg) {
            console.warn(`[AI] Provider şemaya veya iş kuralına uymadı, onarım (repair) deneniyor... Hata: ${parseErrorMsg}`);
            repair_called = true;
            const repairPrompt = `Sen bir JSON düzelticisigisin. Aşağıdaki hatalı çıktıyı, verdiğim formata uygun SAF JSON'a çevir. Başka SIFIR kelime yaz. STRICT JSON ONLY.

CİDDİ KURAL İHLALİ TESPİT EDİLDİ (BUNU DÜZELT):
${parseErrorMsg}

Format:
{
  "title": "string",
  "recommended_day_label": "string",
  "recommended_slots": [ { "date": "string", "start_time": "string", "end_time": "string", "slot_count": 1 } ],
  "segment_id": "string",
  "audience_count": 1,
  "campaign_alternatives": [
    {
      "concept_name": "string",
      "description": "string",
      "service_id": "string",
      "service_name": "string",
      "offer_type": "string",
      "offer_value": "string",
      "channel": "whatsapp",
      "message_templates": [ { "tone": "samimi", "content": "string" } ]
    }
  ]
}

Hatalı Çıktı:
${aiResult.payload}`;
            
            const repairResult = await runAI(repairPrompt);
            parsedJSON = parseJsonSafe(repairResult.payload);
            parseAttempt = AiOutputSchema.safeParse(parsedJSON);
            
            if (!parseAttempt.success) {
                throw new Error("Repair attempt failed: " + parseAttempt.error.message);
            }
            
            // Eğer repair denemesinde de geçerli değilse
            if (type === "fill_empty_slots" && contextData) {
                const data = parseAttempt.data;
                if (data.campaign_alternatives && contextData.allowed_services) {
                    for (const alt of data.campaign_alternatives) {
                        if (alt.service_id && !contextData.allowed_services.some((s: any) => String(s.id) === String(alt.service_id))) {
                            throw new Error(`Repair failed: İzinsiz service_id (${alt.service_id}) kullanıldı.`);
                        }
                    }
                }
            }
            aiResult.metadata = repairResult.metadata; // onarım yapanın metasını al
        }

        payload = parseAttempt.data;
        payload._meta = aiResult.metadata;

        // Post-AI DB Exclusions and Stats Injector
        if (type === "fill_empty_slots" && contextData?.base_audience) {
            payload.base_audience = contextData.base_audience;
            
            if (payload.campaign_alternatives) {
                for (let i = 0; i < payload.campaign_alternatives.length; i++) {
                    const alt = payload.campaign_alternatives[i];
                    
                    // İLK ALTERNATİF (i===0) HER ZAMAN gecikmiş seans müşterilerini kullanır
                    // AI'ın offer_type döndürüp döndürmediğine bakmıyoruz
                    if (i === 0 && contextData.overdue_sessions?.length > 0) {
                        // Overdue müşterileri deduplike et
                        const seenIds = new Set<string>();
                        const overdueAudience = contextData.overdue_sessions
                            .filter((o: any) => {
                                if (seenIds.has(o.customer_id)) return false;
                                seenIds.add(o.customer_id);
                                return true;
                            })
                            .map((o: any) => ({
                                id: o.customer_id,
                                name: o.customer_name,
                                score: 100,
                                overdue_service: o.service_name,
                                overdue_days: o.days_overdue,
                                completed_sessions: o.completed,
                                total_sessions: o.total
                            }));
                        
                        // İlk alternatifi zorunlu olarak reminder olarak işaretle + genel metin
                        alt.offer_type = "reminder";
                        alt.concept_name = "Gecikmiş Seans Hatırlatması";
                        alt.description = "Aktif paketi olan ancak seansı gecikmiş müşterilere nazik bir hatırlatma göndererek paket sürekliliğini ve müşteri bağlılığını koruma.";
                        alt.service_name = "Çeşitli Paket Seansları";
                        alt.offer_value = "";
                        
                        // Hedef tarih bilgisini mesaja ekle
                        const targetDate = contextData.empty_slots?.[0]?.date || "";
                        const dayLabel = payload.recommended_day_label || "yarın";
                        
                        alt.message_templates = [
                            { tone: "samimi", content: `Merhaba! 💜 Zarif Güzellik'ten hatırlatma: Paket seansınızın süresi geldi! Bakımınıza ara vermeden devam etmeniz sonuçlarınız için çok önemli. ${dayLabel} (${targetDate}) için müsait saatlerimiz var, hemen randevunuzu oluşturalım! 📞` },
                            { tone: "kurumsal", content: `Sayın müşterimiz, devam eden paket seansınız için bir sonraki randevunuzu henüz oluşturmadığınızı fark ettik. ${dayLabel} (${targetDate}) tarihinde müsait saatlerimiz bulunmaktadır. Bakım sürecinizin sürekliliği için en kısa sürede randevu almanızı öneririz. Zarif Güzellik` }
                        ];
                        alt.audience_count = overdueAudience.length;
                        alt.exclusion_stats = { total: 0, active_plan: 0, planned_appointment: 0, recent_same_service: 0, recent_category: 0 };
                        alt.ui_sample_audience = overdueAudience.slice(0, 10).map((a: any) => {
                            const parts = a.name.split(" ");
                            const first = parts[0] || "";
                            const last = parts.slice(1).join(" ") || "";
                            return {
                                id: a.id,
                                maskedName: `${first} ${last ? last[0] + '***' : ''}`.trim(),
                                last_visit_days: a.overdue_days || 0,
                                slot_match_count: 0,
                                reasons: ["overdue_session"],
                                overdue_info: `${a.overdue_service} (${a.completed_sessions}/${a.total_sessions}) - ${a.overdue_days} gün gecikmiş`
                            };
                        });
                        
                        console.log(`[AI] Reminder alt: ${overdueAudience.length} gecikmiş müşteri atandı`);
                    } else {
                        // Diğer alternatifler: normal exclusion kurallarını uygula
                        const { audience: finalAud, stats } = await evaluateCampaignExclusions(
                            contextData.base_audience, 
                            alt.service_id, 
                            scope.businessId
                        );
                        alt.audience_count = finalAud.length;
                        alt.exclusion_stats = stats;
                        alt.ui_sample_audience = finalAud.slice(0, 10).map((a: any) => {
                            const parts = a.name.split(" ");
                            const first = parts[0] || "";
                            const last = parts.slice(1).join(" ") || "";
                            return {
                                id: a.id,
                                maskedName: `${first} ${last ? last[0] + '***' : ''}`.trim(),
                                last_visit_days: a.last_visit_days || 0,
                                slot_match_count: a.slot_match_count || 0,
                                reasons: a.reasons || []
                            };
                        });
                    }
                }
            }
        }

        // WINBACK: At-risk müşterileri kampanya alternatifine enjekte et
        if (type === "winback" && contextData?.base_audience) {
            payload.base_audience = contextData.base_audience;
            payload.total_customers = contextData.total_customers || 100;
            if (payload.campaign_alternatives) {
                for (const alt of payload.campaign_alternatives) {
                    // Winback kitlesi doğrudan at_risk müşterilerdir
                    const winbackAudience = contextData.base_audience;
                    alt.audience_count = winbackAudience.length;
                    alt.exclusion_stats = { total: 0, active_plan: 0, planned_appointment: 0, recent_same_service: 0, recent_category: 0 };
                    alt.ui_sample_audience = winbackAudience.slice(0, 10).map((a: any) => ({
                        id: a.id,
                        maskedName: a.masked_name || a.name,
                        last_visit_days: a.days_since_last || 0,
                        slot_match_count: 0,
                        reasons: ["winback"],
                        overdue_info: `${a.last_service} - ${a.days_since_last} gündür gelmiyor (₺${a.total_spent})`
                    }));
                }
            }
        }
    } catch (aiErr) {
        console.error(`[AI] Provider hatası veya Zod Parse Fail (${type}):`, aiErr);
        // Tüm fallback'ler de çöktü veya parse hatası oluştu → Tamamen rule-based fallback
        fallbackPayload._meta = { provider_used: "rule_based", reason: "error" };
        if (type === "fill_empty_slots" && contextData?.base_audience) {
            fallbackPayload.base_audience = contextData.base_audience;
            
            // Fallback'te de gecikmiş seans müşterilerini ilk alternatife ekle
            if (contextData.overdue_sessions?.length > 0 && fallbackPayload.campaign_alternatives?.length > 0) {
                const seenIds = new Set<string>();
                const overdueAudience = contextData.overdue_sessions
                    .filter((o: any) => {
                        if (seenIds.has(o.customer_id)) return false;
                        seenIds.add(o.customer_id);
                        return true;
                    })
                    .map((o: any) => ({
                        id: o.customer_id,
                        name: o.customer_name,
                        overdue_service: o.service_name,
                        overdue_days: o.days_overdue,
                        completed_sessions: o.completed,
                        total_sessions: o.total
                    }));
                
                const firstAlt = fallbackPayload.campaign_alternatives[0];
                firstAlt.offer_type = "reminder";
                firstAlt.audience_count = overdueAudience.length;
                firstAlt.exclusion_stats = { total: 0, active_plan: 0, planned_appointment: 0, recent_same_service: 0, recent_category: 0 };
                firstAlt.ui_sample_audience = overdueAudience.slice(0, 10).map((a: any) => {
                    const parts = a.name.split(" ");
                    const first = parts[0] || "";
                    const last = parts.slice(1).join(" ") || "";
                    return {
                        id: a.id,
                        maskedName: `${first} ${last ? last[0] + '***' : ''}`.trim(),
                        last_visit_days: a.overdue_days || 0,
                        reasons: ["overdue_session"],
                        overdue_info: `${a.overdue_service} (${a.completed_sessions}/${a.total_sessions}) - ${a.overdue_days} gün gecikmiş`
                    };
                });
            }
        }
        // Winback fallback
        if (type === "winback" && contextData?.base_audience) {
            fallbackPayload.base_audience = contextData.base_audience;
            if (fallbackPayload.campaign_alternatives?.length > 0) {
                const winbackAudience = contextData.base_audience;
                const firstAlt = fallbackPayload.campaign_alternatives[0];
                firstAlt.audience_count = winbackAudience.length;
                firstAlt.exclusion_stats = { total: 0, active_plan: 0, planned_appointment: 0, recent_same_service: 0, recent_category: 0 };
                firstAlt.ui_sample_audience = winbackAudience.slice(0, 10).map((a: any) => ({
                    id: a.id,
                    maskedName: a.masked_name || a.name,
                    last_visit_days: a.days_since_last || 0,
                    reasons: ["winback"],
                    overdue_info: `${a.last_service} - ${a.days_since_last} gündür gelmiyor (₺${a.total_spent})`
                }));
            }
        }
        return { success: true, data: fallbackPayload, fallback: true };
    }

    // ─── UPSERT ─────────────────────────────────────
    try {
        if (existing) {
            await scope.supabase
                .from("ai_insights")
                .update({
                    payload,
                    generated_at: new Date().toISOString()
                })
                .eq("id", existing.id);
        } else {
            await scope.supabase
                .from("ai_insights")
                .insert({
                    business_id: scope.businessId,
                    insight_type: type,
                    params_hash: paramsHash,
                    payload,
                    generated_at: new Date().toISOString()
                });
        }
    } catch (dbErr: any) {
        console.error(`[AI] DB upsert hatası:`, dbErr);
        // DB yazma hatası olsa bile Provider sonucunu göster
    }

    // Next.js client router cache'ini kır ki kullanıcı başka sayfaya gidip gelince eski null state gelmesin
    revalidatePath("/", "layout");
    
    console.log(`[AI-Prof] ${type} TOTAL: ${Date.now() - t0}ms (Prep: ${data_prepare_ms}ms, Prov: ${provider_call_ms}ms, Parse: ${parse_ms}ms, Repaired: ${repair_called})`);

    return { success: true, data: payload, fallback: fallbackUsed };
}

// ═══════════════════════════════════════════════════════
// AI CAMPAIGN CHAT — Gerçek Verilere Dayalı Sihirbaz
// ═══════════════════════════════════════════════════════

export interface AiChatMessage {
    role: "user" | "assistant";
    content: string;
}

export interface AiChatResponse {
    success: boolean;
    reply?: string;
    suggestion?: {
        campaign_name: string;
        target_segment: string;
        audience_logic: string;
        estimated_reach: number;
        channel: string;
        offer: string;
        message_draft: string;
        action_type: "winback" | "fill_slots" | "loyalty" | "revenue" | "custom";
        cta_url?: string;
        filters?: {
            min_days_inactive?: number | null;
            max_days_inactive?: number | null;
            service_name_filter?: string | null;
            min_visits?: number | null;
            max_visits?: number | null;
            min_total_spent?: number | null;
        };
    };
    error?: string;
}

export async function aiCampaignChat(
    userMessage: string,
    goalType?: string | null,
    history?: AiChatMessage[]
): Promise<AiChatResponse> {
    const scope = await getBusinessScope();
    if (!scope) return { success: false, error: "Yetkisiz." };

    const { supabase, businessId } = scope;

    // ── Bağlam Verisi: İşletmenin gerçek verileri ──
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const thirtyAgo = new Date(today); thirtyAgo.setDate(today.getDate() - 30);
    const thirtyAgoStr = thirtyAgo.toISOString().split("T")[0];

    // Müşteri sayısı
    const { count: totalCustomers } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId);

    // Son 30 günde gelen müşteri sayısı
    const { count: activeCustomers } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("appointment_date", thirtyAgoStr)
        .eq("status", "completed");

    // 90+ gün görünmez müşteriler (winback)
    const { data: allCustomers } = await supabase
        .from("customers")
        .select("id, first_name, last_name, appointments(appointment_date, status)")
        .eq("business_id", businessId);

    let atRiskCount = 0;
    (allCustomers || []).forEach((c: any) => {
        const completed = (c.appointments || []).filter((a: any) => a.status === "completed");
        if (completed.length === 0) return;
        const last = completed.sort((a: any, b: any) =>
            new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
        )[0];
        const days = Math.floor((today.getTime() - new Date(last.appointment_date).getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 90) atRiskCount++;
    });

    // Aktif hizmetler
    const { data: services } = await supabase
        .from("services")
        .select("id, name, category, price")
        .eq("business_id", businessId)
        .eq("is_active", true);

    // En çok satılan hizmetler (son 30 gün)
    const { data: topServiceRows } = await supabase
        .from("appointment_services")
        .select("service_id, services:service_id(name), appointments!inner(business_id, appointment_date, status)")
        .eq("appointments.business_id", businessId)
        .eq("appointments.status", "completed")
        .gte("appointments.appointment_date", thirtyAgoStr);

    const svcCounts: Record<string, { name: string; count: number }> = {};
    (topServiceRows || []).forEach((row: any) => {
        const name = row.services?.name;
        if (!name) return;
        if (!svcCounts[name]) svcCounts[name] = { name, count: 0 };
        svcCounts[name].count++;
    });
    const topServices = Object.values(svcCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(s => `${s.name} (${s.count} kez)`);

    // Gecikmiş seans planları
    const { count: overdueCount } = await supabase
        .from("session_plans")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("status", "active")
        .lt("next_recommended_date", todayStr);

    // Bu ay gelir
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const { data: monthRevData } = await supabase
        .from("appointments")
        .select("total_price")
        .eq("business_id", businessId)
        .gte("appointment_date", monthStart)
        .eq("status", "completed");
    const monthRevenue = (monthRevData || []).reduce((s: number, r: any) => s + (Number(r.total_price) || 0), 0);

    // ── Konuşma geçmişi ──
    const historyBlock = (history || [])
        .slice(-6)
        .map(m => `${m.role === "user" ? "KULLANICI" : "ASISTAN"}: ${m.content}`)
        .join("\n");

    // Hizmet listesi (AI'ın filtre yazarken doğru hizmet adını kullanabilmesi için)
    const serviceList = (services || []).map((s: any) => `${s.name} (₺${s.price})`).join(", ");

    const prompt = `Sen "Zarif Güzellik" güzellik salonunda çalışan akıllı, samimi ve yardımsever bir AI asistansın.
Adın: Zarif AI. Normal bir insan gibi sohbet edebilirsin. Hayattan, işten, güzellik trendlerinden, tavsiyelerden, her konudan konuşabilirsin.
Aynı zamanda kampanya ve pazarlama konusunda uzmansın.

## SEN KİMSİN:
- Sıcak, samimi, espritüel bir AI asistanı
- Her konuda sohbet edebilen, fikir verebilen, tavsiye verebilen bir dost
- Güzellik sektörü ve pazarlama konusunda uzman
- Türkçe konuşursun, doğal ve akıcı

## KAMPANYA STRATEJİLERİ (sadece kampanya konuşulduğunda kullan):
- "Yeni müşteri" → mevcut sadık müşterilere "Arkadaşını Getir" referans kampanyası (min_visits: 3+)
- "Kayıp müşteri" → uzun süredir gelmeyenlere özel teklif (min_days_inactive kullan)
- "Boş slot" → son 14-60 günde gelmiş aktif müşterilere anlık teklif
- "Gelir artırma" → upsell / cross-sell
- "Sadakat" → en sadık müşterilere VIP teklif (min_visits: 5+)
- "Tüm müşteriler" → hiçbir filtre koyma veya çok geniş filtre (min_visits: 0 veya null)
- KRİTİK: Tüm kampanyalar MEVCUT müşterilere gönderilir. DB dışı kişilere gönderilemez.

## FİLTRE KULLANIMI (ÇOK ÖNEMLİ):
- "X hizmeti almamış" / "X denememiş" / "hiç X almamış" → **exclude_service_name** kullan (örn: exclude_service_name: "cilt bakımı")
- "X hizmeti almış" / "X denilmiş" → **service_name_filter** kullan  
- "tüm müşterilerimize" / "herkese" / "bütün müşteriler" → hiçbir filtre koyma (hepsini null bırak)
- Kullanıcı açıkça filtre belirtmediyse, mantıklı varsayılan koy ama çok daraltma

## İŞLETME VERİLERİ (Gerçek):
- Toplam kayıtlı müşteri: ${totalCustomers || 0}
- Son 30 günde aktif müşteri: ${activeCustomers || 0}
- 90+ gün görünmez (kayıp riski) müşteri: ${atRiskCount}
- Gecikmiş seans planı: ${overdueCount || 0} müşteri
- Bu ayki tamamlanan gelir: ₺${monthRevenue.toFixed(0)}
- Aktif hizmet sayısı: ${services?.length || 0}
- En çok satılan hizmetler (30 gün): ${topServices.join(", ") || "veri yok"}
- Mevcut hizmet listesi: ${serviceList || "veri yok"}
- Bugünün tarihi: ${todayStr}

## MEVCUT KONUŞMA GEÇMİŞİ:
${historyBlock || "(Bu ilk mesaj)"}

## KULLANICININ KAMPANYA HEDEFİ TÜRÜ: ${goalType || "belirtilmedi"}

## KULLANICININ YENİ MESAJI:
"${userMessage}"

---
KURALLAR:

1. GENEL SOHBET: Kullanıcı ne sorarsa sorsun (nasılsın, hava nasıl, tavsiye ver, fikir sor, espri yap, hayattan konuş) → normal bir AI gibi DOĞAL ve samimi yanıt ver. "suggestion" null yap.

2. KAMPANYA MODU: Kullanıcı kampanya/pazarlama/müşteri kazanma/indirim/slot doldurma gibi İŞ konusundan bahsediyorsa → "suggestion" doldur.

3. KAMPANYA DETAYLARI (sadece suggestion doldururken):
   - filters: kullanıcı belirtmediyse hedefe göre mantıklı varsayılan koy
   - estimated_reach > 0 olmalı
   - "5 ay gelmemiş" → min_days_inactive: 150 gibi dönüştür

Yanıtını SADECE aşağıdaki JSON formatında döndür:

Sohbet modunda (kampanya istenmiyorsa):
{
  "reply": "Doğal, samimi Türkçe yanıt.",
  "suggestion": null
}

Kampanya modunda (kampanya isteniyorsa):
{
  "reply": "Kampanya stratejini açıklayan 2-3 cümle.",
  "suggestion": {
    "campaign_name": "Kısa kampanya adı",
    "target_segment": "Hedef kitle açıklaması",
    "audience_logic": "Bu kitleyi neden seçtin? (Örn: 'En az 3 kez gelmiş olan aktif müşterilerinizi referans için hedefledim.')",
    "estimated_reach": 25,
    "channel": "WhatsApp",
    "offer": "%20 indirim",
    "message_draft": "Merhaba {Müşteri_Adı}, ...",
    "action_type": "winback",
    "filters": {
      "min_days_inactive": 120,
      "max_days_inactive": null,
      "service_name_filter": null,
      "exclude_service_name": null,
      "min_visits": null,
      "max_visits": null,
      "min_total_spent": null
    }
  }
}`;

    try {
        const result = await runAI(prompt);
        console.log("[AiCampaignChat] Raw AI response:", result.payload?.substring(0, 500));
        
        let parsed: any;
        try {
            parsed = parseJsonSafe(result.payload);
        } catch (parseErr: any) {
            // JSON parse başarısız oldu — raw text'i doğal yanıt olarak göster
            console.warn("[AiCampaignChat] JSON parse failed, using raw text as reply:", parseErr.message);
            const rawText = result.payload?.trim() || "";
            // AI metin olarak yanıt vermiş olabilir, bunu direkt gösterelim
            const cleanReply = rawText
                .replace(/^```(?:json)?\s*/gi, '')
                .replace(/\s*```$/gi, '')
                .replace(/^[{\[][\s\S]*[}\]]$/, '') // pure JSON fail → boş bırak
                .trim();
            return {
                success: true,
                reply: cleanReply || "Anlıyorum, bu konuyu biraz daha açabilir misiniz? Size en uygun kampanyayı birlikte oluşturalım."
            };
        }

        return {
            success: true,
            reply: parsed.reply || "Kampanya öneriniz üzerinde çalışıyorum. Biraz daha detay verebilir misiniz?",
            suggestion: parsed.suggestion || undefined
        };
    } catch (err: any) {
        console.error("[AiCampaignChat] Error:", err.message || err);
        console.error("[AiCampaignChat] Error stack:", err.stack);
        
        // Kullanıcıya daha anlamlı fallback
        if (err.message?.includes("zaman aşımı") || err.message?.includes("timeout") || err.message?.includes("AbortError")) {
            return {
                success: true,
                reply: "Üzgünüm, isteğiniz biraz uzun sürdü. Lütfen sorunuzu biraz daha kısa yazıp tekrar deneyin. 🙏"
            };
        }
        if (err.message?.includes("Rate limit") || err.message?.includes("429")) {
            return {
                success: true,
                reply: "Şu an çok yoğunum! 😅 Birkaç saniye bekleyip tekrar dener misiniz?"
            };
        }
        return {
            success: true,
            reply: "Bir anlık teknik sorun yaşadım ama merak etmeyin! Sorunuzu tekrar yazarsanız hemen yanıtlayacağım. 🤖"
        };
    }
}



// ═══════════════════════════════════════════════════════
// 3. DATA COLLECTORS (Multi-tenant, SQL-based)
// ═══════════════════════════════════════════════════════

/** Müşteri isimlerini anonimize et (Örn: Leyla K. yerine L*** K*** (#1A2B)) */
function maskName(firstName?: string, lastName?: string, id?: string) {
    const f = firstName && firstName.length > 0 ? firstName.charAt(0).toUpperCase() + "***" : "***";
    const l = lastName && lastName.length > 0 ? lastName.charAt(0).toUpperCase() + "***" : "***";
    const shortId = id ? id.substring(0, 4).toUpperCase() : "XXXX";
    return `${f} ${l} (#${shortId})`;
}

async function collectDailySummaryData(supabase: any, businessId: string) {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

    // Bugünkü randevular
    const { data: todayAppts } = await supabase
        .from("appointments")
        .select("id, status, total_price, total_duration_minutes")
        .eq("business_id", businessId)
        .eq("appointment_date", todayStr);

    const todayAppointments = todayAppts?.length || 0;
    const todayRevenue = (todayAppts || [])
        .filter((a: any) => a.status === "completed")
        .reduce((sum: number, a: any) => sum + (Number(a.total_price) || 0), 0);

    // Bugünkü tahsilatlar
    const startOfDay = new Date(todayStr + "T00:00:00").toISOString();
    const endOfDay = new Date(todayStr + "T23:59:59").toISOString();
    const { data: todayPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("business_id", businessId)
        .gte("paid_at", startOfDay)
        .lte("paid_at", endOfDay);

    const todayCollections = (todayPayments || []).reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);

    // Bekleyen borç
    const { data: activePlans } = await supabase
        .from("session_plans")
        .select("package_total_price, paid_amount")
        .eq("business_id", businessId)
        .eq("status", "active");

    let outstanding = 0;
    (activePlans || []).forEach((p: any) => {
        const diff = (Number(p.package_total_price) || 0) - (Number(p.paid_amount) || 0);
        if (diff > 0) outstanding += diff;
    });

    // Geciken seanslar (Mevcut bir planın tarihi geçmişse ve İLERİ TARİHLİ RANDEVUSU YOKSA gecikmiştir)
    const { data: overduePlans } = await supabase
        .from("session_plans")
        .select("id, appointments:appointments!session_plan_id(id, status, appointment_date)")
        .eq("business_id", businessId)
        .eq("status", "active")
        .lt("next_recommended_date", todayStr);

    let overdueCount = 0;
    (overduePlans || []).forEach((p: any) => {
        const hasUpcoming = p.appointments?.some((a: any) => {
            if (a.status === "cancelled") return false;
            // Eger statu tamamlanmis olsa bile, eger ileri tarihe bir randevu atmislarsa (nadir case) 
            // ya da scheduled durumundaysa geciken saymayiz.
            return new Date(a.appointment_date) >= new Date(todayStr);
        });
        
        if (!hasUpcoming) {
            overdueCount++;
        }
    });

    // Top 5 hizmet (son 30 gün)
    const { data: recentApptServices } = await supabase
        .from("appointment_services")
        .select("service:services(name), appointments!inner(business_id, appointment_date, status)")
        .eq("appointments.business_id", businessId)
        .eq("appointments.status", "completed")
        .gte("appointments.appointment_date", monthStart);

    const counts: Record<string, number> = {};
    (recentApptServices || []).forEach((s: any) => {
        const name = s.service?.name;
        if (name) counts[name] = (counts[name] || 0) + 1;
    });
    const topServices = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name);

    // Boş slot tahmini (bugün kalan saatlerden)
    const totalMinutesBooked = (todayAppts || []).reduce((sum: number, a: any) => sum + (Number(a.total_duration_minutes) || 0), 0);
    const emptySlotCount = Math.max(0, Math.floor((480 - totalMinutesBooked) / 60)); // ~8 saat iş günü

    return {
        today_appointments: todayAppointments,
        today_revenue: todayRevenue,
        today_collections: todayCollections,
        outstanding_amount: outstanding,
        overdue_sessions_count: overdueCount,
        top_services: topServices,
        empty_slot_count: emptySlotCount
    };
}

async function collectEmptySlotsData(supabase: any, businessId: string) {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const todayStr = today.toISOString().split("T")[0];
    const nextWeekStr = nextWeek.toISOString().split("T")[0];

    // Önümüzdeki 7 günün randevuları
    const { data: appts } = await supabase
        .from("appointments")
        .select("appointment_date, appointment_time, total_duration_minutes")
        .eq("business_id", businessId)
        .gte("appointment_date", todayStr)
        .lte("appointment_date", nextWeekStr)
        .not("status", "in", "(canceled,no_show)");

    const formatIstanbulDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
    const formatIstanbulTime = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hour12: false });
    
    const nowLocalStr = formatIstanbulDate.format(today);
    const nowTimeStr = formatIstanbulTime.format(today);
    const [nowH, nowM] = nowTimeStr.split(":").map(Number);
    const nowTotalMin = nowH * 60 + nowM;

    // Saat 12:00'den sonraysa bugünü (0. gün) atla
    const skipToday = nowH >= 12;

    // Basit boş slot hesaplaması (her gün 09:00-18:00)
    let slots: { date: string; time: string }[] = [];
    const workHours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

    for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split("T")[0]; // DB UTC is fine to query DB, but we check against logic

        if (d === 0 && skipToday) continue;

        const dayAppts = (appts || []).filter((a: any) => a.appointment_date === dateStr);
        const bookedHours = dayAppts.map((a: any) => a.appointment_time?.substring(0, 5));

        for (const hour of workHours) {
            if (!bookedHours.includes(hour)) {
                // Eger bugunse ve saat gectiyse (60 dk buffer) ekleme
                if (dateStr === nowLocalStr) {
                    const [sh, sm] = hour.split(":").map(Number);
                    const slotMin = sh * 60 + sm;
                    if (slotMin <= nowTotalMin + 60) {
                        continue; // Skip past or too close slots
                    }
                }
                slots.push({ date: dateStr, time: hour });
            }
        }
    }

    // Sadece en yakın gündeki boşlukları al (bugün bittiyse yarına geçer)
    let targetSlots: {date: string, time: string, slot_count: number}[] = [];
    if (slots.length > 0) {
        const firstAvailableDate = slots[0].date;
        targetSlots = slots.filter((s: {date: string; time: string; slot_count?: number}) => s.date === firstAvailableDate).map((s: {date: string; time: string; slot_count?: number}) => ({
            date: s.date,
            time: s.time,
            slot_count: 1
        }));
    }
    
    if (targetSlots.length === 0) {
        throw new Error("Önümüzdeki 7 gün içerisinde takvimde boş slot bulunmuyor.");
    }


    // 1) Aktif hizmetleri çek (allowed_services)
    const { data: servicesData } = await supabase
        .from("services")
        .select("id, name, category, service_type, price, duration_minutes, is_active")
        .eq("business_id", businessId)
        .eq("is_active", true);
        
    if (!servicesData || servicesData.length === 0) {
        throw new Error("İşletmeye ait aktif hizmet bulunamadı. Lütfen önce hizmet (servis) ekleyin.");
    }
    
    // Top services last 30d
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const thirtyAgoStr = thirtyAgo.toISOString().split("T")[0];
    
    const { data: topAppts } = await supabase
        .from("appointment_services")
        .select("service_id, appointments!inner(business_id, appointment_date)")
        .eq("appointments.business_id", businessId)
        .gte("appointments.appointment_date", thirtyAgoStr);
        
    const serviceCounts = (topAppts || []).reduce((acc: any, row: any) => {
        acc[row.service_id] = (acc[row.service_id] || 0) + 1;
        return acc;
    }, {});
    
    const topServicesArr = Object.entries(serviceCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => servicesData.find((s: any) => s.id === entry[0])?.name)
        .filter(Boolean);

    const randomService = servicesData[Math.floor(Math.random() * servicesData.length)];

    // 3) Gecikmiş Seans Planları — Overdue session reminders için GERÇEK veri
    // next_recommended_date geçmiş ama HENÜZ gelecek randevusu OLMAYAN planlar
    const currentDateStr = new Date().toISOString().split("T")[0];
    const { data: overduePlans } = await supabase
        .from("session_plans")
        .select(`
            id, customer_id, service_id, 
            total_sessions, completed_sessions,
            next_recommended_date, status,
            customers:customer_id (id, first_name, last_name, phone),
            services:service_id (id, name),
            appointment_services (
                id,
                appointments:appointment_id (id, appointment_date, status)
            )
        `)
        .eq('business_id', businessId)
        .eq('status', 'active')
        .lt('next_recommended_date', currentDateStr)
        .order('next_recommended_date', { ascending: true });

    const overdueList: any[] = [];
    (overduePlans || []).forEach((p: any) => {
        // Bu plan için gelecekte planlanmış/onaylanmış randevu var mı kontrol et
        const futureAppts = (p.appointment_services || []).filter((as: any) => {
            const apt = as.appointments;
            if (!apt) return false;
            return apt.appointment_date >= currentDateStr && 
                   (apt.status === 'scheduled' || apt.status === 'confirmed' || apt.status === 'checked_in');
        });

        // Zaten gelecek randevusu varsa, bu plan gerçekten gecikmiş DEĞİL
        if (futureAppts.length > 0) return;

        const daysOverdue = Math.floor((new Date().getTime() - new Date(p.next_recommended_date).getTime()) / (1000 * 60 * 60 * 24));
        overdueList.push({
            customer_name: `${p.customers?.first_name || ''} ${p.customers?.last_name || ''}`.trim(),
            customer_id: p.customer_id,
            service_name: p.services?.name || 'Bilinmiyor',
            service_id: p.service_id,
            completed: p.completed_sessions,
            total: p.total_sessions,
            days_overdue: daysOverdue,
            next_recommended_date: p.next_recommended_date
        });
    });

    // 4) Time Slot Affinity (Geçmiş davranışa göre hedef kitle bulma)
    // Sadece baz kitleyi alıyoruz. Segmentasyon ve exclusionlar AI cevabından sonra yapılacak.
    const { audience, summary } = await getTimeSlotAffinityAudience(supabase, businessId, targetSlots);

    return {
        empty_slots: targetSlots, 
        base_audience: audience,
        audience_reason_summary: [
            summary,
            audience.length > 0 ? "Yapay zeka bu temel kitle üzerinden hizmet bazlı son filtrelemeleri yapacak." : "Genel müşteri havuzu taranmaktadır.",
            overdueList.length > 0 ? `${overdueList.length} müşterinin seansı gecikmiş durumda.` : "Gecikmiş seans bulunamadı."
        ],
        allowed_services: servicesData,
        top_services_last_30d: topServicesArr.length > 0 ? topServicesArr : ["Veri Yok"],
        overdue_sessions: overdueList,
        overdue_count: overdueList.length
    };
}

async function collectWinbackData(supabase: any, businessId: string) {
    const today = new Date();

    // Aktif hizmetleri çek
    const { data: servicesData } = await supabase
        .from("services")
        .select("id, name, category, service_type, price, duration_minutes, is_active")
        .eq("business_id", businessId)
        .eq("is_active", true);

    // Tüm müşteriler + son randevu tarihi + aldıkları hizmetler
    const { data: customers } = await supabase
        .from("customers")
        .select(`
            id, first_name, last_name, phone,
            appointments (id, appointment_date, status, total_price,
                appointment_services (service_id, services:service_id (name))
            )
        `)
        .eq("business_id", businessId);

    // Aktif seans planı olan müşterileri bul (bunları winback'ten hariç tut)
    const { data: activePlans } = await supabase
        .from("session_plans")
        .select("customer_id")
        .eq("business_id", businessId)
        .eq("status", "active");
    
    const activePlanCustomerIds = new Set((activePlans || []).map((p: any) => p.customer_id));

    const atRisk: any[] = [];

    (customers || []).forEach((c: any) => {
        // Aktif seans planı olan müşterileri winback'e ekleme
        if (activePlanCustomerIds.has(c.id)) return;

        const completed = (c.appointments || []).filter((a: any) => a.status === "completed");
        if (completed.length === 0) return;

        const sorted = [...completed].sort((a: any, b: any) =>
            new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
        );
        const lastAppt = sorted[0];
        const lastDate = lastAppt.appointment_date;
        const daysSince = Math.floor((today.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24));

        if (daysSince >= 90) {
            const totalSpent = completed.reduce((sum: number, a: any) => sum + (Number(a.total_price) || 0), 0);
            
            // Son aldığı hizmeti bul
            const lastServices = (lastAppt.appointment_services || [])
                .map((as: any) => as.services?.name)
                .filter(Boolean);

            atRisk.push({
                id: c.id,
                name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
                masked_name: maskName(c.first_name, c.last_name, c.id),
                days_since_last: daysSince,
                last_visit_date: lastDate,
                last_service: lastServices[0] || "Bilinmiyor",
                visit_count: completed.length,
                total_spent: totalSpent,
                urgency: daysSince >= 120 ? "high" : daysSince >= 90 ? "medium" : "low"
            });
        }
    });

    // En çok harcayandan başlayarak sırala
    atRisk.sort((a, b) => b.total_spent - a.total_spent);

    return {
        at_risk_customers: atRisk,
        total_at_risk: atRisk.length,
        high_risk: atRisk.filter(c => c.urgency === "high").length,
        medium_risk: atRisk.filter(c => c.urgency === "medium").length,
        low_risk: atRisk.filter(c => c.urgency === "low").length,
        total_customers: customers?.length || 0,
        allowed_services: servicesData || [],
        base_audience: atRisk // winback base_audience = at risk müşteriler
    };
}
