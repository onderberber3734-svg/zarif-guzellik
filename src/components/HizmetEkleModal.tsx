"use client";

import { useState, useEffect } from "react";

interface HizmetEkleModalProps {
    isOpen: boolean;
    initialData?: any;
    onClose: () => void;
    onAdd: (serviceData: any) => void;
    categories?: { id: string; name: string }[];
    activeCategoryId?: string;
    salons?: any[];
    staffList?: any[];
}

export function HizmetEkleModal({ isOpen, initialData, onClose, onAdd, categories = [], activeCategoryId = "all", salons = [], staffList = [] }: HizmetEkleModalProps) {
    const [name, setName] = useState("");
    const [duration, setDuration] = useState("");
    const [price, setPrice] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [serviceType, setServiceType] = useState<"single" | "package">("single");
    const [defaultTotalSessions, setDefaultTotalSessions] = useState("");
    const [defaultIntervalDays, setDefaultIntervalDays] = useState("");
    const [defaultPackagePrice, setDefaultPackagePrice] = useState("");
    const [selectedSalonIds, setSelectedSalonIds] = useState<string[]>([]);
    const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Eğer formData düzenlemek üzere geldiyse form alanlarını doldur
    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setDuration(initialData.duration_minutes ? String(initialData.duration_minutes) : "");
            setPrice(initialData.price ? String(initialData.price) : "");
            setDescription(initialData.description || "");
            setCategoryId(initialData.category_id || "");
            setServiceType(initialData.service_type || "single");
            setDefaultTotalSessions(initialData.default_total_sessions ? String(initialData.default_total_sessions) : "");
            setDefaultIntervalDays(initialData.default_interval_days ? String(initialData.default_interval_days) : "");
            setDefaultPackagePrice(initialData.default_package_price ? String(initialData.default_package_price) : "");
            setSelectedSalonIds(initialData.salon_services?.map((ss: any) => ss.salon_id) || []);
            // Staff: initialData'dan gelen staff_services'ten ID'leri al
            setSelectedStaffIds(initialData.staff_services?.map((ss: any) => ss.staff_id) || initialData.staff_ids || []);
        } else {
            setName("");
            setDuration("");
            setPrice("");
            setDescription("");
            setCategoryId(activeCategoryId && activeCategoryId !== "all" ? activeCategoryId : (categories.length > 0 ? categories[0].id : ""));
            setServiceType("single");
            setDefaultTotalSessions("8");
            setDefaultIntervalDays("30");
            setDefaultPackagePrice("");
            setSelectedSalonIds([]);
            setSelectedStaffIds([]);
        }
    }, [initialData, isOpen, activeCategoryId, categories]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!name || !duration || !categoryId) {
            setError("Lütfen zorunlu alanları doldurun.");
            return;
        }

        if (serviceType === 'single' && !price) {
            setError("Tek seans hizmetler için fiyat giriniz.");
            return;
        }

        if (serviceType === 'package' && (!defaultTotalSessions || !defaultIntervalDays || !defaultPackagePrice)) {
            setError("Paket detaylarını tam olarak giriniz.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await onAdd({
                name,
                duration_minutes: Number(duration),
                price: Number(price || 0),
                description,
                category_id: categoryId,
                service_type: serviceType,
                default_total_sessions: serviceType === 'package' ? Number(defaultTotalSessions) : null,
                default_interval_days: serviceType === 'package' ? Number(defaultIntervalDays) : null,
                default_package_price: serviceType === 'package' ? Number(defaultPackagePrice) : null,
                salon_ids: selectedSalonIds,
                staff_ids: selectedStaffIds
            });

            // Formu temizle ve kapat
            setName("");
            setDuration("");
            setPrice("");
            setDescription("");
            setServiceType("single");
            setDefaultTotalSessions("8");
            setDefaultIntervalDays("30");
            setDefaultPackagePrice("");
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
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9998] transition-opacity"
                onClick={onClose}
            />

            {/* Modal / Drawer Özelliği taşıyan Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[9999] transform transition-transform overflow-y-auto flex flex-col">
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
                    {/* Modal Body Info */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex gap-3">
                        <span className="material-symbols-outlined text-[var(--color-primary)]">info</span>
                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                            Buradan işletmenize yeni bir hizmet ekleyebilirsiniz. İşlem süresi ve fiyat bilgileri, randevu oluşturulurken temel alınır.
                        </p>
                    </div>

                    <div className="space-y-6">
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
                                <div className="space-y-3">
                                    <label className="block text-xs font-bold text-slate-500">Kategori *</label>
                                    <div className="relative">
                                        <select
                                            value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}
                                            disabled={!initialData && activeCategoryId !== "all"}
                                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm outline-none font-medium appearance-none cursor-pointer text-slate-700 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-100"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                            {categories.length === 0 && <option value="">Kategori Bulunamadı</option>}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                                    </div>
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
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Hizmet Tipi ve Fiyatlandırma</h4>

                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                    <input
                                        type="radio"
                                        value="single"
                                        checked={serviceType === "single"}
                                        onChange={() => setServiceType("single")}
                                        className="accent-[var(--color-primary)] w-4 h-4 cursor-pointer"
                                    />
                                    <span>Tek Seans</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                    <input
                                        type="radio"
                                        value="package"
                                        checked={serviceType === "package"}
                                        onChange={() => setServiceType("package")}
                                        className="accent-[var(--color-primary)] w-4 h-4 cursor-pointer"
                                    />
                                    <span>Paket Hizmet</span>
                                    <span className="text-[10px] bg-purple-100 text-[var(--color-primary)] px-2 py-0.5 rounded-full font-bold ml-1">YENİ</span>
                                </label>
                            </div>

                            {serviceType === "single" ? (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2">Seans Fiyatı (₺) *</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₺</span>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="850"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-lg font-bold text-slate-900 outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 bg-purple-50/50 border border-purple-100 p-4 rounded-xl">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2">Toplam Seans *</label>
                                            <select
                                                value={defaultTotalSessions}
                                                onChange={(e) => setDefaultTotalSessions(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm outline-none font-medium appearance-none"
                                            >
                                                <option value="4">4 Seans</option>
                                                <option value="6">6 Seans</option>
                                                <option value="8">8 Seans</option>
                                                <option value="10">10 Seans</option>
                                                <option value="12">12 Seans</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2">Seans Aralığı *</label>
                                            <select
                                                value={defaultIntervalDays}
                                                onChange={(e) => setDefaultIntervalDays(e.target.value)}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm outline-none font-medium appearance-none"
                                            >
                                                <option value="15">15 Gün</option>
                                                <option value="21">21 Gün</option>
                                                <option value="30">30 Gün</option>
                                                <option value="45">45 Gün</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2">Toplam Paket Fiyatı (₺) *</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₺</span>
                                            <input
                                                type="number"
                                                value={defaultPackagePrice}
                                                onChange={(e) => setDefaultPackagePrice(e.target.value)}
                                                placeholder="8500"
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-lg font-bold text-slate-900 outline-none"
                                            />
                                        </div>
                                    </div>
                                    {defaultPackagePrice && defaultTotalSessions && (
                                        <div className="text-xs font-bold text-[var(--color-primary)] bg-white p-2 border border-purple-100 rounded-lg inline-flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">info</span>
                                            Seans Başı ≈ ₺{(Number(defaultPackagePrice) / Number(defaultTotalSessions)).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4 pt-4">
                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2">Kişiselleştirme</h4>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Açıklama (Müşteriler Görecek)</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Bu hizmetin detayları nelerdir?"
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm outline-none font-medium h-24 resize-none"
                                ></textarea>
                            </div>

                            <div className="pt-4">
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Uygulanacağı Odalar</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {salons.map((salon) => (
                                        <label
                                            key={salon.id}
                                            className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${selectedSalonIds.includes(salon.id)
                                                ? "bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30 shadow-sm"
                                                : "bg-slate-50 border-slate-100 hover:border-slate-200"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedSalonIds.includes(salon.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedSalonIds((prev) => [...prev, salon.id]);
                                                    } else {
                                                        setSelectedSalonIds((prev) => prev.filter((id) => id !== salon.id));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                            />
                                            <div className="ml-3">
                                                <p className="text-sm font-bold text-slate-700">{salon.name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    {salon.type === "room" ? "Hizmet Odası" : "Çalışma Koltuğu"}
                                                </p>
                                            </div>
                                            <div
                                                className="ml-auto w-3 h-3 rounded-full"
                                                style={{ backgroundColor: salon.color_code }}
                                            />
                                        </label>
                                    ))}
                                    {salons.length === 0 && (
                                        <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-xs text-slate-400 font-medium">Henüz oda tanımlanmamış.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Personel Ataması */}
                            <div className="pt-4">
                                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Bu Hizmeti Yapabilecek Personeller</h4>
                                <div className="grid grid-cols-1 gap-2">
                                    {staffList.map((staff) => (
                                        <label
                                            key={staff.id}
                                            className={`flex items-center p-3 rounded-xl border cursor-pointer transition-all ${selectedStaffIds.includes(staff.id)
                                                ? "bg-indigo-50 border-indigo-200 shadow-sm"
                                                : "bg-slate-50 border-slate-100 hover:border-slate-200"
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedStaffIds.includes(staff.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedStaffIds((prev) => [...prev, staff.id]);
                                                    } else {
                                                        setSelectedStaffIds((prev) => prev.filter((id) => id !== staff.id));
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div className="ml-3 flex-1">
                                                <p className="text-sm font-bold text-slate-700">{staff.first_name} {staff.last_name}</p>
                                                <p className="text-[10px] text-slate-400 font-medium capitalize">
                                                    {staff.role === 'owner' ? 'İşletme Sahibi' : staff.role === 'manager' ? 'Yönetici' : 'Personel'}
                                                    {staff.services_count !== undefined && ` • ${staff.services_count} Hizmet`}
                                                </p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                                                {staff.first_name?.[0]}{staff.last_name?.[0]}
                                            </div>
                                        </label>
                                    ))}
                                    {staffList.length === 0 && (
                                        <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-xs text-slate-400 font-medium">Henüz personel tanımlanmamış.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold border border-red-100 flex items-start gap-2">
                                <span className="material-symbols-outlined text-[16px]">error</span>
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3 sticky bottom-0 z-10">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 py-3.5 px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 py-3.5 px-4 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm hover:bg-[var(--color-primary)]/90 transition-colors shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                        {initialData ? "Kaydet" : "Hizmeti Oluştur"}
                    </button>
                </div>
            </div>
        </>
    );
}
