"use client";

import { useState } from "react";
import { updateBusinessProfile } from "@/app/actions/businesses";

export default function IsletmeAyarlari({ business }: any) {
    const [bizName, setBizName] = useState(business?.name || "");
    const [bizPhone, setBizPhone] = useState(business?.phone || "");
    const [bizCity, setBizCity] = useState(business?.city || "");
    const [bizAddress, setBizAddress] = useState(business?.address || "");
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSuccessMessage("");

        await updateBusinessProfile(business?.id, {
            name: bizName,
            phone: bizPhone,
            city: bizCity,
            address: bizAddress
        });

        setIsSaving(false);
        setSuccessMessage("İşletme bilgileriniz başarıyla güncellendi.");
        setTimeout(() => setSuccessMessage(""), 3000);
    };

    return (
        <div className="p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">İşletme Bilgileri</h3>
            <p className="text-slate-500 mb-8 font-medium">Salonunuza ait iletişim ve adres detayları.</p>

            <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">İşletme Adı</label>
                    <input
                        type="text"
                        value={bizName}
                        onChange={e => setBizName(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Telefon Numarası</label>
                        <input
                            type="text"
                            value={bizPhone}
                            onChange={e => setBizPhone(e.target.value)}
                            placeholder="05XX XXX XX XX"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Şehir / İlçe</label>
                        <input
                            type="text"
                            value={bizCity}
                            onChange={e => setBizCity(e.target.value)}
                            placeholder="İstanbul / Şişli"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Açık Adres</label>
                    <textarea
                        value={bizAddress}
                        onChange={e => setBizAddress(e.target.value)}
                        placeholder="Mahalle, Sokak, No..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition-all resize-none"
                    ></textarea>
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
