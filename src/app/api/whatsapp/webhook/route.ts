/* eslint-disable @typescript-eslint/no-explicit-any */
// ═══════════════════════════════════════════════════════
// WhatsApp Webhook Handler — Meta Cloud API
// GET: Webhook verification
// POST: Inbound messages + Status updates
// ═══════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server-admin";
import { sendTextMessage, markAsRead, normalizePhoneNumber } from "@/lib/whatsapp/client";
import { detectIntentAndRespond } from "@/lib/whatsapp/intent";
import type {
  MetaWebhookPayload,
  MetaInboundMessage,
  MetaStatusUpdate,
  MetaContact,
} from "@/lib/whatsapp/types";

// ─── GET: Webhook Verification ───────────────────────

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe") {
    // Token kontrolü: Herhangi bir işletmenin token'ı ile eşleşmeli
    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from("whatsapp_accounts")
      .select("id")
      .eq("webhook_verify_token", token || "")
      .limit(1)
      .maybeSingle();

    // Fallback: env'deki genel token
    const envToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    if (account || token === envToken) {
      console.log("[WhatsApp Webhook] Verification successful");
      return new NextResponse(challenge, { status: 200 });
    }

    console.warn("[WhatsApp Webhook] Verification failed — token mismatch");
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse("Method Not Allowed", { status: 405 });
}

// ─── POST: Inbound Messages & Status Updates ─────────

export async function POST(request: NextRequest) {
  let body: MetaWebhookPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Meta "whatsapp_business_account" olaylarını dinle
  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const supabase = createAdminClient();

  // Her entry ve change'i işle
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;

      if (!phoneNumberId) continue;

      // Bu phone_number_id hangi işletmeye ait?
      const { data: waAccount } = await supabase
        .from("whatsapp_accounts")
        .select("id, business_id, phone_number_id, access_token, status")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();

      if (!waAccount) {
        console.warn(`[WhatsApp Webhook] Unknown phone_number_id: ${phoneNumberId}`);
        continue;
      }

      // Status update'leri işle
      if (value.statuses && value.statuses.length > 0) {
        await handleStatusUpdates(supabase, waAccount.business_id, value.statuses);
      }

      // Inbound mesajları işle
      if (value.messages && value.messages.length > 0) {
        const contacts = value.contacts || [];
        for (const msg of value.messages) {
          await handleInboundMessage(supabase, waAccount, msg, contacts);
        }
      }
    }
  }

  // Meta'ya her zaman 200 dön (aksi halde retry yapar)
  return NextResponse.json({ status: "ok" }, { status: 200 });
}

// ─── INBOUND MESSAGE HANDLER ─────────────────────────

async function handleInboundMessage(
  supabase: any,
  waAccount: any,
  msg: MetaInboundMessage,
  contacts: MetaContact[]
) {
  const businessId = waAccount.business_id;
  const senderPhone = normalizePhoneNumber(msg.from);
  const contactName = contacts.find((c) => normalizePhoneNumber(c.wa_id) === senderPhone)?.profile?.name || null;

  // Mesaj içeriğini çıkar
  let messageContent = "";
  let messageType = msg.type || "text";

  switch (msg.type) {
    case "text":
      messageContent = msg.text?.body || "";
      break;
    case "interactive":
      messageContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || "";
      messageType = "interactive";
      break;
    case "button":
      messageContent = msg.button?.text || "";
      messageType = "button";
      break;
    case "image":
      messageContent = msg.image?.caption || "[Görsel]";
      messageType = "image";
      break;
    default:
      messageContent = `[${msg.type}]`;
  }

  console.log(`[WhatsApp] Inbound from ${senderPhone}: "${messageContent.substring(0, 100)}"`);

  // 1. Müşteri eşleştirmesi (telefon numarasıyla)
  const { data: customer } = await supabase
    .from("customers")
    .select(`
      id, first_name, last_name, phone, is_vip, email,
      appointments(id, appointment_date, status, total_price,
        appointment_services(service_id, services:service_id(name))
      ),
      session_plans(id, status, service_id, total_sessions, completed_sessions,
        services:service_id(name)
      )
    `)
    .eq("business_id", businessId)
    .or(`phone.eq.${senderPhone},phone.eq.0${senderPhone.substring(2)},phone.eq.+${senderPhone}`)
    .limit(1)
    .maybeSingle();

  // Müşteri istatistiklerini hesapla (basitleştirilmiş)
  let customerWithStats = customer;
  if (customer) {
    const completed = (customer.appointments || []).filter((a: any) => a.status === "completed");
    const sortedCompleted = [...completed].sort(
      (a: any, b: any) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime()
    );
    const lastVisitDate = sortedCompleted[0]?.appointment_date;
    const daysSinceLastVisit = lastVisitDate
      ? Math.floor((Date.now() - new Date(lastVisitDate + "T12:00:00+03:00").getTime()) / 86400000)
      : null;

    const lastAppt = sortedCompleted[0];
    const lastServiceName = lastAppt?.appointment_services?.[0]?.services?.name || "Bilinmiyor";

    customerWithStats = {
      ...customer,
      stats: {
        totalAppointments: completed.length,
        daysSinceLastVisit,
        totalSpent: completed.reduce((s: number, a: any) => s + (Number(a.total_price) || 0), 0),
        lastServiceName,
      },
      ai_summary: daysSinceLastVisit && daysSinceLastVisit > 90
        ? "Geri Kazanılabilir"
        : completed.length >= 3
          ? "Sadık Müşteri"
          : completed.length > 0
            ? "Düzenli Ziyaretçi"
            : "Yeni Başlangıç",
    };
  }

  // 2. Conversation upsert
  const { data: existingConv } = await supabase
    .from("whatsapp_conversations")
    .select("id, status, unread_count")
    .eq("business_id", businessId)
    .eq("wa_contact_phone", senderPhone)
    .maybeSingle();

  let conversationId: string;

  if (existingConv) {
    conversationId = existingConv.id;
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: messageContent.substring(0, 200),
        unread_count: (existingConv.unread_count || 0) + 1,
        wa_contact_name: contactName || undefined,
        customer_id: customer?.id || undefined,
        status: existingConv.status === "closed" ? "open" : existingConv.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);
  } else {
    const { data: newConv } = await supabase
      .from("whatsapp_conversations")
      .insert({
        business_id: businessId,
        customer_id: customer?.id || null,
        wa_contact_phone: senderPhone,
        wa_contact_name: contactName,
        status: "open",
        source: "inbound",
        last_message_at: new Date().toISOString(),
        last_message_preview: messageContent.substring(0, 200),
        unread_count: 1,
      })
      .select("id")
      .single();

    conversationId = newConv?.id;
    if (!conversationId) {
      console.error("[WhatsApp] Failed to create conversation");
      return;
    }
  }

  // 3. Mesajı kaydet
  await supabase.from("whatsapp_messages").insert({
    business_id: businessId,
    conversation_id: conversationId,
    wa_message_id: msg.id,
    direction: "inbound",
    message_type: messageType,
    content: messageContent,
    status: "delivered",
    sender_type: "customer",
    sent_at: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
    metadata: {
      wa_contact_name: contactName,
      customer_id: customer?.id || null,
    },
  });

  // 4. Okundu bilgisi gönder
  await markAsRead(waAccount.phone_number_id, waAccount.access_token, msg.id);

  // 5. AI Intent Detection & Auto-reply
  try {
    // Son mesaj geçmişini al
    const { data: recentMessages } = await supabase
      .from("whatsapp_messages")
      .select("direction, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(8);

    const history = (recentMessages || []).reverse().map((m: any) => ({
      direction: m.direction,
      content: m.content || "",
    }));

    // İşletmenin aktif hizmetlerini al
    const { data: services } = await supabase
      .from("services")
      .select("id, name, price, category")
      .eq("business_id", businessId)
      .eq("is_active", true);

    const intentResult = await detectIntentAndRespond(
      messageContent,
      customerWithStats,
      history,
      { services }
    );

    // Conversation intent güncelle
    await supabase
      .from("whatsapp_conversations")
      .update({
        intent: intentResult.intent,
        status: intentResult.needs_human_review ? "human_handling" : "ai_handling",
        ai_context: {
          last_intent: intentResult.intent,
          confidence: intentResult.confidence,
          needs_human: intentResult.needs_human_review,
          last_analyzed_at: new Date().toISOString(),
        },
      })
      .eq("id", conversationId);

    // Auto-send (güvenli yanıtlar)
    if (intentResult.should_auto_send && intentResult.suggested_reply && waAccount.status === "active") {
      const sendResult = await sendTextMessage(
        waAccount.phone_number_id,
        waAccount.access_token,
        senderPhone,
        intentResult.suggested_reply
      );

      // Gönderilen yanıtı kaydet
      await supabase.from("whatsapp_messages").insert({
        business_id: businessId,
        conversation_id: conversationId,
        wa_message_id: sendResult.messageId || null,
        direction: "outbound",
        message_type: "text",
        content: intentResult.suggested_reply,
        status: sendResult.success ? "sent" : "failed",
        error_message: sendResult.error || null,
        sender_type: "ai",
        metadata: {
          intent: intentResult.intent,
          ai_confidence: intentResult.confidence,
          auto_sent: true,
        },
      });

      // Conversation preview güncelle
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: intentResult.suggested_reply.substring(0, 200),
        })
        .eq("id", conversationId);

      console.log(`[WhatsApp AI] Auto-replied (${intentResult.intent}): "${intentResult.suggested_reply.substring(0, 80)}..."`);
    } else if (!intentResult.should_auto_send) {
      // AI önerisini metadata olarak ayrıca kaydet (UI'da gösterilecek)
      await supabase.from("whatsapp_messages").insert({
        business_id: businessId,
        conversation_id: conversationId,
        direction: "outbound",
        message_type: "text",
        content: intentResult.suggested_reply,
        status: "draft" as any,
        sender_type: "ai",
        metadata: {
          intent: intentResult.intent,
          ai_confidence: intentResult.confidence,
          auto_sent: false,
          is_suggestion: true,
        },
      });
    }
  } catch (aiErr: any) {
    console.error("[WhatsApp AI] Intent detection failed:", aiErr.message);
    // AI hatası olsa bile mesaj kaydedildi, sorun yok
  }
}

// ─── STATUS UPDATE HANDLER ───────────────────────────

async function handleStatusUpdates(
  supabase: any,
  businessId: string,
  statuses: MetaStatusUpdate[]
) {
  for (const status of statuses) {
    if (!status.id) continue;

    const updateData: any = {
      status: status.status,
    };

    if (status.status === "delivered") {
      updateData.delivered_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
    } else if (status.status === "read") {
      updateData.read_at = new Date(parseInt(status.timestamp) * 1000).toISOString();
    } else if (status.status === "failed") {
      updateData.error_code = status.errors?.[0]?.code?.toString() || null;
      updateData.error_message = status.errors?.[0]?.message || status.errors?.[0]?.title || null;
    }

    await supabase
      .from("whatsapp_messages")
      .update(updateData)
      .eq("wa_message_id", status.id)
      .eq("business_id", businessId);
  }
}
