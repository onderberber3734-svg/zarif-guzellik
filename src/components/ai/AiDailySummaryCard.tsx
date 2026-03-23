"use client";

import { useState, useEffect } from "react";
import { refreshAiInsight } from "@/app/actions/ai";

interface AiDailySummaryCardProps {
    initialInsight?: {
        payload: any;
        generated_at: string;
    } | null;
    isStale?: boolean;
}

export function AiDailySummaryCard({ initialInsight, isStale }: AiDailySummaryCardProps) {
    const [insight, setInsight] = useState(initialInsight?.payload || null);
    const [generatedAt, setGeneratedAt] = useState(initialInsight?.generated_at || null);
    const [isPending, setIsPending] = useState(false);
    const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false);

    const handleRefresh = (forceRefresh = false, isSilent = false) => {
        if (isPending) return;
        if (!isSilent) setIsPending(true);
        
        refreshAiInsight("daily_summary", undefined, forceRefresh)
            .then(result => {
                if (result.success && result.data) {
                    setInsight(result.data);
                    setGeneratedAt(new Date().toISOString());
                }
            })
            .catch(() => {})
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

    // Orijinal verileri tasarım diline çevirelim
    const bullets = insight?.bullets || [];
    
    // Sabit ikonlar (veri dinamik olmadığı için sırayla ikon atıyoruz)
    const iconConfig = [
        { icon: "insights", bg: "bg-purple-100", text: "text-purple-600", colorHint: "purple" },
        { icon: "warning", bg: "bg-amber-100", text: "text-amber-600", colorHint: "amber" },
        { icon: "trending_up", bg: "bg-emerald-100", text: "text-emerald-600", colorHint: "emerald" },
        { icon: "info", bg: "bg-blue-100", text: "text-blue-600", colorHint: "blue" },
    ];

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col px-2">
                <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Haftalık AI Öngörüleri
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">Veri analitiği ile haftalık strateji özeti</p>
            </div>
            
            <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] border border-slate-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6 flex-1 flex flex-col justify-between">
                
                {isPending && !insight && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
                        <div className="size-16 bg-purple-50 rounded-full flex items-center justify-center border border-purple-100/50">
                            <span className="material-symbols-outlined text-3xl text-purple-400 animate-spin">psychology</span>
                        </div>
                        <p className="text-xs font-bold text-slate-400 animate-pulse">Verileriniz analiz ediliyor...</p>
                    </div>
                )}
                
                {insight && insight.bullets && insight.bullets.length > 0 ? (
                    <div className="space-y-8">
                        {bullets.slice(0, 3).map((bullet: string, i: number) => {
                            const conf = iconConfig[i % iconConfig.length];
                            
                            let title = "Önemli Tespit";
                            let desc = bullet;
                            const parts = bullet.split(':');
                            if (parts.length > 1) {
                                title = parts[0].trim();
                                desc = parts.slice(1).join(':').trim();
                            } else {
                                const sentences = bullet.split('.');
                                if (sentences.length > 1 && sentences[0].length < 40) {
                                    title = sentences[0].trim();
                                    desc = sentences.slice(1).join('.').trim() || bullet;
                                }
                            }
                            
                            return (
                                <div key={i} className="flex items-start gap-4 animate-in slide-in-from-right-4 fade-in duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className={`size-12 ${conf.bg} rounded-2xl flex items-center justify-center ${conf.text} flex-shrink-0 shadow-sm border border-${conf.colorHint}-200/50 transition-transform hover:scale-105`}>
                                        <span className="material-symbols-outlined text-2xl">{conf.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{i === 0 ? '🏆 EN İYİ FIRSAT' : '🔍 RİSK & ANALİZ'}</p>
                                        <p className="text-[14px] font-black text-slate-800 leading-snug">{title}</p>
                                        <p className="text-[12px] text-slate-500 mt-1.5 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : !isPending && (
                    <div className="space-y-8 opacity-40 grayscale flex-1 flex flex-col justify-center">
                        {/* Demo/Skeleton Items */}
                        <div className="flex items-start gap-4">
                            <div className="size-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 flex-shrink-0"><span className="material-symbols-outlined text-2xl">insights</span></div>
                            <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Veri Bekleniyor</p>
                                <p className="text-sm font-black text-slate-800">Analiz Yapılmadı</p>
                                <p className="text-[11px] text-slate-500 mt-1">İşletme verileriniz henüz işlenmedi.</p>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="mt-4 pt-6 border-t border-slate-100 flex flex-col gap-4">
                    <button 
                        onClick={() => handleRefresh(true)}
                        disabled={isPending}
                        className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-[13px] font-bold hover:bg-white hover:border-purple-300 hover:text-purple-600 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 group"
                    >
                        <span className={`material-symbols-outlined text-[20px] group-hover:rotate-180 transition-transform duration-500 ${isPending ? 'animate-spin' : ''}`}>sync</span>
                        {isPending ? 'Analiz Ediliyor...' : 'Verileri Yenile'}
                    </button>
                    <div className="flex items-center justify-center gap-2 opacity-40">
                        <span className="size-1.5 rounded-full bg-emerald-500"></span>
                        <p className="text-[10px] font-bold text-slate-500">
                            {generatedAt ? `Son Güncelleme: ${new Date(generatedAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}` : 'Canlı Analiz Sistemi Aktif'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
