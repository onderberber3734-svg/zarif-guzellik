/* eslint-disable @typescript-eslint/no-explicit-any */
// ═══════════════════════════════════════════════════════
// WhatsApp Cloud API — HTTP Client
// Meta Graph API v21.0 ile mesaj gönderimi
// ═══════════════════════════════════════════════════════

import type {
  SendTextMessagePayload,
  SendTemplateMessagePayload,
  SendInteractiveMessagePayload,
  MetaSendResponse,
} from "./types";

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

// ─── CORE SEND ────────────────────────────────────────

async function sendToMeta(
  phoneNumberId: string,
  accessToken: string,
  payload: SendTextMessagePayload | SendTemplateMessagePayload | SendInteractiveMessagePayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const url = `${META_BASE_URL}/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}`;
      const errorCode = data?.error?.code || response.status;
      console.error(`[WhatsApp] Meta API Error:`, { errorCode, errorMsg, phoneNumberId });
      return { success: false, error: `${errorCode}: ${errorMsg}` };
    }

    const result = data as MetaSendResponse;
    const messageId = result?.messages?.[0]?.id;

    return { success: true, messageId };
  } catch (err: any) {
    console.error(`[WhatsApp] Network Error:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── PUBLIC API ───────────────────────────────────────

/**
 * Serbest metin mesajı gönder
 */
export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Numara formatını normalize et
  const normalizedTo = normalizePhoneNumber(to);

  const payload: SendTextMessagePayload = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "text",
    text: { body: text },
  };

  return sendToMeta(phoneNumberId, accessToken, payload);
}

/**
 * Template mesajı gönder (kampanya, hatırlatma vb.)
 */
export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string = "tr",
  parameters?: { type: "text"; text: string }[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const normalizedTo = normalizePhoneNumber(to);

  const payload: SendTemplateMessagePayload = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(parameters && parameters.length > 0
        ? {
            components: [
              {
                type: "body",
                parameters: parameters,
              },
            ],
          }
        : {}),
    },
  };

  return sendToMeta(phoneNumberId, accessToken, payload);
}

/**
 * Interactive button mesajı gönder (randevu onayı, hızlı yanıt vb.)
 */
export async function sendInteractiveMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
  headerText?: string,
  footerText?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const normalizedTo = normalizePhoneNumber(to);

  const payload: SendInteractiveMessagePayload = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "interactive",
    interactive: {
      type: "button",
      ...(headerText ? { header: { type: "text", text: headerText } } : {}),
      body: { text: bodyText },
      ...(footerText ? { footer: { text: footerText } } : {}),
      action: {
        buttons: buttons.slice(0, 3).map((btn) => ({
          type: "reply" as const,
          reply: { id: btn.id, title: btn.title.substring(0, 20) },
        })),
      },
    },
  };

  return sendToMeta(phoneNumberId, accessToken, payload);
}

/**
 * Mesajı "okundu" olarak işaretle
 */
export async function markAsRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<void> {
  const url = `${META_BASE_URL}/${phoneNumberId}/messages`;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  } catch {
    // Silent fail — okundu bilgisi kritik değil
  }
}

/**
 * WhatsApp Business hesabının geçerli olup olmadığını kontrol et
 */
export async function verifyConnection(
  phoneNumberId: string,
  accessToken: string
): Promise<{ success: boolean; phoneNumber?: string; displayName?: string; error?: string }> {
  const url = `${META_BASE_URL}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`;

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data?.error?.message || `HTTP ${response.status}` };
    }

    return {
      success: true,
      phoneNumber: data.display_phone_number,
      displayName: data.verified_name,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── HELPERS ──────────────────────────────────────────

/**
 * Telefon numarasını WhatsApp formatına normalize et
 * Örn: "0532 123 45 67" → "905321234567"
 * Örn: "+90 532 123 45 67" → "905321234567"
 */
export function normalizePhoneNumber(phone: string): string {
  // Tüm boşluk, tire, parantez, artı kaldır
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, "");

  // Başında 0 varsa kaldır ve 90 ekle
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "90" + cleaned.substring(1);
  }

  // Başında 90 yoksa ekle (10 haneli numara)
  if (cleaned.length === 10 && !cleaned.startsWith("90")) {
    cleaned = "90" + cleaned;
  }

  return cleaned;
}

/**
 * WhatsApp numarasını display formatına çevir
 * Örn: "905321234567" → "+90 532 123 45 67"
 */
export function formatPhoneDisplay(phone: string): string {
  const cleaned = normalizePhoneNumber(phone);
  if (cleaned.length === 12 && cleaned.startsWith("90")) {
    return `+90 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8, 10)} ${cleaned.substring(10)}`;
  }
  return phone;
}
