"use client";

import { useState } from "react";
import { createSalon, updateSalon, deleteSalon } from "@/app/actions/salons";

export default function SalonlarClient({ initialSalons, services }: { initialSalons: any[], services: any[] }) {
    const [salons, setSalons] = useState(initialSalons);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSalon, setEditingSalon] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Silme işlemi bloke bilgileri
    const [blockingAppointments, setBlockingAppointments] = useState<any[]>([]);


    // Form states
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [colorCode, setColorCode] = useState("#805ad5");
    const [type, setType] = useState("room"); // new state for type
    const [isActive, setIsActive] = useState(true);
    const [inactiveUntil, setInactiveUntil] = useState("");
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

    const openModalForNew = () => {
        setEditingSalon(null);
        setName("");
        setDescription("");
        setColorCode("#805ad5");
        setType("room");
        setIsActive(true);
        setInactiveUntil("");
        setSelectedServiceIds([]);
        setIsModalOpen(true);
    };

    const openModalForEdit = (salon: any) => {
        setEditingSalon(salon);
        setName(salon.name);
        setDescription(salon.description || "");
        setColorCode(salon.color_code || "#805ad5");
        setType(salon.type || "room");
        setIsActive(salon.is_active);
        setInactiveUntil(salon.inactive_until || "");
        setSelectedServiceIds(salon.salon_services?.map((s: any) => s.service_id) || []);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            name,
            description,
            color_code: colorCode,
            type,
            is_active: isActive,
            inactive_until: !isActive && inactiveUntil ? inactiveUntil : null,
            service_ids: selectedServiceIds
        };

        let result: any;
        if (editingSalon) {
            result = await updateSalon(editingSalon.id, payload);
            if (result.success) {
                setSalons(prev => prev.map(s => s.id === editingSalon.id ? {
                    ...s,
                    ...payload,
                    salon_services: payload.service_ids.map(id => ({ service_id: id }))
                } : s));
            }
        } else {
            result = await createSalon(payload);
            if (result.success && result.data) {
                setSalons(prev => [result.data, ...prev]);
            }
        }

        setIsSubmitting(false);

        if (result.success) {
            setIsModalOpen(false);
        } else {
            if (result.blockingAppointments) {
                setBlockingAppointments(result.blockingAppointments);
                // Optionally close the edit modal if it's blocking?
                setIsModalOpen(false);
            } else {
                alert("Hata: " + result.error);
            }
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${name} isimli salonu/odayı silmek istediğinize emin misiniz?`)) return;

        const result = await deleteSalon(id);
        if (result.success) {
            setSalons(prev => prev.filter(s => s.id !== id));
        } else {
            if (result.blockingAppointments) {
                setBlockingAppointments(result.blockingAppointments);
            } else {
                alert("Silinemedi: " + result.error);
            }
        }
    };

    const unassignedServices = services.filter(service =>
        !salons.some(salon =>
            salon.is_active && salon.salon_services?.some((ss: any) => ss.service_id === service.id)
        )
    );

    const servicesByCategory = services.reduce((acc: any, service: any) => {
        const catName = service.service_categories?.name || service.category || "Genel";
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(service);
        return acc;
    }, {});

    const handleSelectAll = (e: React.MouseEvent) => {
        e.preventDefault();
        setSelectedServiceIds(services.map(s => s.id));
    };

    const handleDeselectAll = (e: React.MouseEvent) => {
        e.preventDefault();
        setSelectedServiceIds([]);
    };

    const handleToggleCategory = (categoryPrefix: string, e: React.MouseEvent) => {
        e.preventDefault();
        const catServices = servicesByCategory[categoryPrefix] || [];
        const catServiceIds = catServices.map((s: any) => s.id);

        const allSelected = catServiceIds.every((id: string) => selectedServiceIds.includes(id));

        if (allSelected) {
            setSelectedServiceIds(prev => prev.filter(id => !catServiceIds.includes(id)));
        } else {
            setSelectedServiceIds(prev => {
                const newIds = new Set(prev);
                catServiceIds.forEach((id: string) => newIds.add(id));
                return Array.from(newIds);
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Salon ve Odalar</h1>
                    <p className="text-slate-500">Mekandaki salonları ve kapasiteleri yönetin.</p>
                </div>
                <button
                    onClick={openModalForNew}
                    className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-4 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity"
                >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Yeni Ekle
                </button>
            </div>

            {unassignedServices.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 items-start animate-in fade-in slide-in-from-top-2">
                    <span className="material-symbols-outlined text-amber-500 text-2xl">warning</span>
                    <div>
                        <h4 className="text-amber-800 font-bold mb-1">Eksik Oda Ataması Tespit Edildi</h4>
                        <p className="text-amber-700 text-sm mb-2">
                            <strong>{unassignedServices.length}</strong> hizmet henüz hiçbir aktif odaya atanmamış. Bu durum, müşterilerin bu hizmetler için randevu almasını engelleyecektir.
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {unassignedServices.slice(0, 5).map(s => (
                                <span key={s.id} className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md border border-amber-200">{s.name}</span>
                            ))}
                            {unassignedServices.length > 5 && (
                                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md border border-amber-200">+{unassignedServices.length - 5} daha</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {salons.map(salon => (
                    <div key={salon.id} className="bg-white border text-left border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all relative overflow-hidden group">

                        {/* Status Badge */}
                        <div className="absolute top-6 right-6 flex items-center gap-2">
                            <span className={`inline-flex flex-row items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full border ${salon.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                <span className={`size-1.5 rounded-full ${salon.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                {salon.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>

                        {/* Top Info */}
                        <div className="flex items-start gap-4 mb-6 pr-20">
                            <div
                                className="size-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform group-hover:scale-105"
                                style={{ backgroundColor: salon.color_code || "#8b5cf6" }}
                            >
                                <span className="material-symbols-outlined text-2xl">{salon.type === 'chair' ? 'event_seat' : 'meeting_room'}</span>
                            </div>
                            <div className="pt-1">
                                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">{salon.name}</h3>
                                <div className="text-xs font-semibold text-slate-400">
                                    {salon.type === 'chair' ? 'Çalışma Koltuğu' : 'Hizmet Odası'}
                                </div>
                            </div>
                        </div>

                        {/* Services List Snippet */}
                        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px]">room_service</span>
                                    Tanımlı Hizmetler ({salon.salon_services?.length || 0})
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {salon.salon_services?.slice(0, 3).map((ss: any) => {
                                    const srv = services.find(s => s.id === ss.service_id);
                                    return srv ? <span key={ss.service_id} className="text-[11px] font-bold bg-white text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">{srv.name}</span> : null;
                                })}
                                {(salon.salon_services?.length || 0) > 3 && (
                                    <span className="text-[11px] font-bold bg-white text-slate-400 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">+{salon.salon_services.length - 3}</span>
                                )}
                                {(!salon.salon_services || salon.salon_services.length === 0) && (
                                    <span className="text-sm text-slate-400 font-medium w-full text-center py-2">Hizmet tanımlanmamış</span>
                                )}
                            </div>
                        </div>

                        {/* Actions aligned to bottom */}
                        <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                            <button onClick={() => openModalForEdit(salon)} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-slate-500 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-xl transition-all border border-transparent hover:border-[var(--color-primary)]/10">
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                Düzenle
                            </button>
                            <button onClick={() => handleDelete(salon.id, salon.name)} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                Sil
                            </button>
                        </div>
                    </div>
                ))}

                {salons.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">meeting_room</span>
                        <p>Henüz tanımlı bir salon veya oda yok.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
                    <div className="bg-white w-full max-w-lg h-full shadow-[0_0_40px_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-500 sm:rounded-l-3xl overflow-hidden border-l border-slate-100">
                        <div className="flex flex-col h-full bg-slate-50/50">
                            {/* Header */}
                            <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-slate-100/50 relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--color-primary)] to-purple-400 opacity-80" />
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingSalon ? 'Düzenle' : 'Yeni Ekle'}</h3>
                                    <p className="text-sm font-medium text-slate-500 mt-1">{editingSalon ? editingSalon.name : 'Yeni bir oda veya çalışma koltuğu oluşturun'}</p>
                                </div>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="size-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full transition-all">
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>

                            {/* Form Area */}
                            <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                                <form id="salonForm" onSubmit={handleSubmit} className="px-8 py-6 space-y-8">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Salon / Oda Adı *</label>
                                        <input
                                            required
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all placeholder:text-slate-400"
                                            placeholder="Örn: VIP Cilt Bakım Odası"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Açıklama</label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all placeholder:text-slate-400 custom-scrollbar resize-none"
                                            placeholder="Bu oda hakkında notlar..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Tür</label>
                                            <div className="relative">
                                                <select
                                                    value={type}
                                                    onChange={e => setType(e.target.value)}
                                                    className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all appearance-none bg-white cursor-pointer font-medium"
                                                >
                                                    <option value="room">Oda</option>
                                                    <option value="chair">Koltuk / Alan</option>
                                                </select>
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                                    <span className="material-symbols-outlined text-xl">{type === 'room' ? 'meeting_room' : 'event_seat'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">Renk Kodu</label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    value={colorCode}
                                                    onChange={e => setColorCode(e.target.value)}
                                                    className="size-[46px] rounded-xl cursor-pointer border-0 p-0 overflow-hidden shrink-0 shadow-sm"
                                                />
                                                <div className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium text-slate-600 font-mono text-center flex items-center justify-center">
                                                    {colorCode.toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-5 bg-white border border-slate-100/80 rounded-2xl shadow-sm space-y-4">
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <div className="flex items-center gap-4">
                                                <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${isActive ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                                                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                        {isActive ? 'check_circle' : 'do_disturb_on'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">Kullanıma Açık</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">Randevu alımına uygunluk durumu</p>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={isActive}
                                                    onChange={e => setIsActive(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </div>
                                        </label>

                                        {!isActive && (
                                            <div className="pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                                                <label className="block text-sm font-bold text-slate-700 mb-2 whitespace-nowrap">Ne zamana kadar kapalı kalacak?</label>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="date"
                                                        value={inactiveUntil}
                                                        onChange={e => setInactiveUntil(e.target.value)}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all font-medium text-slate-700 cursor-text min-h-[46px]"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setInactiveUntil("")}
                                                        className={`shrink-0 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold transition-all min-h-[46px] shadow-sm ${!inactiveUntil ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                                                    >
                                                        Süresiz
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px]">info</span>
                                                    {inactiveUntil
                                                        ? `Bu tarihe kadar randevu kabul edilmeyecek. Bu arada randevunuz varsa sistem uyaracaktır.`
                                                        : `Süresiz olarak randevulara kapanır.`}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="pt-2">
                                        <div className="flex items-end justify-between mb-4">
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                                    Hizmet Eşleştirmesi
                                                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-black">
                                                        {selectedServiceIds.length} / {services.length}
                                                    </span>
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1 font-medium">Bu odada/koltukta yapılabilecek işlemleri seçin</p>
                                            </div>

                                            {services.length > 0 && (
                                                <div className="flex gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl">
                                                    <button type="button" onClick={handleSelectAll} className="px-3 py-1.5 bg-transparent hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-bold rounded-lg transition-all shadow-none hover:shadow-sm">
                                                        Tüm Seç
                                                    </button>
                                                    <button type="button" onClick={handleDeselectAll} className="px-3 py-1.5 bg-transparent hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-bold rounded-lg transition-all shadow-none hover:shadow-sm">
                                                        Temizle
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            {Object.entries(servicesByCategory).map(([category, catServices]: [string, any]) => {
                                                const catServiceIds = catServices.map((s: any) => s.id);
                                                const selectedInCat = catServiceIds.filter((id: string) => selectedServiceIds.includes(id)).length;
                                                const isAllSelected = selectedInCat === catServiceIds.length && catServiceIds.length > 0;

                                                return (
                                                    <div key={category} className="bg-white rounded-3xl border border-slate-100/80 shadow-sm p-5 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <span className="material-symbols-outlined text-[var(--color-primary)] bg-[var(--color-primary)]/10 p-2 rounded-xl text-lg">category</span>
                                                                <h5 className="font-bold text-slate-800 tracking-tight">{category}</h5>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleToggleCategory(category, e)}
                                                                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${isAllSelected ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/20' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'}`}
                                                            >
                                                                {isAllSelected ? 'Seçimi Kaldır' : 'Kategori Seç'}
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {catServices.map((service: any) => {
                                                                const isSelected = selectedServiceIds.includes(service.id);
                                                                return (
                                                                    <label
                                                                        key={service.id}
                                                                        className={`flex items-start p-3.5 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30 ring-1 ring-[var(--color-primary)]/10' : 'bg-slate-50 border-slate-200/60 hover:border-slate-300 hover:bg-slate-100/50'}`}
                                                                    >
                                                                        <div className="pt-0.5">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) setSelectedServiceIds(prev => [...prev, service.id]);
                                                                                    else setSelectedServiceIds(prev => prev.filter(id => id !== service.id));
                                                                                }}
                                                                                className="w-5 h-5 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] focus:ring-offset-0 cursor-pointer shadow-sm transition-all"
                                                                            />
                                                                        </div>
                                                                        <div className="ml-3 flex-1 min-w-0">
                                                                            <p className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-[var(--color-primary)]' : 'text-slate-700'}`}>{service.name}</p>
                                                                            <div className="flex flex-wrap items-center gap-2 mt-1.5 opacity-80">
                                                                                <span className="flex items-center text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-sm">
                                                                                    <span className="material-symbols-outlined text-[13px] mr-1">schedule</span>
                                                                                    {service.duration_minutes} dk
                                                                                </span>
                                                                                <span className="flex items-center text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                                                                                    <span className="material-symbols-outlined text-[13px] mr-1">payments</span>
                                                                                    {service.price} ₺
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {services.length === 0 && (
                                                <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">room_service</span>
                                                    <p className="text-sm font-bold text-slate-500">Henüz hiç hizmet eklenmemiş.</p>
                                                    <p className="text-xs text-slate-400 mt-1">Önce Hizmetler sayfasından işlem eklemelisiniz.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50">
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-4 rounded-2xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        form="salonForm"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-4 rounded-2xl font-bold bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 transition-all shadow-lg shadow-[var(--color-primary)]/25 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                                Kaydediliyor...
                                            </>
                                        ) : 'Kaydet'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Blocking Appointments Modal */}
            {blockingAppointments.length > 0 && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="material-symbols-outlined text-4xl text-rose-500 bg-rose-50 p-3 rounded-2xl">event_busy</span>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">İşlem Engellendi</h3>
                                <p className="text-sm text-slate-500 mt-1">Bu odayı/koltuğu silemez veya pasife alamazsınız çünkü ileri tarihli planlanmış randevular bulunuyor. Tespit edilen: {blockingAppointments.length} randevu.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 max-h-64 overflow-y-auto space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Çakışan Randevular</p>
                            {blockingAppointments.map(appt => (
                                <div key={appt.id} className="bg-white border text-left border-slate-200 p-3 rounded-xl flex items-center gap-3">
                                    <div className="bg-rose-50 text-rose-600 font-bold px-2 py-1 rounded text-sm shrink-0">
                                        {appt.appointment_time.substring(0, 5)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-900 truncate">{appt.customer?.first_name} {appt.customer?.last_name}</p>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                                            <span>{new Date(appt.appointment_date).toLocaleDateString('tr-TR')}</span>
                                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold uppercase">{appt.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setBlockingAppointments([])}
                                className="flex-1 px-4 py-3 rounded-xl font-bold bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
                            >
                                Anladım
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
