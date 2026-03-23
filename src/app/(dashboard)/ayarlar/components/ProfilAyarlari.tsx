"use client";

import { useState } from "react";
import { updateUserProfile } from "@/app/actions/auth";

export default function ProfilAyarlari({ user }: any) {
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSuccessMessage("");

        await updateUserProfile({ fullName });

        setIsSaving(false);
        setSuccessMessage("Profil bilgileriniz başarıyla güncellendi.");
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    return (
        <div className="p-10 animate-in fade-in zoom-in-95 duration-500">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Profil Bilgileri</h3>

            <div className="flex items-center gap-6 mb-10 pb-10 border-b border-slate-100">
                <div className="size-24 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-3xl font-bold shadow-inner">
                    <span className="material-symbols-outlined text-4xl">person</span>
                </div>
                <div>
                    <h4 className="text-lg font-bold text-slate-800">{fullName || user?.email?.split('@')[0] || "Kullanıcı"}</h4>
                    <p className="text-slate-500">{user?.email}</p>
                    <button className="mt-3 text-sm font-bold text-[var(--color-primary)] hover:underline">Şifreyi Değiştir</button>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Ad Soyad</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Zarif Yönetici"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition-all"
                        />
                    </div>
                </div>

                {successMessage && (
                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 text-sm font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined shrink-0 text-emerald-500">check_circle</span>
                        {successMessage}
                    </div>
                )}

                <div className="flex justify-end pt-6">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-[var(--color-primary)] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                        <span className={`material-symbols-outlined ${isSaving ? 'animate-spin' : ''}`}>
                            {isSaving ? 'progress_activity' : 'save'}
                        </span>
                    </button>
                </div>
            </form>
        </div>
    );
}
