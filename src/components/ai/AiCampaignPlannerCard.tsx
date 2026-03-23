"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AiCampaignPlannerCard() {
    const [goal, setGoal] = useState("");
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const router = useRouter();

    const types = [
        { id: "loyal", label: "Müşteri Sadakati", icon: "favorite", color: "pink", bg: "bg-pink-100", text: "text-pink-600" },
        { id: "new", label: "Yeni Müşteri Çek", icon: "person_add", color: "blue", bg: "bg-blue-100", text: "text-blue-600" },
        { id: "slots", label: "Boş Slot Doldur", icon: "flash_on", color: "amber", bg: "bg-amber-100", text: "text-amber-600" },
        { id: "revenue", label: "Geliri Artır", icon: "trending_up", color: "emerald", bg: "bg-emerald-100", text: "text-emerald-600" }
    ];

    const handleCreate = () => {
        if (!goal) return;
        
        // Parametrelerle kampanyalar sayfasına git
        const params = new URLSearchParams();
        params.set("ai_prompt", goal);
        if (selectedType) {
            params.set("ai_goal", selectedType);
        }
        
        router.push(`/kampanyalar?${params.toString()}`);
    };

    return (
        <section className="bg-purple-600/5 rounded-[3rem] p-6 lg:p-10 border border-purple-600/10 w-full overflow-hidden">
            <div className="max-w-4xl mx-auto text-center mb-8 lg:mb-12">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/10 text-purple-700 text-xs font-bold border border-purple-600/20 mb-6">
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    AI ODAKLI KAMPANYA PLANLAYICI
                </div>
                <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Yeni bir strateji belirleyelim
                </h2>
                <p className="text-slate-600 text-base lg:text-lg">
                    Yapay zeka asistanınız işletme hedeflerinize göre kampanya kurgular.
                </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 lg:mb-12 w-full max-w-5xl mx-auto">
                {types.map((t) => (
                    <button 
                        key={t.id}
                        onClick={() => setSelectedType(t.id === selectedType ? null : t.id)}
                        className={`flex flex-col items-center gap-3 p-4 lg:p-6 bg-white border rounded-[2rem] transition-all group ${
                            selectedType === t.id ? 'border-purple-600 shadow-md ring-4 ring-purple-100' : 'border-slate-200 hover:border-purple-500/40 shadow-sm'
                        }`}
                    >
                        <div className={`size-12 lg:size-14 ${t.bg} rounded-2xl flex items-center justify-center ${t.text} group-hover:scale-110 transition-transform ${selectedType === t.id ? 'scale-110' : ''}`}>
                            <span className="material-symbols-outlined text-2xl lg:text-3xl">{t.icon}</span>
                        </div>
                        <span className="font-bold text-xs lg:text-sm text-slate-800">{t.label}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-200 w-full max-w-5xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                    {/* SOL ALAN : Prompt Girişi */}
                    <div className="flex-1 space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">AI PROMPT / HEDEFİNİZ</label>
                            <div className="relative">
                                <textarea 
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                    className="w-full p-5 pr-14 bg-slate-50 border border-slate-200/60 rounded-2xl outline-none focus:ring-4 focus:ring-purple-600/10 focus:border-purple-600/50 text-slate-700 text-sm font-medium italic min-h-[120px] resize-none" 
                                    placeholder="Örn: 'Son 3 aydır lazer epilasyon randevusu almayan müşterilere %20 indirimli bir paket sunmak istiyorum.'" 
                                ></textarea>
                                <button 
                                    disabled={!goal}
                                    onClick={handleCreate}
                                    className="absolute right-4 bottom-4 size-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md shadow-purple-600/30"
                                >
                                    <span className="material-symbols-outlined text-xl">send</span>
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Tahmini Erişim</p>
                                <p className="text-lg font-extrabold text-slate-800">AI Analiz Edecek</p>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <p className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Önerilen Kanal</p>
                                <p className="text-lg font-extrabold text-purple-600">SMS / WhatsApp</p>
                            </div>
                        </div>
                    </div>

                    {/* SAĞ ALAN : Taslak İzleme  */}
                    <div className="w-full lg:w-[320px] flex flex-col justify-between space-y-4">
                        <div className="p-6 bg-[#f9f5ff] rounded-[2rem] border border-dashed border-purple-300 relative flex-1 flex flex-col justify-center">
                            <span className="absolute -top-3 left-6 px-3 py-1 bg-purple-600 text-white text-[10px] font-bold rounded-full shadow-sm">AI TASLAK</span>
                            <div className="space-y-4 pt-2">
                                <p className="text-[13px] text-slate-700 leading-relaxed font-medium italic">
                                    "Merhaba <span className="text-purple-600 font-bold">{'{Müşteri_Adı}'}</span>, Zarif Güzellik'te seni özledik! Sana özel tanımlanan harika bir sürprizimiz var. Hemen kontrol et!"
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold mt-4 pt-4 border-t border-purple-200/50">
                                    Hedefinize göre AI özel içerik üretecektir.
                                </p>
                            </div>
                        </div>
                        <button 
                            disabled={!goal}
                            onClick={handleCreate}
                            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">psychology</span>
                            AI ile Kampanya Tasarla
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
