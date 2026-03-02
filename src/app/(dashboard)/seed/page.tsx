"use client";

import { useState } from "react";
import { seedDemoData } from "@/app/actions/seed";

export default function SeedPage() {
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSeed = async () => {
        setStatus("loading");
        setMessage("");
        try {
            const result = await seedDemoData();
            if (result.success) {
                setStatus("done");
                setMessage(result.message);
            } else {
                setStatus("error");
                setMessage(result.message);
            }
        } catch (e: any) {
            setStatus("error");
            setMessage("Beklenmeyen hata: " + e.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-200 max-w-md w-full text-center">
                <div className="size-16 mx-auto bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-3xl text-[var(--color-primary)]">science</span>
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Demo Veri Yükle</h1>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                    Bu işlem;{" "}
                    <span className="font-bold text-slate-700">18 test müşterisi</span> ve{" "}
                    <span className="font-bold text-slate-700">35 randevu</span>{" "}
                    ekler. Tüm kayıtlar yalnızca <span className="font-bold text-slate-700">sizin işletmenize</span> ait olacaktır.
                </p>

                {status === "idle" && (
                    <button
                        onClick={handleSeed}
                        className="w-full py-4 bg-[var(--color-primary)] text-white rounded-2xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all"
                    >
                        Demo Veri Ekle
                    </button>
                )}

                {status === "loading" && (
                    <div className="flex flex-col items-center gap-3 text-[var(--color-primary)]">
                        <div className="size-8 border-4 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin"></div>
                        <p className="text-sm font-medium">Veriler oluşturuluyor, lütfen bekleyin...</p>
                    </div>
                )}

                {status === "done" && (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 font-medium text-sm">
                            {message}
                        </div>
                        <a href="/musteriler" className="block w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm">
                            Müşterileri Görüntüle →
                        </a>
                        <a href="/randevular" className="block w-full py-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl font-bold hover:bg-[var(--color-primary)]/20 transition-all text-sm">
                            Randevuları Görüntüle →
                        </a>
                    </div>
                )}

                {status === "error" && (
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-medium text-sm">
                            {message}
                        </div>
                        <button
                            onClick={() => setStatus("idle")}
                            className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all text-sm"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                )}

                <p className="mt-6 text-xs text-slate-400">
                    ⚠️ Bu sayfayı yalnızca test aşamasında kullanın. Her çalıştırmada yeni kayıtlar eklenir.
                </p>
            </div>
        </div>
    );
}
