"use client";

import { useTransition, useState } from "react";
import { runBusinessSeed } from "@/app/actions/seed";

export default function SeedPage() {
    const [isPending, startTransition] = useTransition();
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errmsg, setErrmsg] = useState("");

    const handleSeed = () => {
        if (!confirm("DİKKAT! Bu işlem, hesabınıza (SADECE sizin işletmenize) bağlı TÜM randevu, müşteri ve gelir geçmişinizi silecektir. Devam etmek istiyor musunuz?")) return;
        
        setStatus("loading");
        startTransition(async () => {
            const result = await runBusinessSeed();
            if (result.success) {
                setStatus("success");
            } else {
                setStatus("error");
                setErrmsg(result.error || "Bilinmeyen hata");
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 h-full w-full">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center border border-slate-100">
                <div className="w-20 h-20 bg-rose-50 rounded-full mx-auto flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-rose-500 text-4xl">database</span>
                </div>
                
                <h1 className="text-2xl font-extrabold text-slate-800 mb-4">Geliştirici Sandbox Modu</h1>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    Sistemde <strong>70 aktif müşteri, 5 personel ve ~250 geçmiş/gelecek randevu</strong> ile sahte, ancak gerçekçi bir veri simülasyonu başlatıyorsunuz. İşletmenizdeki eski kayıtlar <u>tamamen sıfırlanacaktır</u>.
                </p>

                {status === "idle" && (
                    <button 
                        onClick={handleSeed}
                        className="w-full bg-[#6832db] hover:bg-[#5729bc] text-white py-4 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">bolt</span>
                        Veritabanını Sıfırla & Doldur
                    </button>
                )}

                {status === "loading" && (
                    <div className="flex flex-col items-center py-6">
                        <span className="w-8 h-8 border-4 border-[#6832db] border-t-transparent rounded-full animate-spin mb-4"></span>
                        <p className="font-bold text-slate-700 animate-pulse">Yeni İşletmeniz Yaratılıyor...</p>
                        <p className="text-sm text-slate-500 mt-2">Bu işlem birkaç saniye sürebilir.</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col items-center">
                        <span className="material-symbols-outlined text-emerald-500 text-4xl mb-2">check_circle</span>
                        <h3 className="font-bold text-emerald-800 mb-1">Simülasyon Aktif!</h3>
                        <p className="text-sm text-emerald-600 mb-4">Veritabanınız başarıyla şekillendirildi.</p>
                        <a href="/" className="px-6 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors">
                            Ana Ekrana Dön
                        </a>
                    </div>
                )}

                {status === "error" && (
                    <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl flex flex-col items-center">
                        <span className="material-symbols-outlined text-rose-500 text-4xl mb-2">error</span>
                        <h3 className="font-bold text-rose-800 mb-1">Hata Oluştu!</h3>
                        <p className="text-sm text-rose-600 mb-4">{errmsg}</p>
                        <button onClick={() => setStatus("idle")} className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors">
                            Tekrar Dene
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
