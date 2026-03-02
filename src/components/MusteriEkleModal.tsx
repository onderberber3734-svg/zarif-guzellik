"use client";

import { useState, useEffect } from "react";

interface MusteriEkleModalProps {
    isOpen: boolean;
    initialData?: any;
    onClose: () => void;
    onAdd: (customer: any) => Promise<void>;
}

export function MusteriEkleModal({ isOpen, initialData, onClose, onAdd }: MusteriEkleModalProps) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [notes, setNotes] = useState("");
    const [isVip, setIsVip] = useState(false);
    const [birthDate, setBirthDate] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFirstName(initialData.first_name || "");
                setLastName(initialData.last_name || "");
                setPhone(initialData.phone || "");
                setEmail(initialData.email || "");
                setNotes(initialData.notes || "");
                setIsVip(initialData.is_vip || false);
                setBirthDate(initialData.birth_date || "");
            } else {
                setFirstName("");
                setLastName("");
                setPhone("");
                setEmail("");
                setNotes("");
                setIsVip(false);
                setBirthDate("");
            }
            setError("");
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
            setError("Lütfen Ad, Soyad ve Telefon Numarası alanlarını doldurun.");
            return;
        }

        setIsSubmitting(true);
        try {
            await onAdd({
                first_name: firstName,
                last_name: lastName,
                phone,
                email,
                notes,
                is_vip: isVip,
                birth_date: birthDate || undefined
            });
            onClose();
        } catch (err: any) {
            setError(err.message || "İşlem sırasında bir hata oluştu.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
            {/* Arka plan overlay */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Paneli */}
            <div className="relative w-screen max-w-md bg-white shadow-2xl flex flex-col h-full transform transition-transform border-l border-slate-200 animate-in slide-in-from-right duration-300">
                <div className="px-6 py-6 border-b border-slate-100 flex items-center justify-between bg-[var(--color-primary)]/5">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">
                            {initialData ? "Müşteriyi Düzenle" : "Yeni Müşteri Ekle"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">Müşteri detaylarını aşağıya girin.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-10 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                    >
                        <span className="material-symbols-outlined text-slate-500">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Ad</label>
                                <input
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-medium"
                                    placeholder="Örn: Elif"
                                    type="text"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Soyad</label>
                                <input
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-medium"
                                    placeholder="Örn: Yılmaz"
                                    type="text"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Telefon Numarası</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">+90</span>
                                <input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-medium"
                                    placeholder="5xx xxx xx xx"
                                    type="tel"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">E-posta (Opsiyonel)</label>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-medium"
                                placeholder="ornek@mail.com"
                                type="email"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Doğum Tarihi (Opsiyonel)</label>
                            <input
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-medium text-slate-700"
                                type="date"
                            />
                        </div>

                        {/* Segment Seçimi (VIP Checkbox) */}
                        <div className="pt-2">
                            <label className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-100 rounded-xl cursor-pointer hover:bg-purple-100/50 transition-colors">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={isVip}
                                        onChange={(e) => setIsVip(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="w-6 h-6 rounded border-2 border-[var(--color-primary)] bg-white peer-checked:bg-[var(--color-primary)] transition-colors flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-sm opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--color-primary)] text-sm flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-lg">diamond</span>
                                        VIP Müşteri Statüsü
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">Müşteri listelerinde ve raporlarda VIP rozeti ile öne çıkarılır.</p>
                                </div>
                            </label>
                        </div>

                        <div className="space-y-1.5 pt-2">
                            <label className="text-sm font-bold text-slate-700">Müşteri Notları</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-medium"
                                placeholder="Müşteri hakkında özel uyarılar, alerjiler veya tercihler..."
                                rows={3}
                            ></textarea>
                        </div>
                    </form>
                </div>

                <div className="px-6 py-6 border-t border-slate-100 bg-white space-y-3">
                    <button
                        type="submit"
                        form="customer-form"
                        disabled={isSubmitting}
                        className="w-full bg-[var(--color-primary)] hover:opacity-90 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/30 transition-all disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined">save</span>
                        {isSubmitting ? "Kaydediliyor..." : "Müşteriyi Kaydet"}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-bold transition-all"
                    >
                        İptal Et
                    </button>
                </div>
            </div>
        </div>
    );
}
