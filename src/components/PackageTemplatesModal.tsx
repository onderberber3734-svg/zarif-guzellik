"use client";

import { useState, useEffect } from "react";

export interface PackageTemplate {
    id: string;
    name: string;
    categoryName: string;
    sessions: number;
    intervalDays: number;
    price: number | ''; // Empty initially
    selected: boolean;
}

const MVP_TEMPLATES: Omit<PackageTemplate, 'id' | 'price' | 'selected'>[] = [
    // Lazer Paketleri
    { name: "Tüm Vücut Lazer Paketi", categoryName: "Lazer & Epilasyon", sessions: 6, intervalDays: 30 },
    { name: "Tüm Vücut Lazer Paketi", categoryName: "Lazer & Epilasyon", sessions: 8, intervalDays: 30 },
    { name: "Bacak + Koltuk Altı Lazer Paketi", categoryName: "Lazer & Epilasyon", sessions: 6, intervalDays: 30 },
    { name: "Bikini + Koltuk Altı Lazer Paketi", categoryName: "Lazer & Epilasyon", sessions: 6, intervalDays: 30 },
    { name: "Yüz Bölgesi Lazer Paketi", categoryName: "Lazer & Epilasyon", sessions: 6, intervalDays: 30 },
    // Cilt Bakımı
    { name: "Hydrafacial Paketi", categoryName: "Cilt Bakımı", sessions: 3, intervalDays: 14 },
    { name: "Hydrafacial Paketi", categoryName: "Cilt Bakımı", sessions: 6, intervalDays: 14 },
    { name: "Klasik Cilt Bakımı Paketi", categoryName: "Cilt Bakımı", sessions: 3, intervalDays: 14 },
    { name: "Klasik Cilt Bakımı Paketi", categoryName: "Cilt Bakımı", sessions: 6, intervalDays: 14 },
    // Anti-aging / RF
    { name: "Leke Bakımı Paketi", categoryName: "Cilt Bakımı", sessions: 4, intervalDays: 14 },
    { name: "Anti-Aging Bakım Paketi", categoryName: "Cilt Bakımı", sessions: 4, intervalDays: 14 },
    { name: "Altın İğne RF / RF Microneedling Paketi", categoryName: "Cilt Bakımı", sessions: 3, intervalDays: 21 },
    // Bölgesel İncelme
    { name: "Bölgesel İncelme Paketi (Full Body)", categoryName: "Bölgesel İncelme", sessions: 5, intervalDays: 7 },
    { name: "Bölgesel İncelme Paketi (Full Body)", categoryName: "Bölgesel İncelme", sessions: 10, intervalDays: 7 },
    { name: "G5 / Selülit Bakımı Paketi", categoryName: "Bölgesel İncelme", sessions: 5, intervalDays: 7 },
    { name: "G5 / Selülit Bakımı Paketi", categoryName: "Bölgesel İncelme", sessions: 8, intervalDays: 7 }
];

interface PackageTemplatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (templates: PackageTemplate[]) => void;
}

export function PackageTemplatesModal({ isOpen, onClose, onSave }: PackageTemplatesModalProps) {
    const [templates, setTemplates] = useState<PackageTemplate[]>([]);
    const [error, setError] = useState("");

    // Initialize templates only when opened
    useEffect(() => {
        if (isOpen) {
            setTemplates(
                MVP_TEMPLATES.map((t, index) => ({
                    ...t,
                    id: `tpl_${index}`,
                    price: '',
                    selected: false
                }))
            );
            setError("");
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleAll = (checked: boolean) => {
        setTemplates(templates.map(t => ({ ...t, selected: checked })));
    };

    const toggleTemplate = (id: string, checked: boolean) => {
        setTemplates(templates.map(t => t.id === id ? { ...t, selected: checked } : t));
    };

    const updatePrice = (id: string, priceText: string) => {
        setTemplates(templates.map(t => t.id === id ? { ...t, price: priceText === '' ? '' : Number(priceText) } : t));
    };

    const updateProperty = (id: string, prop: 'sessions' | 'intervalDays', value: string) => {
        setTemplates(templates.map(t => t.id === id ? { ...t, [prop]: value === '' ? '' : Number(value) } : t));
    };

    const handleSave = () => {
        const selected = templates.filter(t => t.selected);

        // Validation: Empty check (Optional requirement allows empty save but maybe user clicked accidentally)
        // If they checked some, ensure all checked have prices > 0
        const invalidPrices = selected.filter(t => t.price === '' || t.price <= 0);
        if (invalidPrices.length > 0) {
            setError("Lütfen seçtiğiniz tüm paketler için geçerli bir fiyat (₺) giriniz.");
            return;
        }

        setError("");
        onSave(selected);
    };

    // Grouping
    const grouped = templates.reduce((acc, current) => {
        if (!acc[current.categoryName]) acc[current.categoryName] = [];
        acc[current.categoryName].push(current);
        return acc;
    }, {} as Record<string, PackageTemplate[]>);

    const isAllSelected = templates.length > 0 && templates.every(t => t.selected);

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9998] transition-opacity" onClick={onClose} />
            <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-[9999] transform transition-transform overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">layers</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">Hazır Paket Şablonları</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">Sektörde en çok tercih edilen paketleri hızlıca ekleyin.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700 select-none">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={(e) => toggleAll(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                            />
                            Tümünü Seç
                        </label>
                        <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
                            {templates.filter(t => t.selected).length} Seçildi
                        </span>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl font-bold flex items-center gap-2 border border-red-100 animate-in fade-in">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {error}
                        </div>
                    )}

                    {/* Lists */}
                    <div className="space-y-8 pb-10">
                        {Object.entries(grouped).map(([category, items]) => (
                            <div key={category} className="space-y-3">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">{category}</h4>
                                <div className="space-y-2">
                                    {items.map(item => (
                                        <div key={item.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border-2 transition-all ${item.selected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}>

                                            <div className="flex items-start gap-3 flex-1 mb-4 sm:mb-0">
                                                <div
                                                    className="pt-1 cursor-pointer flex-shrink-0"
                                                    onClick={() => toggleTemplate(item.id, !item.selected)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={item.selected}
                                                        readOnly
                                                        className="w-5 h-5 rounded-md border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] pointer-events-none"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <p
                                                        className={`font-bold text-sm transition-colors cursor-pointer block mb-2 ${item.selected ? 'text-[var(--color-primary)]' : 'text-slate-800'}`}
                                                        onClick={() => toggleTemplate(item.id, !item.selected)}
                                                    >
                                                        {item.name}
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className={`flex items-center border rounded-lg px-2 py-1 overflow-hidden transition-colors ${item.selected ? 'bg-white border-slate-200 focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]' : 'bg-slate-50 border-slate-100 opacity-60 pointer-events-none'}`}>
                                                            <input
                                                                type="number"
                                                                value={item.sessions}
                                                                onChange={(e) => updateProperty(item.id, 'sessions', e.target.value)}
                                                                disabled={!item.selected}
                                                                className="w-10 text-xs font-bold text-slate-700 bg-transparent outline-none text-center"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-500 shrink-0 ml-1">Seans</span>
                                                        </div>
                                                        <div className={`flex items-center border rounded-lg px-2 py-1 overflow-hidden transition-colors ${item.selected ? 'bg-white border-slate-200 focus-within:border-[var(--color-primary)] focus-within:ring-1 focus-within:ring-[var(--color-primary)]' : 'bg-slate-50 border-slate-100 opacity-60 pointer-events-none'}`}>
                                                            <input
                                                                type="number"
                                                                value={item.intervalDays}
                                                                onChange={(e) => updateProperty(item.id, 'intervalDays', e.target.value)}
                                                                disabled={!item.selected}
                                                                className="w-10 text-xs font-bold text-slate-700 bg-transparent outline-none text-center"
                                                            />
                                                            <span className="text-[10px] font-bold text-slate-500 shrink-0 ml-1">Gün Aralık</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="shrink-0 w-full sm:w-36 relative group sm:ml-4">
                                                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] transition-colors ${item.selected && (!item.price || item.price <= 0) ? 'text-red-400' : 'text-slate-400'}`}>payments</span>
                                                <input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => updatePrice(item.id, e.target.value)}
                                                    placeholder="Fiyat (₺)"
                                                    disabled={!item.selected}
                                                    className={`w-full pl-10 pr-3 py-3 rounded-xl text-sm font-bold border transition-all ${!item.selected ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60 pointer-events-none' : item.price === '' ? 'bg-red-50 border-red-200 focus:border-red-400 focus:ring-1 focus:ring-red-400 text-red-700 shadow-sm' : 'bg-white border-slate-200 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] text-slate-900 shadow-sm'}`}
                                                />
                                                {item.selected && (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">₺</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 bg-white sticky bottom-0 z-10 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                        İptal
                    </button>
                    <button onClick={handleSave} className="flex-[2] py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-[0_8px_16px_-6px_rgba(var(--color-primary-rgb),0.5)] hover:opacity-90 transition-opacity">
                        Şablonları Ekle ({templates.filter(t => t.selected).length})
                    </button>
                </div>
            </div>
        </>
    );
}
