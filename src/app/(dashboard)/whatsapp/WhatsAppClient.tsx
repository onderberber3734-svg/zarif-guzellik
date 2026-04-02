"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getConversations,
  getConversationMessages,
  sendWhatsAppMessage,
  updateConversationStatus,
  getWhatsAppStats,
  sendAppointmentReminders,
} from "@/app/actions/whatsapp";
import type { WhatsAppConversation, WhatsAppMessage } from "@/lib/whatsapp/types";

// ─── INTENT BADGE ────────────────────────────────

const intentLabels: Record<string, { label: string; color: string; icon: string }> = {
  lead: { label: "Lead", color: "bg-blue-100 text-blue-700", icon: "person_add" },
  appointment: { label: "Randevu", color: "bg-purple-100 text-purple-700", icon: "calendar_today" },
  campaign_reply: { label: "Kampanya", color: "bg-orange-100 text-orange-700", icon: "campaign" },
  winback: { label: "Geri Kazanım", color: "bg-amber-100 text-amber-700", icon: "undo" },
  support: { label: "Destek", color: "bg-red-100 text-red-700", icon: "support_agent" },
  no_show_reply: { label: "No-Show", color: "bg-rose-100 text-rose-700", icon: "event_busy" },
  reminder_reply: { label: "Hatırlatma", color: "bg-teal-100 text-teal-700", icon: "notifications" },
  general: { label: "Genel", color: "bg-slate-100 text-slate-600", icon: "chat" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "Açık", color: "text-green-600" },
  ai_handling: { label: "AI Yönetiyor", color: "text-purple-600" },
  human_handling: { label: "İnsan Gerekli", color: "text-orange-600" },
  closed: { label: "Kapalı", color: "text-slate-400" },
};

const filterOptions = [
  { id: "all", label: "Tümü", icon: "inbox" },
  { id: "unread", label: "Okunmamış", icon: "mark_email_unread" },
  { id: "human_handling", label: "İnsan Gerekli", icon: "person" },
  { id: "ai_handling", label: "AI Yönetiyor", icon: "smart_toy" },
  { id: "campaign", label: "Kampanya", icon: "campaign" },
];

export default function WhatsAppClient() {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<WhatsAppConversation | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const loadConversations = useCallback(async () => {
    const res = await getConversations(filter === "all" ? undefined : filter);
    if (res.success) {
      setConversations(res.data || []);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadConversations(), loadStats()]).then(() => setLoading(false));
  }, [filter, loadConversations]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadConversations();
      if (selectedConv) loadMessages(selectedConv.id);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedConv, loadConversations]);

  async function loadStats() {
    const s = await getWhatsAppStats();
    setStats(s);
  }

  async function loadMessages(conversationId: string) {
    const res = await getConversationMessages(conversationId);
    if (res.success) {
      setMessages(res.data || []);
      if (res.conversation) {
        setSelectedConv(res.conversation);
      }
    }
  }

  async function handleSelectConv(conv: WhatsAppConversation) {
    setSelectedConv(conv);
    await loadMessages(conv.id);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    // Listede unread'i temizle
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
    );
  }

  async function handleSend() {
    if (!messageInput.trim() || !selectedConv) return;
    setSendingMessage(true);

    const content = messageInput.trim();
    setMessageInput("");

    // Optimistic update
    const tempMsg: WhatsAppMessage = {
      id: "temp-" + Date.now(),
      business_id: "",
      conversation_id: selectedConv.id,
      wa_message_id: null,
      direction: "outbound",
      message_type: "text",
      content,
      template_name: null,
      template_params: null,
      status: "sent",
      error_code: null,
      error_message: null,
      sender_type: "human",
      metadata: {},
      sent_at: new Date().toISOString(),
      delivered_at: null,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const res = await sendWhatsAppMessage(selectedConv.id, content, "human");
    setSendingMessage(false);

    if (!res.success) {
      // Show error on the temp message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? { ...m, status: "failed" as const, error_message: res.error || null } : m))
      );
    } else {
      // Refresh messages
      await loadMessages(selectedConv.id);
    }
  }

  async function handleStatusChange(status: "ai_handling" | "human_handling" | "closed") {
    if (!selectedConv) return;
    await updateConversationStatus(selectedConv.id, status);
    setSelectedConv({ ...selectedConv, status });
    await loadConversations();
  }

  async function handleSendReminders() {
    setSendingReminders(true);
    const res = await sendAppointmentReminders();
    setSendingReminders(false);
    if (res.success) {
      alert(`${res.sent} randevu hatırlatması gönderildi!`);
      await loadConversations();
    } else {
      alert(`Hata: ${res.error}`);
    }
  }

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "şimdi";
    if (mins < 60) return `${mins}dk`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa`;
    const days = Math.floor(hours / 24);
    return `${days}g`;
  }

  function getConversationName(conv: WhatsAppConversation) {
    if (conv.customers) {
      return `${conv.customers.first_name || ""} ${conv.customers.last_name || ""}`.trim();
    }
    return conv.wa_contact_name || conv.wa_contact_phone;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-500 rounded-full animate-spin" />
          <span className="text-slate-500 font-medium">WhatsApp yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── STATS HEADER ─────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Toplam Sohbet", value: stats?.total_conversations || 0, icon: "forum", color: "text-slate-700" },
          { label: "Açık Sohbet", value: stats?.open_conversations || 0, icon: "mark_chat_unread", color: "text-green-600" },
          { label: "Okunmamış", value: stats?.unread_total || 0, icon: "notifications_active", color: "text-blue-600" },
          { label: "İnsan Gerekli", value: stats?.human_needed || 0, icon: "person_alert", color: "text-orange-600" },
          { label: "Bugün Mesaj", value: stats?.today_messages || 0, icon: "chat_bubble", color: "text-purple-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
            <span className={`material-symbols-outlined text-2xl ${stat.color}`}>{stat.icon}</span>
            <div>
              <p className="text-2xl font-extrabold text-slate-800">{stat.value}</p>
              <p className="text-xs font-medium text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── QUICK ACTIONS ────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSendReminders}
          disabled={sendingReminders}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600 transition-all shadow-sm disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">
            {sendingReminders ? "hourglass_empty" : "notifications_active"}
          </span>
          {sendingReminders ? "Gönderiliyor..." : "Hatırlatma Gönder"}
        </button>
        <button
          onClick={() => { loadConversations(); loadStats(); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Yenile
        </button>
      </div>

      {/* ─── INBOX LAYOUT ─────────────────── */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden" style={{ height: "calc(100vh - 380px)", minHeight: 500 }}>
        <div className="flex h-full">
          {/* ─── LEFT: Conversation List ─── */}
          <div className="w-[380px] border-r border-slate-100 flex flex-col">
            {/* Filters */}
            <div className="p-3 border-b border-slate-100 flex gap-1 overflow-x-auto scrollbar-hide">
              {filterOptions.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filter === f.id
                    ? "bg-green-500 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50"
                    }`}
                >
                  <span className="material-symbols-outlined text-sm">{f.icon}</span>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Conversation Items */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <span className="material-symbols-outlined text-5xl text-slate-200 mb-3">forum</span>
                  <p className="text-sm font-bold text-slate-400">Henüz sohbet yok</p>
                  <p className="text-xs text-slate-300 mt-1">
                    WhatsApp&apos;tan mesaj geldiğinde burada görünecek.
                  </p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = selectedConv?.id === conv.id;
                  const intent = intentLabels[conv.intent || "general"] || intentLabels.general;
                  const convName = getConversationName(conv);

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConv(conv)}
                      className={`w-full text-left px-4 py-3.5 border-b border-slate-50 transition-all hover:bg-slate-50 ${isSelected ? "bg-green-50/70 border-l-4 border-l-green-500" : ""
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800 truncate">
                              {convName}
                            </span>
                            {conv.customers?.is_vip && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">VIP</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {conv.last_message_preview || "..."}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {timeAgo(conv.last_message_at)}
                          </span>
                          {(conv.unread_count || 0) > 0 && (
                            <span className="w-5 h-5 bg-green-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${intent.color}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{intent.icon}</span>
                          {intent.label}
                        </span>
                        <span className={`text-[10px] font-bold ${statusLabels[conv.status]?.color || "text-slate-400"}`}>
                          {statusLabels[conv.status]?.label || conv.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ─── RIGHT: Chat Panel ─── */}
          <div className="flex-1 flex flex-col">
            {!selectedConv ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mb-6">
                  <svg viewBox="0 0 24 24" className="w-12 h-12 text-green-500 fill-current opacity-60">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-700 mb-2">WhatsApp Mesajları</h3>
                <p className="text-sm text-slate-400 max-w-sm">
                  Soldaki listeden bir sohbet seçerek mesajları görüntüleyin ve yanıtlayın.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {getConversationName(selectedConv).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">
                        {getConversationName(selectedConv)}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {selectedConv.wa_contact_phone}
                        {selectedConv.customers?.is_vip && (
                          <span className="ml-2 text-amber-600 font-bold">⭐ VIP</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedConv.status !== "closed" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(selectedConv.status === "ai_handling" ? "human_handling" : "ai_handling")}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all hover:bg-slate-50"
                          title={selectedConv.status === "ai_handling" ? "İnsan devral" : "AI'a bırak"}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {selectedConv.status === "ai_handling" ? "person" : "smart_toy"}
                          </span>
                          {selectedConv.status === "ai_handling" ? "İnsan Devral" : "AI'a Bırak"}
                        </button>
                        <button
                          onClick={() => handleStatusChange("closed")}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                          Kapat
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-[#f0f2f5]">
                  {messages.filter(m => !(m.sender_type === 'ai' && (m.metadata as any)?.is_suggestion)).map((msg) => {
                    const isInbound = msg.direction === "inbound";
                    const isFailed = msg.status === "failed";
                    const isAi = msg.sender_type === "ai";

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${isInbound
                            ? "bg-white text-slate-800 rounded-tl-md"
                            : isFailed
                              ? "bg-red-50 text-red-700 border border-red-200 rounded-tr-md"
                              : isAi
                                ? "bg-purple-500 text-white rounded-tr-md"
                                : "bg-green-500 text-white rounded-tr-md"
                            }`}
                        >
                          {isAi && !isInbound && (
                            <div className="flex items-center gap-1 mb-1 opacity-70">
                              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>smart_toy</span>
                              <span className="text-[10px] font-bold">AI Yanıtı</span>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.content}
                          </p>
                          <div className={`flex items-center justify-end gap-1.5 mt-1 ${isInbound ? "text-slate-300" : isFailed ? "text-red-400" : "text-white/60"}`}>
                            <span className="text-[10px]">
                              {new Date(msg.sent_at || msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {!isInbound && (
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                {msg.status === "read" ? "done_all" : msg.status === "delivered" ? "done_all" : msg.status === "failed" ? "error" : "done"}
                              </span>
                            )}
                          </div>
                          {isFailed && msg.error_message && (
                            <p className="text-[10px] text-red-500 mt-1">{msg.error_message}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* AI Suggestions (draft messages) */}
                  {messages.filter(m => m.sender_type === 'ai' && (m.metadata as any)?.is_suggestion).map((msg) => (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-purple-50 border-2 border-dashed border-purple-200 text-purple-800 rounded-tr-md">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="material-symbols-outlined text-purple-500" style={{ fontSize: 14 }}>smart_toy</span>
                          <span className="text-[10px] font-bold text-purple-500">AI ÖNERİSİ</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2.5">
                          <button
                            onClick={async () => {
                              if (!msg.content) return;
                              setSendingMessage(true);
                              await sendWhatsAppMessage(selectedConv!.id, msg.content, "ai");
                              setSendingMessage(false);
                              await loadMessages(selectedConv!.id);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 transition-all"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>
                            Gönder
                          </button>
                          <button
                            onClick={() => setMessageInput(msg.content || "")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white text-purple-600 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-50 transition-all"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                            Düzenle
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {selectedConv.status !== "closed" && (
                  <div className="px-4 py-3 border-t border-slate-100 bg-white">
                    <div className="flex items-end gap-2">
                      <div className="flex-1 relative">
                        <textarea
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          placeholder="Mesaj yazın..."
                          rows={1}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all"
                          style={{ minHeight: 44, maxHeight: 120 }}
                        />
                      </div>
                      <button
                        onClick={handleSend}
                        disabled={!messageInput.trim() || sendingMessage}
                        className="w-11 h-11 bg-green-500 text-white rounded-2xl flex items-center justify-center hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex-shrink-0"
                      >
                        {sendingMessage ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <span className="material-symbols-outlined text-xl">send</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
