/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { refreshAiInsight } from "@/app/actions/ai";
import { createDraftFromAi } from "@/app/actions/campaigns";
import { useRouter } from "next/navigation";

interface FillEmptySlotsCardProps {
    initialInsight?: {
        payload: any;
        generated_at: string;
    } | null;
    isStale?: boolean;
}

export function FillEmptySlotsCard({ initialInsight, isStale }: FillEmptySlotsCardProps) {
    const [insight, setInsight] = useState(initialInsight?.payload || null);
    const [generatedAt, setGeneratedAt] = useState(initialInsight?.generated_at || null);
    const [isPending, setIsPending] = useState(false);
    const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false);
    const [error, setError] = useState("");
    const [isCreatingSegment, setIsCreatingSegment] = useState(false);
    const [expandedAlt, setExpandedAlt] = useState<number | null>(null);
    const router = useRouter();

    const handleRefresh = (forceRefresh = false, isSilent = false) => {
        if (isPending) return;
        if (!isSilent) setIsPending(true);
        setError("");
        
        refreshAiInsight("fill_empty_slots", undefined, forceRefresh)
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

    const alts = insight?.campaign_alternatives || [];

    return (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden w-full h-full">
            <div className="p-6 lg:p-8 flex flex-col h-full">
                {/* Başlık & Refresh */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                            Boş Slot Tahmini
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Önümüzdeki 48 saatlik doluluk analizi</p>
                    </div>
                </div>

                {/* Loading State */}
                {isPending && !insight && (
                    <div className="flex-1 flex flex-col items-center justify-center py-12">
                        <span className="material-symbols-outlined text-4xl text-amber-400 animate-spin mb-4">progress_activity</span>
                        <p className="text-[13px] font-bold text-slate-500">Boş slotlar analiz ediliyor...</p>
                    </div>
                )}

                {/* Hata */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-xs text-red-700 flex items-start gap-2 mb-4">
                        <span className="material-symbols-outlined text-[14px] text-red-500 mt-0.5 shrink-0">error</span>
                        {error}
                    </div>
                )}

                {insight && !isPending && (
                    <div className="flex flex-col md:flex-row gap-8 items-start flex-1 min-h-0">
                        {/* SOL: AI Fırsat Önerisi Bilgisi (Boş slot rakamı kolpa olduğu için Fırsat Adedi yazıldı) */}
                        <div className="font-sans flex flex-col items-center justify-center shrink-0 w-full md:w-auto h-full min-h-[180px]">
                            <div className="relative w-40 h-40 flex flex-col items-center justify-center rounded-[2rem] border-[4px] border-amber-300/40 p-4 bg-amber-50">
                                <span className="text-[48px] font-extrabold text-amber-600 leading-none">{alts.length}</span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center mt-2">
                                    AI FIRSATI
                                </span>
                            </div>
                            <div className="mt-6 text-center text-[12px] text-slate-600 hidden md:block w-40 italic">
                                Takviminizdeki boşlukları doldurmak için <b>{alts.length}</b> ayrı hedef kitle tespit edildi.
                            </div>
                        </div>

                        {/* SAĞ: Orijinal Kampanya Alternatifleri Listesi (Eski UX) */}
                        <div className="flex-1 w-full space-y-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
                            {alts.map((alt: any, i: number) => {
                                const isExpanded = expandedAlt === i;
                                const isReminder = alt.offer_type === 'reminder';
                                
                                return (
                                    <div key={i} className="p-5 rounded-[1.5rem] border bg-amber-50/40 border-amber-200/60 transition-all relative">
                                        {/* Kitle Badge */}
                                        <div className="absolute right-4 top-4">
                                            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-700">
                                                Kitle: {alt.audience_count || 0} Kişi
                                            </span>
                                        </div>

                                        <div className="mb-3 pr-20">
                                            <p className="text-sm font-extrabold text-slate-800">{alt.concept_name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                                                {isReminder ? 'Gecikmiş Seans Hatırlatma' : alt.service_name || 'Kampanya'}
                                            </p>
                                        </div>

                                        {/* Geçerli tarihler (Saat Slotları) */}
                                        {alt.valid_dates && alt.valid_dates.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {alt.valid_dates.slice(0, 3).map((d: any, di: number) => (
                                                    <span key={di} className="px-2 py-1 rounded-md text-[9px] font-mono border bg-white border-amber-100 text-amber-600">
                                                        {d.time || d.date}
                                                    </span>
                                                ))}
                                                {alt.valid_dates.length > 3 && (
                                                    <span className="text-[9px] text-slate-400 font-bold py-1 px-1">+{alt.valid_dates.length - 3}</span>
                                                )}
                                            </div>
                                        )}

                                        {/* AI Öneri (Mesaj) */}
                                        {alt.message_templates?.[0] && (
                                            <div className="bg-white/90 p-3 rounded-xl shadow-sm border border-slate-100/60 mb-3">
                                                <p className="text-[11px] text-slate-600 italic leading-relaxed line-clamp-2">
                                                    "{alt.message_templates[0].content}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Ekspansiyon Paneli */}
                                        {isExpanded && (
                                            <div className="mt-4 mb-3 p-3 bg-white/60 rounded-xl space-y-2 border border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {/* Kitle Önizleme */}
                                                {alt.ui_sample_audience && alt.ui_sample_audience.length > 0 && (
                                                    <div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Hedef Kitle Önizleme</p>
                                                        {alt.ui_sample_audience.slice(0, 4).map((a: any, ai: number) => (
                                                            <div key={ai} className="text-[10px] text-slate-600 flex justify-between py-1 border-b border-slate-100/50 last:border-0 font-mono">
                                                                <span className="truncate">{a.maskedName}</span>
                                                                <span className={`whitespace-nowrap shrink-0 ml-2 ${a.overdue_info ? 'text-purple-600' : 'text-emerald-600'}`}>
                                                                    {a.overdue_info || `${a.last_visit_days}g önce`}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {alt.exclusion_stats?.total > 0 && (
                                                    <p className="text-[9px] text-rose-500 font-bold flex items-center gap-1.5 mt-2">
                                                        <span className="material-symbols-outlined text-[12px]">block</span>
                                                        {alt.exclusion_stats.total} müşteri (örnek plan) hariç tutuldu
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Aksiyonlar */}
                                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-200/40">
                                            <button 
                                                onClick={() => setExpandedAlt(isExpanded ? null : i)}
                                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                                {isExpanded ? 'Daralt' : 'Detayı Gör'}
                                                <span className="material-symbols-outlined text-[14px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                                            </button>

                                            <button 
                                                disabled={isPending || isCreatingSegment}
                                                onClick={async () => {
                                                    try {
                                                        setIsCreatingSegment(true);
                                                        setError("");
                                                        const res = await createDraftFromAi(alt);
                                                        if (!res.draft_id) {
                                                            throw new Error("Taslak kampanya açılamadı.");
                                                        }
                                                        router.push(`/kampanyalar?draft_id=${res.draft_id}`);
                                                    } catch (err: any) {
                                                        setError(err.message || "Bir hata oluştu");
                                                    } finally {
                                                        setIsCreatingSegment(false);
                                                    }
                                                }}
                                                className="text-[11px] font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2 bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20"
                                            >
                                                {isCreatingSegment ? (
                                                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-[14px]">campaign</span>
                                                )}
                                                {isCreatingSegment ? '...' : 'Başlat'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
            `}} />
        </div>
    );
}
