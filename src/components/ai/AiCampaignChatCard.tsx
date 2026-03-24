"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { aiCampaignChat, AiChatMessage } from "@/app/actions/ai";
import { createFilteredCampaignDraft, previewFilteredAudience } from "@/app/actions/campaigns";

const STORAGE_KEY = "ai_campaign_chat_v1";

const GOAL_TYPES = [
    { id: "loyalty",  label: "Müşteri Sadakati", icon: "favorite",      bg: "bg-pink-100",    text: "text-pink-600",    desc: "Sadık müşterileri ödüllendir" },
    { id: "new",      label: "Yeni Müşteri Çek", icon: "person_add",    bg: "bg-blue-100",    text: "text-blue-600",    desc: "Yeni kitlelere ulaş" },
    { id: "slots",    label: "Boş Slot Doldur",  icon: "flash_on",      bg: "bg-amber-100",   text: "text-amber-600",   desc: "Takvimi doldur, geliri artır" },
    { id: "revenue",  label: "Geliri Artır",     icon: "trending_up",   bg: "bg-emerald-100", text: "text-emerald-600", desc: "Çapraz satış & upsell" },
];

const QUICK_PROMPTS = [
    "90 gün boyunca gelmeyen müşterilerime özel kampanya yapalım",
    "Boş takvim slotlarımı doldurmak istiyorum",
    "En çok harcayan müşterilerime sadakat ödülü verelim",
    "Hydrafacial seansı almayanlara özel teklif yapalım",
];

const ACTION_COLORS: Record<string, { bg: string; ring: string }> = {
    winback:   { bg: "from-purple-500 to-purple-700",   ring: "ring-purple-400" },
    fill_slots:{ bg: "from-amber-500 to-amber-700",     ring: "ring-amber-400" },
    loyalty:   { bg: "from-pink-500 to-rose-600",       ring: "ring-pink-400" },
    revenue:   { bg: "from-emerald-500 to-green-700",   ring: "ring-emerald-400" },
    custom:    { bg: "from-slate-500 to-slate-700",     ring: "ring-slate-400" },
};

export function AiCampaignChatCard() {
    const [messages, setMessages] = useState<AiChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [latestSuggestion, setLatestSuggestion] = useState<any>(null);
    const [realPreview, setRealPreview] = useState<{ count: number; sample: { name: string; daysSince: number }[] } | null>(null);
    const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
    const [error, setError] = useState("");
    const [isHydrated, setIsHydrated] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // ── LocalStorage: Hydrate on mount ─────────────────────
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.messages) setMessages(parsed.messages);
                if (parsed.selectedGoal) setSelectedGoal(parsed.selectedGoal);
                if (parsed.latestSuggestion) {
                    setLatestSuggestion(parsed.latestSuggestion);
                    // Sayfa yenilenince preview'ı tekrar doğrula
                    if (parsed.latestSuggestion.filters) {
                        previewFilteredAudience(parsed.latestSuggestion.filters)
                            .then(preview => {
                                if (preview.success) {
                                    setRealPreview({ count: preview.count, sample: preview.sample || [] });
                                }
                            })
                            .catch(err => console.error("Hydration preview hatası:", err));
                    }
                }
            }
        } catch {}
        setIsHydrated(true);
    }, []);

    // ── LocalStorage: Save on change ───────────────────────
    useEffect(() => {
        if (!isHydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, selectedGoal, latestSuggestion }));
        } catch {}
    }, [messages, selectedGoal, latestSuggestion, isHydrated]);

    // ── Auto scroll ─────────────────────────────────────────
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const sendMessage = async (text?: string) => {
        const msg = (text || input).trim();
        if (!msg || isLoading) return;

        const userMsg: AiChatMessage = { role: "user", content: msg };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);
        setError("");

        const response = await aiCampaignChat(msg, selectedGoal, messages);

        if (response.success) {
            const assistantMsg: AiChatMessage = { role: "assistant", content: response.reply || "" };
            setMessages(prev => [...prev, assistantMsg]);
            if (response.suggestion) {
                setLatestSuggestion(response.suggestion);
                setRealPreview(null); // önceki preview'ı sıfırla, yeni sorgu çalışacak
                // AI filtreleriyle GERÇEK DB sorgusu çalıştır → gerçek kişi sayısı göster
                if (response.suggestion.filters) {
                    previewFilteredAudience(response.suggestion.filters)
                        .then(preview => {
                            if (preview.success) {
                                setRealPreview({ count: preview.count, sample: preview.sample || [] });
                            } else {
                                setRealPreview({ count: 0, sample: [] });
                            }
                        })
                        .catch(err => {
                            console.error("Preview hatası:", err);
                            setRealPreview({ count: 0, sample: [] });
                        });
                }
            }
        } else {
            // Hata olsa bile sohbete bir mesaj ekle, konuşma akışını bozma
            const fallbackMsg: AiChatMessage = { 
                role: "assistant", 
                content: response.error || "Bir anlık teknik sorun yaşadım. Sorunuzu tekrar yazarsanız hemen yanıtlayacağım. 🤖" 
            };
            setMessages(prev => [...prev, fallbackMsg]);
        }

        setIsLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ═══ KAMPANYA OLUŞTUR — createFilteredCampaignDraft (AI filtreli gerçek segmentasyon) ═══
    const handleCreateCampaign = async () => {
        if (!latestSuggestion || isCreatingCampaign) return;
        
        // Preview yüklenmeden kampanya oluşturmayı engelle
        if (!realPreview) {
            setError("Hedef kitle doğrulanıyor, lütfen birkaç saniye bekleyin...");
            return;
        }
        if (realPreview.count === 0) {
            setError("Bu filtrelere uyan müşteri bulunamadı. Farklı kriterler deneyin.");
            return;
        }
        
        setIsCreatingCampaign(true);
        setError("");

        try {
            const filters = latestSuggestion.filters || {};

            const campaignInfo = {
                concept_name: latestSuggestion.campaign_name || "AI Kampanyası",
                description: latestSuggestion.target_segment || "",
                offer_type: "percentage_discount",
                offer_value: latestSuggestion.offer || "",
                message_content: latestSuggestion.message_draft || ""
            };

            const res = await createFilteredCampaignDraft(campaignInfo, filters);

            if (res.success && res.segment_id) {
                const params = new URLSearchParams();
                params.set("segment_id", res.segment_id);
                params.set("concept_name", campaignInfo.concept_name);
                params.set("offer_type", campaignInfo.offer_type);
                params.set("offer_value", latestSuggestion.offer?.match(/\d+/)?.[0] || "20");
                params.set("service_name", latestSuggestion.target_segment || "");
                params.set("message_content", campaignInfo.message_content);
                router.push(`/kampanyalar?${params.toString()}`);
            } else {
                setError(res.error || "Kampanya oluşturulamadı. Farklı kriterler deneyin.");
            }
        } catch (err: any) {
            setError(err.message || "Kampanya oluşturulurken hata oluştu.");
        } finally {
            setIsCreatingCampaign(false);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        setLatestSuggestion(null);
        setRealPreview(null);
        setSelectedGoal(null);
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
    };

    const isEmpty = messages.length === 0;
    const colors = ACTION_COLORS[latestSuggestion?.action_type as string] || ACTION_COLORS.custom;

    return (
        <section className="bg-purple-600/5 rounded-[3rem] p-6 lg:p-10 border border-purple-600/10 w-full overflow-hidden">
            {/* Başlık */}
            <div className="max-w-4xl mx-auto text-center mb-8 lg:mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 text-purple-700 text-xs font-bold border border-purple-600/20 mb-6">
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    AI ODAKLI KAMPANYA PLANLAYICI
                </div>
                <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {isEmpty ? "Yeni bir strateji belirleyelim" : "AI Kampanya Sihirbazı"}
                </h2>
                {isEmpty && (
                    <p className="text-slate-600 text-base lg:text-lg">
                        Yapay zeka asistanınız işletme verilerinize göre kampanya kurgular.
                    </p>
                )}
            </div>

            {/* Hedef Butonları */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-5xl mx-auto">
                {GOAL_TYPES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setSelectedGoal(t.id === selectedGoal ? null : t.id)}
                        className={`flex flex-col items-center gap-3 p-4 lg:p-5 bg-white border rounded-[2rem] transition-all group ${
                            selectedGoal === t.id
                                ? "border-purple-600 shadow-md ring-4 ring-purple-100"
                                : "border-slate-200 hover:border-purple-400/50 shadow-sm"
                        }`}
                    >
                        <div className={`size-12 ${t.bg} rounded-2xl flex items-center justify-center ${t.text} group-hover:scale-110 transition-transform ${selectedGoal === t.id ? "scale-110" : ""}`}>
                            <span className="material-symbols-outlined text-2xl">{t.icon}</span>
                        </div>
                        <div>
                            <p className="font-bold text-xs text-slate-800">{t.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Ana Panel */}
            <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
                {/* Chat Başlık (geçmiş varsa) */}
                {!isEmpty && (
                    <div className="flex items-center justify-between px-6 lg:px-8 pt-5 pb-0">
                        <div className="flex items-center gap-2">
                            <div className="size-7 rounded-xl bg-purple-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-purple-600 text-base">smart_toy</span>
                            </div>
                            <span className="text-xs font-bold text-slate-400">{messages.length} mesaj</span>
                        </div>
                        <button
                            onClick={handleClearChat}
                            className="text-[11px] text-slate-400 hover:text-rose-500 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-sm">delete_sweep</span>
                            Sıfırla
                        </button>
                    </div>
                )}

                {/* Chat Alanı */}
                {!isEmpty && (
                    <div ref={scrollRef} className="p-6 lg:p-8 space-y-6 max-h-[420px] overflow-y-auto">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-3`}>
                                {msg.role === "assistant" && (
                                    <div className="size-9 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="material-symbols-outlined text-purple-600 text-lg">smart_toy</span>
                                    </div>
                                )}
                                <div className={`max-w-[80%] rounded-3xl px-5 py-4 text-sm leading-relaxed ${
                                    msg.role === "user"
                                        ? "bg-purple-600 text-white rounded-br-md"
                                        : "bg-slate-50 border border-slate-200 text-slate-700 rounded-bl-md"
                                }`}>
                                    {msg.content}
                                </div>
                                {msg.role === "user" && (
                                    <div className="size-9 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="material-symbols-outlined text-slate-500 text-lg">person</span>
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-start gap-3">
                                <div className="size-9 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-purple-600 text-lg">smart_toy</span>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 rounded-3xl rounded-bl-md px-5 py-4">
                                    <div className="flex gap-1.5 items-center">
                                        <span className="size-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:"0ms"}}></span>
                                        <span className="size-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:"150ms"}}></span>
                                        <span className="size-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:"300ms"}}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Hızlı Başlangıç */}
                {isEmpty && (
                    <div className="p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {QUICK_PROMPTS.map((qp, i) => (
                            <button
                                key={i}
                                onClick={() => sendMessage(qp)}
                                className="text-left p-4 bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-2xl text-sm text-slate-600 hover:text-purple-800 transition-all group flex items-center gap-3 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-purple-400 text-lg shrink-0">chat_bubble_outline</span>
                                {qp}
                            </button>
                        ))}
                    </div>
                )}

                {/* AI Kampanya Öneri Kartı */}
                {latestSuggestion && !isLoading && (
                    <div className={`mx-6 lg:mx-8 mb-6 p-5 lg:p-6 rounded-2xl bg-gradient-to-r ${colors.bg} text-white shadow-lg`}>
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                            <div>
                                <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">AI Kampanya Önerisi</p>
                                <p className="text-xl font-extrabold">{latestSuggestion.campaign_name}</p>
                            </div>
                            <div className="bg-white/15 rounded-2xl px-5 py-3 text-center shrink-0">
                                {realPreview ? (
                                    <>
                                        <p className="text-2xl font-extrabold">{realPreview.count}</p>
                                        <p className="text-[10px] opacity-70 flex items-center justify-center gap-1">
                                            <span className="material-symbols-outlined text-[10px] text-green-300">verified</span>
                                            doğrulanmış kişi
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-xl animate-spin opacity-70">progress_activity</span>
                                        <p className="text-[10px] opacity-70">doğrulanıyor...</p>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <div className="bg-white/10 rounded-xl p-2.5 text-center">
                                <p className="text-[9px] opacity-60 uppercase mb-1">Kitle</p>
                                <p className="text-[11px] font-bold leading-tight">{latestSuggestion.target_segment}</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-2.5 text-center">
                                <p className="text-[9px] opacity-60 uppercase mb-1">Kanal</p>
                                <p className="text-[11px] font-bold">{latestSuggestion.channel}</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-2.5 text-center">
                                <p className="text-[9px] opacity-60 uppercase mb-1">Teklif</p>
                                <p className="text-[11px] font-bold leading-tight">{latestSuggestion.offer}</p>
                            </div>
                        </div>
                        {/* Hedef Kitle Mantığı (AI Reasoning) */}
                        {latestSuggestion.audience_logic && (
                            <div className="bg-white/10 rounded-xl p-3 mb-3 border border-white/10">
                                <p className="text-[10px] opacity-70 uppercase mb-1.5 font-bold flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-sm">psychology</span>
                                    AI Filtre Mantığı
                                </p>
                                <p className="text-[11px] italic leading-relaxed opacity-90">{latestSuggestion.audience_logic}</p>
                            </div>
                        )}
                        {/* Gerçek Müşteri Örnekleri */}
                        {realPreview && realPreview.sample.length > 0 && (
                            <div className="bg-white/10 rounded-xl p-3 mb-3">
                                <p className="text-[9px] opacity-70 uppercase mb-2 font-bold">Eşleşen Müşteriler (Örnek)</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {realPreview.sample.map((s, i) => (
                                        <span key={i} className="bg-white/15 px-2.5 py-1 rounded-lg text-[10px] font-medium">
                                            {s.name} <span className="opacity-60">({s.daysSince} gün)</span>
                                        </span>
                                    ))}
                                    {realPreview.count > 5 && (
                                        <span className="bg-white/10 px-2.5 py-1 rounded-lg text-[10px] opacity-60">
                                            +{realPreview.count - 5} kişi daha
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        {/* Mesaj Taslağı */}
                        <div className="bg-white/10 rounded-xl p-4 mb-4">
                            <p className="text-[10px] opacity-70 uppercase mb-1.5 font-bold">Mesaj Taslağı</p>
                            <p className="text-[12px] italic leading-relaxed">"{latestSuggestion.message_draft}"</p>
                        </div>
                        <button
                            onClick={handleCreateCampaign}
                            disabled={isCreatingCampaign || !realPreview || realPreview.count === 0}
                            className="w-full py-3.5 bg-white font-extrabold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 shadow-sm"
                            style={{ color: "var(--color-primary)" }}
                        >
                            {isCreatingCampaign ? (
                                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                            ) : !realPreview ? (
                                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-base">campaign</span>
                            )}
                            {isCreatingCampaign 
                                ? "Segment oluşturuluyor..." 
                                : !realPreview 
                                    ? "Hedef kitle doğrulanıyor..."
                                    : realPreview.count === 0
                                        ? "Eşleşen müşteri yok"
                                        : `${realPreview.count} Kişiyle Kampanya Oluştur`
                            }
                        </button>
                    </div>
                )}

                {/* Hata */}
                {error && (
                    <div className="mx-6 lg:mx-8 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm shrink-0">error</span>
                        {error}
                    </div>
                )}

                {/* Giriş Alanı */}
                <div className="border-t border-slate-100 p-4 lg:p-6">
                    <div className="flex gap-3 items-end">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isEmpty
                                ? "Örn: Son 3 aydır gelmeyen müşterilere özel teklif yapmak istiyorum..."
                                : "Devam edin veya detay ekleyin..."
                            }
                            className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-400 min-h-[52px] max-h-[120px]"
                            rows={1}
                        />
                        <button
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || isLoading}
                            className="size-13 min-w-[52px] h-[52px] bg-purple-600 text-white rounded-2xl flex items-center justify-center hover:bg-purple-700 hover:scale-105 transition-all disabled:opacity-40 disabled:hover:scale-100 shadow-md shadow-purple-600/20 cursor-pointer"
                        >
                            {isLoading ? (
                                <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-xl">send</span>
                            )}
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 text-center">Enter ile gönder · Shift+Enter ile yeni satır</p>
                </div>
            </div>
        </section>
    );
}
