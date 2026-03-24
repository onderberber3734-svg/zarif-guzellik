"use client";

import Link from "next/link";

interface Campaign {
    id: string;
    name: string;
    status: string;
    channel?: string;
    estimated_audience_count?: number;
    send_status?: string;
    offer_type?: string;
    offer_value?: string;
    created_at?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
    active:    { label: "AKTİF",    bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-100/50" },
    published: { label: "YAYINDA",  bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100/50" },
    sending:   { label: "GÖNDERİLİYOR", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100/50" },
    sent:      { label: "GÖNDERİLDİ", bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100/50" },
    draft:     { label: "TASLAK",   bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-100/50" },
};

const CHANNEL_ICONS: Record<string, { icon: string; color: string }> = {
    whatsapp:  { icon: "chat",       color: "bg-green-400" },
    sms:       { icon: "sms",        color: "bg-blue-400" },
    instagram: { icon: "photo_camera", color: "bg-pink-400" },
    email:     { icon: "mail",       color: "bg-indigo-400" },
};

function formatDate(dateStr?: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export function ActiveCampaignsCard({ campaigns }: { campaigns: Campaign[] }) {
    const hasCampaigns = campaigns.length > 0;

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
                {hasCampaigns ? (
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left min-w-[500px]">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">KAMPANYA & DURUM</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">KANAL</th>
                                    <th className="px-6 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">HEDEFLENDİ</th>
                                    <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">TEKLİF</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {campaigns.map((camp) => {
                                    const statusInfo = STATUS_MAP[camp.status] || STATUS_MAP.draft;
                                    const channelKey = (camp.channel || "whatsapp").toLowerCase();
                                    const channelInfo = CHANNEL_ICONS[channelKey] || CHANNEL_ICONS.whatsapp;

                                    return (
                                        <tr key={camp.id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <p className="font-extrabold text-sm text-slate-800 mb-1.5 group-hover:text-purple-700 transition-colors">{camp.name}</p>
                                                <span className={`text-[10px] px-2.5 py-1 ${statusInfo.bg} ${statusInfo.text} font-bold rounded-lg border ${statusInfo.border}`}>
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                                                    <span className={`size-1.5 rounded-full ${channelInfo.color}`}></span>
                                                    <span className="text-slate-600 text-[11px] font-bold capitalize">{camp.channel || "WhatsApp"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <p className="font-black text-base text-slate-900">{camp.estimated_audience_count || 0}</p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">kişi</p>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {camp.offer_value ? (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-[11px] font-bold border border-purple-100/50">
                                                        <span className="material-symbols-outlined text-sm">local_offer</span>
                                                        {camp.offer_type === "percentage_discount" ? `%${camp.offer_value} İndirim` : camp.offer_value}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
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
