"use client";

import { useState, useEffect } from "react";

interface HizmetEkleModalProps {
    isOpen: boolean;
    initialData?: any;
    onClose: () => void;
    onAdd: (serviceData: any) => void;
}

export function HizmetEkleModal({ isOpen, initialData, onClose, onAdd }: HizmetEkleModalProps) {
    const [name, setName] = useState("");
    const [duration, setDuration] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Eğer formData düzenlemek üzere geldiyse form alanlarını doldur
    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setDuration(initialData.duration_minutes ? String(initialData.duration_minutes) : "");
            setPrice(initialData.price ? String(initialData.price) : "");
            setDescription(initialData.description || "");
        } else {
            setName("");
            setDuration("");
            setPrice("");
            setDescription("");
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name || !duration || !price) {
            setError("Lütfen zorunlu alanları doldurun.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await onAdd({
                name,
                duration_minutes: Number(duration),
                price: Number(price),
                description
            });

            // Formu temizle ve kapat
            setName("");
            setDuration("");
            setPrice("");
            setDescription("");
            onClose();
        } catch (err: any) {
            setError(err.message || "Hizmet eklenirken bir hata oluştu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Modal / Drawer Özelliği taşıyan Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform overflow-y-auto flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">
                                {initialData ? "edit_document" : "add_circle"}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">
                                {initialData ? "Hizmeti Düzenle" : "Yeni Hizmet Ekle"}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                {initialData ? "Mevcut işleminizin detaylarını güncelleyin." : "Salonunuza yeni bir işlem tanımlayın."}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 p-6 space-y-8">
                    {/* AI Öneri Kartı */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100 flex gap-3">
                        <span className="material-symbols-outlined text-[var(--color-primary)]">auto_awesome</span>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                            Bölgenizdeki <b>"Cilt Bakımı"</b> aramaları bu ay <b>%24</b> arttı. Yeni bir cilt bakımı paketi eklemek işletmenizin gelirini artırabilir.
                        </p>
                    </div>

                    <form className="space-y-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Temel Bilgiler</h4>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Hizmet Adı *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Örn: Medikal Cilt Bakımı"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/30 text-sm outline-none transition-all placeholder:text-slate-400 font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-slate-500">Kategori *</label>
                                    <div className="flex items-center gap-2 p-3 bg-purple-50 border-2 border-purple-100 rounded-xl text-[var(--color-primary)] text-sm font-bold">
                                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                        <span>AI belirleyecek</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">İsme göre otomatik atanır</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Süre (Dk) *</label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">schedule</span>
                                        <input
                                            type="number"
                                            value={duration}
                                            onChange={(e) => setDuration(e.target.value)}
                                            placeholder="45"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm outline-none font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Fiyatlandırma</h4>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Satış Fiyatı (₺) *</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₺</span>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        placeholder="850"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-lg font-bold text-slate-900 outline-none"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-1 rounded-lg">
                                        AI Önerisi: ₺750 - ₺950
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Kişiselleştirme</h4>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Açıklama (Müşteriler Görecek)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Bu hizmetin detayları nelerdir?"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm outline-none resize-none font-medium text-slate-600"
                                ></textarea>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-3 sticky bottom-0">
                    {error && (
                        <div className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded-lg mb-2 text-center">
                            {error}
                        </div>
                    )}
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm disabled:opacity-50"
                        >
                            İptal
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-[2] px-4 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg shadow-purple-500/30 hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                            ) : (
                                <span className="material-symbols-outlined text-[18px]">check</span>
                            )}
                            {loading ? 'İşlem Yapılıyor...' : (initialData ? 'Hizmeti Güncelle' : 'Hizmeti Oluştur')}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
