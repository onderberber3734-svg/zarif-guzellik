/* eslint-disable @typescript-eslint/no-explicit-any */
// ═══════════════════════════════════════════════════════
// WhatsApp AI Intent Detection & Response Builder
// Mevcut AI agent (runAI) üzerine WhatsApp katmanı
// ═══════════════════════════════════════════════════════

import { runAI } from "@/lib/ai/provider";
import type { IntentResult, ConversationIntent } from "./types";

// ─── INTENT DETECTION PROMPT ──────────────────────────

function buildIntentPrompt(
  message: string,
  customerContext: any,
  conversationHistory: { direction: string; content: string }[],
  businessContext: any
): string {
  const historyBlock = conversationHistory
    .slice(-6)
    .map((m) => `${m.direction === "inbound" ? "MÜŞTERİ" : "İŞLETME"}: ${m.content}`)
    .join("\n");

  const customerBlock = customerContext
    ? `
MÜŞTERİ PROFİLİ:
- Ad: ${customerContext.first_name} ${customerContext.last_name}
- Toplam randevu: ${customerContext.stats?.totalAppointments || 0}
- Son ziyaret: ${customerContext.stats?.daysSinceLastVisit != null ? `${customerContext.stats.daysSinceLastVisit} gün önce` : "hiç gelmedi"}
- Toplam harcama: ₺${customerContext.stats?.totalSpent || 0}
- AI özeti: ${customerContext.ai_summary || "Bilinmiyor"}
- VIP: ${customerContext.is_vip ? "Evet" : "Hayır"}
- Aktif paketler: ${customerContext.session_plans?.filter((p: any) => p.status === "active").length || 0}
- Son hizmet: ${customerContext.stats?.lastServiceName || "Bilinmiyor"}
`
    : "MÜŞTERİ PROFİLİ: Sistemde kayıtlı değil (yeni lead)";

  const servicesBlock = businessContext?.services
    ? `MEVCUT HİZMETLER: ${businessContext.services.map((s: any) => `${s.name} (₺${s.price})`).join(", ")}`
    : "";

  return `Sen Zarif Güzellik güzellik salonunun WhatsApp üzerinden çalışan AI asistanısın.
Görevin: Gelen WhatsApp mesajını anlayıp doğru yanıt üretmek.

YAKLAŞIMIN:
- Sıcak, samimi, profesyonel
- Kısa ve öz (WhatsApp mesajı — uzun paragraflar yazma)
- Her zaman işletmeye müşteri kazandırmaya yönelik
- Emoji kullanımı doğal ve ölçülü
- İsimleri biliyorsan kullan, kişiselleştir

${customerBlock}

${servicesBlock}

SOHBET GEÇMİŞİ:
${historyBlock || "(İlk mesaj)"}

MÜŞTERİNİN YENİ MESAJI: "${message}"

---

GÖREV: Bu mesajı analiz et ve SADECE aşağıdaki JSON formatında yanıt ver:

{
  "intent": "appointment | lead | campaign_reply | winback | support | general",
  "confidence": 0.95,
  "suggested_reply": "Müşteriye gönderilecek WhatsApp yanıtı",
  "should_auto_send": true,
  "needs_human_review": false,
  "reasoning": "Neden bu intent'i seçtin (internal)"
}

INTENT AÇIKLAMALARI:
- "appointment": Randevu almak, iptal etmek, değiştirmek istiyor
- "lead": Yeni tanışma, fiyat sorma, bilgi alma — potansiyel müşteri
- "campaign_reply": Daha önce gönderdiğimiz bir kampanya/teklif mesajına yanıt veriyor
- "winback": Uzun süredir gelmemiş, tekrar gelmek istiyor
- "support": Şikayet, sorun, memnuniyetsizlik
- "general": Selamlama, teşekkür, genel sohbet

KURALLAR:
1. "should_auto_send": true → Güvenli yanıtlar (selamlama, genel bilgi, basit randevu yönlendirmesi)
2. "should_auto_send": false → Riskli yanıtlar (fiyat tahmini, özelleştirilmiş teklif, şikayet)
3. "needs_human_review": true → İnsan müdahalesi gereken durumlar (şikayet, karmaşık talep, iptal)
4. Randevu isteği varsa: İşletmeyi aramasını veya randevu linkini paylaş
5. Fiyat sorarsa: Genel aralık ver, "tam fiyat için sizinle görüşmemiz gerekir" de
6. Kampanya yanıtıysa: "İlginiz için teşekkürler!" + randevu yönlendirmesi
7. ${customerContext?.stats?.daysSinceLastVisit && customerContext.stats.daysSinceLastVisit > 90 ? "Bu müşteri uzun süredir gelmemiş — sıcak ve nazik bir winback tonu kullan, özel bir fırsat ima et" : ""}`;
}

// ─── ANA FONKSİYON ───────────────────────────────────

export async function detectIntentAndRespond(
  message: string,
  customerContext: any | null,
  conversationHistory: { direction: string; content: string }[],
  businessContext: any
): Promise<IntentResult> {
  try {
    const prompt = buildIntentPrompt(message, customerContext, conversationHistory, businessContext);
    const result = await runAI(prompt);

    let parsed: any;
    try {
      let cleaned = result.payload.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn("[WhatsApp AI] JSON parse failed, using fallback");
      return createFallbackResponse(message, customerContext);
    }

    return {
      intent: validateIntent(parsed.intent),
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      suggested_reply: parsed.suggested_reply || "Merhaba! Size nasıl yardımcı olabilirim? 💜",
      should_auto_send: parsed.should_auto_send === true,
      needs_human_review: parsed.needs_human_review === true,
    };
  } catch (err: any) {
    console.error("[WhatsApp AI] Intent detection error:", err.message);
    return createFallbackResponse(message, customerContext);
  }
}

// ─── HELPERS ──────────────────────────────────────────

const VALID_INTENTS: ConversationIntent[] = [
  "appointment", "lead", "campaign_reply", "winback",
  "support", "general", "no_show_reply", "reminder_reply",
];

function validateIntent(intent: string): ConversationIntent {
  if (VALID_INTENTS.includes(intent as ConversationIntent)) {
    return intent as ConversationIntent;
  }
  return "general";
}

function createFallbackResponse(message: string, customerContext: any | null): IntentResult {
  const name = customerContext?.first_name || "";
  const greeting = name ? `Merhaba ${name}!` : "Merhaba!";

  // Basit keyword-based fallback
  const normalized = message.toLowerCase();

  if (normalized.includes("randevu") || normalized.includes("saat") || normalized.includes("müsait")) {
    return {
      intent: "appointment",
      confidence: 0.6,
      suggested_reply: `${greeting} Randevu talebinizi aldım. 📅 Uygun saatlerimizi paylaşabilmem için sizi kısa süre içinde arayalım. Hangi hizmeti almak istersiniz?`,
      should_auto_send: true,
      needs_human_review: false,
    };
  }

  if (normalized.includes("fiyat") || normalized.includes("ücret") || normalized.includes("kaç para") || normalized.includes("ne kadar")) {
    return {
      intent: "lead",
      confidence: 0.7,
      suggested_reply: `${greeting} Fiyat bilgisi için teşekkürler! Hizmetlerimiz ve güncel fiyatlarımız hakkında detaylı bilgi vermek istiyoruz. Hangi bakım/hizmetle ilgileniyorsunuz? 💜`,
      should_auto_send: true,
      needs_human_review: false,
    };
  }

  if (normalized.includes("teşekkür") || normalized.includes("sağol") || normalized.includes("eywallah")) {
    return {
      intent: "general",
      confidence: 0.9,
      suggested_reply: `Rica ederiz! 💜 Size yardımcı olabildiysek ne mutlu bize. Başka bir konuda yardımcı olabilir miyiz?`,
      should_auto_send: true,
      needs_human_review: false,
    };
  }

  if (normalized.includes("şikayet") || normalized.includes("memnun değil") || normalized.includes("kötü")) {
    return {
      intent: "support",
      confidence: 0.7,
      suggested_reply: `${greeting} Yaşadığınız durumdan dolayı çok üzgünüz. Sizinle ilgilenmek istiyoruz. Yetkilimiz en kısa sürede sizinle iletişime geçecektir. 🙏`,
      should_auto_send: false,
      needs_human_review: true,
    };
  }

  return {
    intent: "general",
    confidence: 0.4,
    suggested_reply: `${greeting} Zarif Güzellik'e hoş geldiniz! 💜 Size nasıl yardımcı olabiliriz?`,
    should_auto_send: true,
    needs_human_review: false,
  };
}

// ─── CAMPAIGN/REMINDER MESAJ ÜRETİMİ ─────────────────

/**
 * Randevu hatırlatması mesajı üret
 */
export function buildReminderMessage(
  customerName: string,
  appointmentDate: string,
  appointmentTime: string,
  serviceName: string
): string {
  const dateFormatted = new Date(appointmentDate + "T12:00:00+03:00").toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return `Merhaba ${customerName}! 💜

📅 Randevu Hatırlatması:
🗓 ${dateFormatted}
⏰ ${appointmentTime}
💇‍♀️ ${serviceName}

Sizi bekliyor olacağız! Herhangi bir değişiklik için bize yazabilirsiniz.

Zarif Güzellik ✨`;
}

/**
 * No-show sonrası recovery mesajı üret
 */
export function buildNoShowRecoveryMessage(
  customerName: string,
  serviceName: string
): string {
  return `Merhaba ${customerName}! 💜

Bugün randevunuza gelemediğinizi fark ettik. Umarız her şey yolundadır! 🙏

${serviceName} hizmetiniz için yeni bir tarih belirlemek isterseniz bize yazmanız yeterli.

Size özel uygun bir saat ayarlayalım. 📅✨

Zarif Güzellik`;
}

/**
 * Winback mesajı üret
 */
export function buildWinbackMessage(
  customerName: string,
  daysSinceLastVisit: number,
  lastService: string
): string {
  return `Merhaba ${customerName}! 💜

Sizi çok özledik! Son ziyaretinizden bu yana ${daysSinceLastVisit} gün olmuş. 🥺

${lastService} bakımınızın zamanı gelmiş olabilir. Size özel bir fırsat hazırladık — detaylar için bize yazın!

Zarif Güzellik ✨`;
}
