/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

// ═══════════════════════════════════════════════════════
// WhatsApp Server Actions
// Sohbet yönetimi, mesaj gönderimi, ayarlar, kampanya gönderimi
// ═══════════════════════════════════════════════════════

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import {
  sendTextMessage,
  sendTemplateMessage,
  verifyConnection,
  normalizePhoneNumber,
} from "@/lib/whatsapp/client";
import {
  buildReminderMessage,
  buildNoShowRecoveryMessage,
  buildWinbackMessage,
} from "@/lib/whatsapp/intent";
import type { WhatsAppConversation, WhatsAppMessage, CampaignSendResult } from "@/lib/whatsapp/types";

// ─── AUTH HELPER ──────────────────────────────────────

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

async function getWhatsAppAccount(supabase: any, businessId: string) {
  const { data } = await supabase
    .from("whatsapp_accounts")
    .select("*")
    .eq("business_id", businessId)
    .maybeSingle();
  return data;
}

// ═══════════════════════════════════════════════════════
// AYARLAR — WhatsApp Hesap Yönetimi
// ═══════════════════════════════════════════════════════

export async function getWhatsAppSettings() {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  const account = await getWhatsAppAccount(scope.supabase, scope.businessId);
  
  return {
    success: true,
    data: account
      ? {
          id: account.id,
          phone_number_id: account.phone_number_id,
          phone_number: account.phone_number,
          status: account.status,
          connected_at: account.connected_at,
          // Token'ı maskele
          has_token: !!account.access_token,
        }
      : null,
  };
}

export async function saveWhatsAppSettings(settings: {
  phone_number_id: string;
  access_token: string;
  phone_number: string;
}) {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  if (!settings.phone_number_id || !settings.access_token) {
    return { success: false, error: "Phone Number ID ve Access Token zorunludur." };
  }

  // Bağlantıyı test et
  const verification = await verifyConnection(settings.phone_number_id, settings.access_token);
  if (!verification.success) {
    return { success: false, error: `Bağlantı doğrulanamadı: ${verification.error}` };
  }

  const webhookVerifyToken = crypto.randomUUID();
  const displayPhone = verification.phoneNumber || settings.phone_number;

  // Upsert
  const existing = await getWhatsAppAccount(scope.supabase, scope.businessId);

  if (existing) {
    const { error } = await scope.supabase
      .from("whatsapp_accounts")
      .update({
        phone_number_id: settings.phone_number_id,
        access_token: settings.access_token,
        phone_number: displayPhone,
        status: "active",
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await scope.supabase
      .from("whatsapp_accounts")
      .insert({
        business_id: scope.businessId,
        phone_number_id: settings.phone_number_id,
        access_token: settings.access_token,
        phone_number: displayPhone,
        webhook_verify_token: webhookVerifyToken,
        status: "active",
        connected_at: new Date().toISOString(),
      });

    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/ayarlar");
  return {
    success: true,
    data: {
      verified_name: verification.displayName,
      phone_number: displayPhone,
      webhook_verify_token: existing?.webhook_verify_token || webhookVerifyToken,
    },
  };
}

export async function disconnectWhatsApp() {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  const { error } = await scope.supabase
    .from("whatsapp_accounts")
    .update({ status: "disconnected", updated_at: new Date().toISOString() })
    .eq("business_id", scope.businessId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ayarlar");
  return { success: true };
}

// ═══════════════════════════════════════════════════════
// SOHBETLER — Conversation Listesi & Mesajlar
// ═══════════════════════════════════════════════════════

export async function getConversations(filter?: string): Promise<{
  success: boolean;
  data?: WhatsAppConversation[];
  error?: string;
}> {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  let query = scope.supabase
    .from("whatsapp_conversations")
    .select(`
      *,
      customers:customer_id(id, first_name, last_name, phone, is_vip)
    `)
    .eq("business_id", scope.businessId)
    .order("last_message_at", { ascending: false });

  if (filter === "unread") {
    query = query.gt("unread_count", 0);
  } else if (filter === "ai_handling") {
    query = query.eq("status", "ai_handling");
  } else if (filter === "human_handling") {
    query = query.eq("status", "human_handling");
  } else if (filter === "campaign") {
    query = query.not("campaign_id", "is", null);
  }

  const { data, error } = await query.limit(100);

  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
}

export async function getConversationMessages(conversationId: string): Promise<{
  success: boolean;
  data?: WhatsAppMessage[];
  conversation?: WhatsAppConversation;
  error?: string;
}> {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  // Conversation bilgisini çek
  const { data: conv } = await scope.supabase
    .from("whatsapp_conversations")
    .select(`
      *,
      customers:customer_id(id, first_name, last_name, phone, is_vip, email)
    `)
    .eq("id", conversationId)
    .eq("business_id", scope.businessId)
    .single();

  if (!conv) return { success: false, error: "Sohbet bulunamadı." };

  // Mesajları çek
  const { data: messages, error } = await scope.supabase
    .from("whatsapp_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .eq("business_id", scope.businessId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return { success: false, error: error.message };

  // Okundu olarak işaretle
  if (conv.unread_count > 0) {
    await scope.supabase
      .from("whatsapp_conversations")
      .update({ unread_count: 0 })
      .eq("id", conversationId);
  }

  return { success: true, data: messages || [], conversation: conv };
}

// ═══════════════════════════════════════════════════════
// MESAJ GÖNDERME — Manuel veya AI önerisini onaylama
// ═══════════════════════════════════════════════════════

export async function sendWhatsAppMessage(
  conversationId: string,
  content: string,
  senderType: "human" | "ai" = "human"
): Promise<{ success: boolean; error?: string }> {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  const waAccount = await getWhatsAppAccount(scope.supabase, scope.businessId);
  if (!waAccount || waAccount.status !== "active") {
    return { success: false, error: "WhatsApp bağlantısı aktif değil." };
  }

  // Conversation'ı bul
  const { data: conv } = await scope.supabase
    .from("whatsapp_conversations")
    .select("wa_contact_phone")
    .eq("id", conversationId)
    .eq("business_id", scope.businessId)
    .single();

  if (!conv) return { success: false, error: "Sohbet bulunamadı." };

  // Mesajı gönder
  const result = await sendTextMessage(
    waAccount.phone_number_id,
    waAccount.access_token,
    conv.wa_contact_phone,
    content
  );

  // DB'ye kaydet
  await scope.supabase.from("whatsapp_messages").insert({
    business_id: scope.businessId,
    conversation_id: conversationId,
    wa_message_id: result.messageId || null,
    direction: "outbound",
    message_type: "text",
    content,
    status: result.success ? "sent" : "failed",
    error_message: result.error || null,
    sender_type: senderType,
    metadata: { manual_send: true },
  });

  // Conversation güncelle
  await scope.supabase
    .from("whatsapp_conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.substring(0, 200),
      status: "human_handling",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  revalidatePath("/whatsapp");
  return result.success
    ? { success: true }
    : { success: false, error: result.error };
}

/**
 * Conversation durumunu güncelle (AI ↔ İnsan devri)
 */
export async function updateConversationStatus(
  conversationId: string,
  status: "open" | "closed" | "ai_handling" | "human_handling"
) {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  const { error } = await scope.supabase
    .from("whatsapp_conversations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("business_id", scope.businessId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/whatsapp");
  return { success: true };
}

// ═══════════════════════════════════════════════════════
// KAMPANYA GÖNDERİMİ — WhatsApp üzerinden bulk mesaj
// ═══════════════════════════════════════════════════════

export async function sendCampaignViaWhatsApp(campaignId: string): Promise<{
  success: boolean;
  result?: CampaignSendResult;
  error?: string;
}> {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  const waAccount = await getWhatsAppAccount(scope.supabase, scope.businessId);
  if (!waAccount || waAccount.status !== "active") {
    return { success: false, error: "WhatsApp bağlantısı aktif değil. Ayarlar → WhatsApp bölümünden bağlantı kurun." };
  }

  // Kampanyayı çek
  const { data: campaign } = await scope.supabase
    .from("campaigns")
    .select("*, campaign_targets(*, customers(id, first_name, last_name, phone))")
    .eq("id", campaignId)
    .eq("business_id", scope.businessId)
    .single();

  if (!campaign) return { success: false, error: "Kampanya bulunamadı." };

  const targets = campaign.campaign_targets || [];
  const pendingTargets = targets.filter((t: any) => t.status === "pending");

  if (pendingTargets.length === 0) {
    return { success: false, error: "Gönderilecek hedef müşteri bulunamadı (tümü zaten gönderilmiş olabilir)." };
  }

  // Mesaj içeriğini al
  const messageContent =
    campaign.offer_details?.message ||
    campaign.description ||
    `Merhaba! ${campaign.name} kampanyamızdan yararlanmak ister misiniz? Detaylar için bize yazın! 💜 Zarif Güzellik`;

  const result: CampaignSendResult = { total: pendingTargets.length, sent: 0, failed: 0, errors: [] };

  // Her hedef müşteriye gönder
  for (const target of pendingTargets) {
    const customer = target.customers;
    if (!customer?.phone) {
      result.failed++;
      result.errors.push({ customer_id: target.customer_id, phone: "", error: "Telefon numarası yok" });
      continue;
    }

    const phone = normalizePhoneNumber(customer.phone);
    const personalizedMessage = messageContent.replace(
      /\{Müşteri_Adı\}/gi,
      customer.first_name || "Değerli Müşterimiz"
    );

    // Conversation bul veya oluştur
    const { data: existingConv } = await scope.supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("business_id", scope.businessId)
      .eq("wa_contact_phone", phone)
      .maybeSingle();

    let conversationId: string;
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv } = await scope.supabase
        .from("whatsapp_conversations")
        .insert({
          business_id: scope.businessId,
          customer_id: customer.id,
          wa_contact_phone: phone,
          wa_contact_name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
          status: "open",
          source: "campaign",
          campaign_id: campaignId,
          last_message_at: new Date().toISOString(),
          last_message_preview: personalizedMessage.substring(0, 200),
        })
        .select("id")
        .single();
      conversationId = newConv?.id;
    }

    // Mesaj gönder
    const sendResult = await sendTextMessage(
      waAccount.phone_number_id,
      waAccount.access_token,
      phone,
      personalizedMessage
    );

    // Mesajı kaydet
    if (conversationId) {
      await scope.supabase.from("whatsapp_messages").insert({
        business_id: scope.businessId,
        conversation_id: conversationId,
        wa_message_id: sendResult.messageId || null,
        direction: "outbound",
        message_type: "text",
        content: personalizedMessage,
        status: sendResult.success ? "sent" : "failed",
        error_message: sendResult.error || null,
        sender_type: "system",
        metadata: { campaign_id: campaignId, trigger: "campaign" },
      });
    }

    if (sendResult.success) {
      result.sent++;
      // Target'ı "contacted" yap
      await scope.supabase
        .from("campaign_targets")
        .update({ status: "contacted" })
        .eq("id", target.id);
    } else {
      result.failed++;
      result.errors.push({ customer_id: target.customer_id, phone, error: sendResult.error || "Bilinmeyen hata" });
    }

    // Rate limiting — Meta saatte 80 mesaj (business tier'a göre daha fazla olabilir)
    await new Promise((r) => setTimeout(r, 100));
  }

  // Kampanya durumunu güncelle
  await scope.supabase
    .from("campaigns")
    .update({
      send_status: result.failed === 0 ? "sent" : "partially_sent",
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  revalidatePath("/kampanyalar");
  revalidatePath("/whatsapp");

  return { success: true, result };
}

// ═══════════════════════════════════════════════════════
// RANDEVU HATIRLATMA — Yarınki randevulara WhatsApp gönder
// ═══════════════════════════════════════════════════════

export async function sendAppointmentReminders(): Promise<{
  success: boolean;
  sent: number;
  error?: string;
}> {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, sent: 0, error: "Yetkisiz." };

  const waAccount = await getWhatsAppAccount(scope.supabase, scope.businessId);
  if (!waAccount || waAccount.status !== "active") {
    return { success: false, sent: 0, error: "WhatsApp bağlantısı aktif değil." };
  }

  // Yarının tarihini hesapla (İstanbul timezone)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

  // Yarınki onaylanmış randevuları çek
  const { data: appointments } = await scope.supabase
    .from("appointments")
    .select(`
      id, appointment_date, appointment_time, reminder_sent_at,
      customer:customers(id, first_name, last_name, phone),
      services:appointment_services(service:services(name))
    `)
    .eq("business_id", scope.businessId)
    .eq("appointment_date", tomorrowStr)
    .eq("status", "scheduled")
    .is("reminder_sent_at", null);

  if (!appointments || appointments.length === 0) {
    return { success: true, sent: 0 };
  }

  let sentCount = 0;

  for (const appt of appointments) {
    const customer = appt.customer as any;
    if (!customer?.phone) continue;

    const phone = normalizePhoneNumber(customer.phone);
    const services = appt.services as any;
    const serviceName = services?.[0]?.service?.name || "Bakım";
    const customerName = customer.first_name || "Değerli Müşterimiz";

    const message = buildReminderMessage(
      customerName,
      appt.appointment_date,
      appt.appointment_time,
      serviceName
    );

    const result = await sendTextMessage(
      waAccount.phone_number_id,
      waAccount.access_token,
      phone,
      message
    );

    if (result.success) {
      sentCount++;
      // Hatırlatma gönderildi olarak işaretle
      await scope.supabase
        .from("appointments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", appt.id);

      // Conversation kaydet
      const { data: conv } = await scope.supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("business_id", scope.businessId)
        .eq("wa_contact_phone", phone)
        .maybeSingle();

      const convId = conv?.id;
      if (convId) {
        await scope.supabase.from("whatsapp_messages").insert({
          business_id: scope.businessId,
          conversation_id: convId,
          wa_message_id: result.messageId,
          direction: "outbound",
          message_type: "text",
          content: message,
          status: "sent",
          sender_type: "system",
          metadata: { trigger: "reminder", appointment_id: appt.id },
        });
      }
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  revalidatePath("/whatsapp");
  return { success: true, sent: sentCount };
}

// ═══════════════════════════════════════════════════════
// NO-SHOW RECOVERY — Randevu no-show sonrası mesaj
// ═══════════════════════════════════════════════════════

export async function sendNoShowRecovery(appointmentId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  const waAccount = await getWhatsAppAccount(scope.supabase, scope.businessId);
  if (!waAccount || waAccount.status !== "active") {
    return { success: false, error: "WhatsApp bağlantısı aktif değil." };
  }

  const { data: appt } = await scope.supabase
    .from("appointments")
    .select(`
      id, appointment_date,
      customer:customers(id, first_name, last_name, phone),
      services:appointment_services(service:services(name))
    `)
    .eq("id", appointmentId)
    .eq("business_id", scope.businessId)
    .single();

  if (!appt) return { success: false, error: "Randevu bulunamadı." };

  const customer = appt.customer as any;
  if (!customer?.phone) return { success: false, error: "Müşteri telefon numarası bulunamadı." };

  const phone = normalizePhoneNumber(customer.phone);
  const svcList = appt.services as any;
  const serviceName = svcList?.[0]?.service?.name || "Bakım";
  const message = buildNoShowRecoveryMessage(customer.first_name || "Değerli Müşterimiz", serviceName);

  const result = await sendTextMessage(
    waAccount.phone_number_id,
    waAccount.access_token,
    phone,
    message
  );

  if (result.success) {
    // Conversation upsert ve mesaj kaydet
    const { data: existingConv } = await scope.supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("business_id", scope.businessId)
      .eq("wa_contact_phone", phone)
      .maybeSingle();

    let conversationId = existingConv?.id;
    if (!conversationId) {
      const { data: newConv } = await scope.supabase
        .from("whatsapp_conversations")
        .insert({
          business_id: scope.businessId,
          customer_id: customer.id,
          wa_contact_phone: phone,
          wa_contact_name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
          status: "ai_handling",
          source: "no_show",
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 200),
        })
        .select("id")
        .single();
      conversationId = newConv?.id;
    }

    if (conversationId) {
      await scope.supabase.from("whatsapp_messages").insert({
        business_id: scope.businessId,
        conversation_id: conversationId,
        wa_message_id: result.messageId,
        direction: "outbound",
        message_type: "text",
        content: message,
        status: "sent",
        sender_type: "system",
        metadata: { trigger: "no_show", appointment_id: appointmentId },
      });
    }
  }

  revalidatePath("/whatsapp");
  return result.success ? { success: true } : { success: false, error: result.error };
}

// ═══════════════════════════════════════════════════════
// WINBACK — Kayıp müşteriye WhatsApp mesaj
// ═══════════════════════════════════════════════════════

export async function sendWinbackMessage(customerId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const scope = await getBusinessScope();
  if (!scope) return { success: false, error: "Yetkisiz." };

  const waAccount = await getWhatsAppAccount(scope.supabase, scope.businessId);
  if (!waAccount || waAccount.status !== "active") {
    return { success: false, error: "WhatsApp bağlantısı aktif değil." };
  }

  const { data: customer } = await scope.supabase
    .from("customers")
    .select(`
      id, first_name, last_name, phone,
      appointments(appointment_date, status, total_price,
        appointment_services(service_id, services:service_id(name))
      )
    `)
    .eq("id", customerId)
    .eq("business_id", scope.businessId)
    .single();

  if (!customer?.phone) return { success: false, error: "Müşteri telefon bulunamadı." };

  const completed = (customer.appointments || []).filter((a: any) => a.status === "completed");
  const sorted = [...completed].sort(
    (a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
  );
  const lastService = (sorted[0]?.appointment_services as any)?.[0]?.services?.name || "Bakım";
  const daysSince = sorted[0]
    ? Math.floor((Date.now() - new Date(sorted[0].appointment_date).getTime()) / 86400000)
    : 0;

  const phone = normalizePhoneNumber(customer.phone);
  const message = buildWinbackMessage(customer.first_name || "Değerli Müşterimiz", daysSince, lastService);

  const result = await sendTextMessage(
    waAccount.phone_number_id,
    waAccount.access_token,
    phone,
    message
  );

  if (result.success) {
    const { data: existingConv } = await scope.supabase
      .from("whatsapp_conversations")
      .select("id")
      .eq("business_id", scope.businessId)
      .eq("wa_contact_phone", phone)
      .maybeSingle();

    let conversationId = existingConv?.id;
    if (!conversationId) {
      const { data: newConv } = await scope.supabase
        .from("whatsapp_conversations")
        .insert({
          business_id: scope.businessId,
          customer_id: customer.id,
          wa_contact_phone: phone,
          wa_contact_name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim(),
          status: "ai_handling",
          source: "winback",
          intent: "winback",
          last_message_at: new Date().toISOString(),
          last_message_preview: message.substring(0, 200),
        })
        .select("id")
        .single();
      conversationId = newConv?.id;
    }

    if (conversationId) {
      await scope.supabase.from("whatsapp_messages").insert({
        business_id: scope.businessId,
        conversation_id: conversationId,
        wa_message_id: result.messageId,
        direction: "outbound",
        message_type: "text",
        content: message,
        status: "sent",
        sender_type: "system",
        metadata: { trigger: "winback", customer_id: customerId },
      });
    }
  }

  revalidatePath("/whatsapp");
  return result.success ? { success: true } : { success: false, error: result.error };
}

// ═══════════════════════════════════════════════════════
// İSTATİSTİKLER — WhatsApp dashboard
// ═══════════════════════════════════════════════════════

export async function getWhatsAppStats() {
  const scope = await getBusinessScope();
  if (!scope) return null;

  const { data: convStats } = await scope.supabase
    .from("whatsapp_conversations")
    .select("id, status, unread_count, intent, source")
    .eq("business_id", scope.businessId);

  const conversations = convStats || [];

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
  const { count: todayMessages } = await scope.supabase
    .from("whatsapp_messages")
    .select("id", { count: "exact", head: true })
    .eq("business_id", scope.businessId)
    .gte("created_at", today + "T00:00:00+03:00");

  return {
    total_conversations: conversations.length,
    open_conversations: conversations.filter((c: any) => c.status === "open" || c.status === "ai_handling").length,
    unread_total: conversations.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0),
    human_needed: conversations.filter((c: any) => c.status === "human_handling").length,
    today_messages: todayMessages || 0,
    by_intent: {
      lead: conversations.filter((c: any) => c.intent === "lead").length,
      appointment: conversations.filter((c: any) => c.intent === "appointment").length,
      campaign_reply: conversations.filter((c: any) => c.intent === "campaign_reply").length,
      winback: conversations.filter((c: any) => c.intent === "winback").length,
    },
    by_source: {
      inbound: conversations.filter((c: any) => c.source === "inbound").length,
      campaign: conversations.filter((c: any) => c.source === "campaign").length,
      reminder: conversations.filter((c: any) => c.source === "reminder").length,
    },
  };
}
