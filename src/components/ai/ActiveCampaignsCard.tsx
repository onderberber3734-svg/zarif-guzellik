"use client";

import Link from "next/link";

interface Campaign {
    id: string;
    name: string;
    status: string;
    channel?: string;
    revenue?: number;
    performance?: number;
}

export function ActiveCampaignsCard({ campaigns }: { campaigns: Campaign[] }) {
    // Tasarımdaki statik örnek kampanyalar
    const defaultCampaigns = [
        { id: "1", name: "Churn Win-Back: Lazer", status: "YAYINDA", color: "emerald", channel: "SMS", channelColor: "blue", revenue: 12200, performance: 75 },
        { id: "2", name: "Flash Deal: Yarın Öğleden Sonra", status: "AKTİF", color: "amber", channel: "Instagram", channelColor: "pink", revenue: 3450, performance: 40 }
    ];

    // Şimdilik demo veriler kullanılıyor (AI sistemi için), gerçek veri propstan maplenebilir
    const displayCampaigns = campaigns.length > 0 ? campaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status === "active" ? "AKTİF" : "YAYINDA", // statüye göre mapping
        color: c.status === "active" ? "amber" : "emerald",
        channel: "SMS", // DB'de kanal yoksa varsayılan
        channelColor: "blue",
        revenue: 0, 
        performance: 50
    })) : defaultCampaigns;

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex items-end justify-between px-2">
                <div>
                    <h4 className="text-2xl font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                        Yayındaki Kampanyalar
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium">Aktif pazarlama kanallarınızın performansı</p>
                </div>
                <Link href="/kampanyalar" className="text-[13px] font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1 mb-1">
                    Tümünü Yönet
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </Link>
            </div>
            
            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex-1 flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left min-w-[500px]">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">KAMPANYA & DURUM</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">KANAL</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">GELİR</th>
                                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">PERFORMANS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayCampaigns.map((camp) => (
                                <tr key={camp.id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <p className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-purple-700 transition-colors">{camp.name}</p>
                                        <span className={`text-[10px] px-2.5 py-1 bg-${camp.color === 'emerald' ? 'emerald' : 'amber'}-50 text-${camp.color === 'emerald' ? 'emerald' : 'amber'}-600 font-bold rounded-lg border border-${camp.color === 'emerald' ? 'emerald' : 'amber'}-100/50`}>
                                            {camp.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100`}>
                                            <span className={`size-1.5 rounded-full bg-${camp.channelColor === 'blue' ? 'blue' : 'pink'}-400`}></span>
                                            <span className="text-slate-600 text-[11px] font-bold">{camp.channel}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <p className="font-black text-base text-slate-900">₺{camp.revenue.toLocaleString('tr-TR')}</p>
                                        <p className="text-[10px] text-emerald-500 font-bold mt-0.5">Kurtarılan</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-[11px] font-black text-slate-400">%{camp.performance}</span>
                                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                                                <div 
                                                    className="bg-gradient-to-r from-purple-500 to-purple-700 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(168,85,247,0.3)]" 
                                                    style={{ width: `${camp.performance}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {displayCampaigns.length === 0 && (
                    <div className="p-16 text-center flex flex-col items-center justify-center flex-1">
                        <div className="size-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-4 border border-slate-100 text-slate-300">
                            <span className="material-symbols-outlined text-3xl">campaign</span>
                        </div>
                        <p className="text-sm font-bold text-slate-500">Yayında kampanya bulunmuyor.</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">AI asistanı üzerinden yeni bir kampanya başlatabilirsiniz.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
