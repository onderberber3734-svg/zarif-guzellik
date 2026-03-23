"use client";

import { useState, useEffect } from "react";
import { refreshAiInsight } from "@/app/actions/ai";
import { createDraftFromAi } from "@/app/actions/campaigns";
import { useRouter } from "next/navigation";

interface WinbackCardProps {
    initialInsight?: {
        payload: any;
        generated_at: string;
    } | null;
    isStale?: boolean;
}

export function WinbackCard({ initialInsight, isStale }: WinbackCardProps) {
    const [insight, setInsight] = useState(initialInsight?.payload || null);
    const [generatedAt, setGeneratedAt] = useState(initialInsight?.generated_at || null);
    const [isPending, setIsPending] = useState(false);
    const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false);
    const [error, setError] = useState("");
    const [isCreatingSegment, setIsCreatingSegment] = useState(false);
    const router = useRouter();

    const handleRefresh = (forceRefresh = false, isSilent = false) => {
        if (isPending) return;
        if (!isSilent) setIsPending(true);
        setError("");
        
        refreshAiInsight("winback", undefined, forceRefresh)
            .then(result => {
                if (result.success && result.data) {
                    setInsight(result.data);
                    setGeneratedAt(new Date().toISOString());
                }
            })
            .catch(err => { if (!isSilent) setError((err as any).message); })
            .finally(() => { if (!isSilent) setIsPending(false); });
    };

    useEffect(() => {
        if (!hasAutoRefreshed) {
            if (!initialInsight && !insight) {
                setHasAutoRefreshed(true);
                handleRefresh(false, true);
            }
        }
    }, [initialInsight, insight, hasAutoRefreshed]);

    const riskCount = insight?.campaign_alternatives?.[0]?.audience_count || 0;
    const alt = insight?.campaign_alternatives?.[0];

    // SVG donut hesaplaması
    const circumference = 2 * Math.PI * 45; // r=45
    const totalBase = insight?.total_customers || Math.max(riskCount, 100);
    const maxCustomers = Math.max(totalBase, riskCount); // Yüzdeyi 100'ü geçirmemek için
    const percentage = maxCustomers > 0 ? (riskCount / maxCustomers) : 0;
    const dashOffset = circumference * (1 - percentage);
    
    // Risk seviyesi
    const riskLevel = riskCount >= 30 ? "critical" : riskCount >= 15 ? "high" : riskCount >= 5 ? "medium" : "low";
    const riskConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
        critical: { label: "KRİTİK SEVİYE", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
        high: { label: "YÜKSEK RİSK", color: "text-red-500", bg: "bg-red-50", border: "border-red-200" },
        medium: { label: "ORTA SEVİYE", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
        low: { label: "DÜŞÜK RİSK", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" }
    };
    const risk = riskConfig[riskLevel];

    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 lg:p-8">
                {/* Başlık */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                            Risk-O-Meter
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Müşteri Kayıp Riski Analizi (Churn Prediction)</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isPending ? (
                            <span className="material-symbols-outlined text-purple-500 text-lg animate-spin">progress_activity</span>
                        ) : insight ? (
                            <span className={`px-3 py-1 ${risk.bg} ${risk.color} text-[10px] font-bold rounded-full ${risk.border} border flex items-center gap-1.5`}>
                                <span className="size-1.5 bg-current rounded-full animate-pulse"></span>
                                {risk.label}
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* Loading State */}
                {isPending && !insight && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-4xl text-purple-300 animate-spin">progress_activity</span>
                            <p className="text-sm text-slate-400 mt-3">AI müşteri verilerini analiz ediyor...</p>
                        </div>
                    </div>
                )}

                {/* Boş Durum */}
                {!isPending && !insight && (
                    <div className="flex-1 flex items-center justify-center">
                        <button
                            onClick={() => handleRefresh(true)}
                            className="flex flex-col items-center gap-3 p-8 rounded-2xl hover:bg-purple-50 transition-colors cursor-pointer group"
                        >
                            <div className="p-4 bg-purple-100 rounded-2xl group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-3xl text-purple-600">person_search</span>
                            </div>
                            <span className="font-bold text-slate-700">Riskli Müşteri Analizi Başlat</span>
                            <span className="text-xs text-slate-400">AI 90+ gündür gelmeyen müşterileri analiz edecek</span>
                        </button>
                    </div>
                )}

                {/* İçerik */}
                {insight && (
                    <div className="flex flex-col md:flex-row gap-8 items-center flex-1">
                        {/* SOL: Donut Chart */}
                        <div className="relative w-44 h-44 flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                <circle
                                    cx="50" cy="50" r="45"
                                    fill="transparent"
                                    stroke="#f1f5f9"
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="50" cy="50" r="45"
                                    fill="transparent"
                                    stroke="#7c3aed"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={dashOffset}
                                    className="transition-all duration-1000 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-extrabold text-slate-800">{riskCount}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RİSKLİ MÜŞTERİ</span>
                            </div>
                        </div>

                        {/* SAĞ: AI Win-Back Önerisi */}
                        <div className="flex-1 space-y-4">
                            {alt && (
                                <>
                                    <div className="bg-purple-600/5 rounded-[1.5rem] p-6 lg:p-8 border-l-4 border-purple-600">
                                        <div className="flex items-center gap-2 mb-3 text-purple-700">
                                            <span className="material-symbols-outlined text-lg">auto_fix_high</span>
                                            <span className="text-sm font-bold">AI 'Win-Back' Önerisi</span>
                                        </div>
                                        <p className="text-[13px] text-slate-700 italic leading-relaxed mb-6">
                                            {alt.description || `"Bu ${riskCount} müşterinin büyük kısmı uzun süredir gelmiyor. Onlara özel 'Seni Özledik' indirimi tanımlayarak kaybedilen geliri kurtarabiliriz."`}
                                        </p>

                                        {/* Örnek Mesaj */}
                                        {alt.message_templates && alt.message_templates.length > 0 && (
                                            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/60 mb-6 shadow-sm">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px]">chat</span>
                                                    Örnek Mesaj
                                                </p>
                                                <p className="text-[12px] text-slate-600 italic leading-relaxed">"{alt.message_templates[0].content}"</p>
                                            </div>
                                        )}

                                        {/* Butonlar */}
                                        <div className="flex gap-4">
                                            <button 
                                                disabled={isPending || isCreatingSegment}
                                                onClick={async () => {
                                                    try {
                                                        setIsCreatingSegment(true);
                                                        setError("");
                                                        const res = await createDraftFromAi(alt);
                                                        const params = new URLSearchParams();
                                                        if (res.segment_id) params.set("segment_id", res.segment_id);
                                                        if (alt.service_name) params.set("service_name", alt.service_name);
                                                        if (alt.offer_type) params.set("offer_type", alt.offer_type);
                                                        if (alt.offer_value) params.set("offer_value", String(alt.offer_value));
                                                        if (alt.concept_name) params.set("concept_name", alt.concept_name);
                                                        if (alt.message_templates?.[0]?.content) params.set("message", alt.message_templates[0].content);
                                                        router.push(`/kampanyalar?${params.toString()}`);
                                                    } catch (err: any) {
                                                        setError(err.message || "Kampanya oluşturulurken bir hata oluştu.");
                                                    } finally {
                                                        setIsCreatingSegment(false);
                                                    }
                                                }}
                                                className="flex-1 py-3.5 bg-purple-600 text-white rounded-xl font-bold text-[13px] hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isCreatingSegment ? (
                                                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-[16px]">campaign</span>
                                                )}
                                                {isCreatingSegment ? "Oluşturuluyor..." : "Kampanyayı Başlat"}
                                            </button>
                                            <button 
                                                onClick={() => router.push('/musteriler')}
                                                className="px-6 py-3.5 border border-slate-200 bg-white rounded-xl text-slate-500 hover:bg-slate-50 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                                                title="Riskli listesini gör"
                                            >
                                                <span className="material-symbols-outlined text-[20px]">list</span>
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Hata */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 flex items-start gap-2 mt-3">
                        <span className="material-symbols-outlined text-[14px] text-red-500 mt-0.5 shrink-0">error</span>
                        {error}
                    </div>
                )}

                {/* Alt Bilgi */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400">
                        Son yenileme: {generatedAt ? new Date(generatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "-"}
                    </p>
                    <button
                        onClick={() => handleRefresh(true)}
                        disabled={isPending}
                        className="text-[11px] font-bold text-purple-600/70 hover:text-purple-600 p-1.5 rounded-lg hover:bg-purple-50 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
                        title="Yeniden Üret"
                    >
                        <span className={`material-symbols-outlined text-[14px] ${isPending ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
