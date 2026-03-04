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
    const [isActive, setIsActive] = useState(true);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

    const openModalForNew = () => {
        setEditingSalon(null);
        setName("");
        setDescription("");
        setColorCode("#805ad5");
        setIsActive(true);
        setSelectedServiceIds([]);
        setIsModalOpen(true);
    };

    const openModalForEdit = (salon: any) => {
        setEditingSalon(salon);
        setName(salon.name);
        setDescription(salon.description || "");
        setColorCode(salon.color_code || "#805ad5");
        setIsActive(salon.is_active);
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
            is_active: isActive,
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
            alert("Hata: " + result.error);
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
        const cat = service.category || "Diğer";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(service);
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
                    <div key={salon.id} className="bg-white border text-center border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: salon.color_code }}></div>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-slate-900">{salon.name}</h3>
                            <div className="flex gap-2">
                                <button onClick={() => openModalForEdit(salon)} className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">edit</span>
                                </button>
                                <button onClick={() => handleDelete(salon.id, salon.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-1 text-xs font-bold rounded-lg ${salon.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {salon.is_active ? '✅ Aktif' : '❌ Pasif'}
                            </span>
                        </div>
                        <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Hizmetler ({salon.salon_services?.length || 0})</p>
                            <div className="flex flex-wrap gap-1">
                                {salon.salon_services?.slice(0, 3).map((ss: any) => {
                                    const srv = services.find(s => s.id === ss.service_id);
                                    return srv ? <span key={ss.service_id} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded-md">{srv.name}</span> : null;
                                })}
                                {(salon.salon_services?.length || 0) > 3 && (
                                    <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-md">+{salon.salon_services.length - 3}</span>
                                )}
                                {(!salon.salon_services || salon.salon_services.length === 0) && (
                                    <span className="text-[10px] text-slate-400 italic">Hizmet tanımlanmamış</span>
                                )}
                            </div>
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
                    <div className="bg-white w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right duration-300">
                        <div className="flex flex-col h-full">
                            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                                <h3 className="text-xl font-bold">{editingSalon ? 'Salonu Düzenle' : 'Yeni Salon Ekle'}</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <form id="salonForm" onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Salon / Oda Adı *</label>
                                        <input
                                            required
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                                            placeholder="Örn: VIP Cilt Bakım Odası"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">Açıklama</label>
                                        <textarea
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all"
                                            placeholder="Bu oda hakkında notlar..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Renk Kodu</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={colorCode}
                                                    onChange={e => setColorCode(e.target.value)}
                                                    className="size-10 rounded-lg cursor-pointer border border-slate-200"
                                                />
                                                <span className="text-sm text-slate-500 uppercase font-mono">{colorCode}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1">Durum</label>
                                            <label className="flex items-center gap-2 cursor-pointer mt-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isActive}
                                                    onChange={e => setIsActive(e.target.checked)}
                                                    className="w-5 h-5 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                                />
                                                <span className="text-sm font-bold">Kullanıma Açık</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-bold text-slate-700">Desteklenen Hizmetler</label>
                                            <span className="text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-1 rounded-md">
                                                {selectedServiceIds.length} / {services.length} Seçildi
                                            </span>
                                        </div>

                                        {services.length > 0 && (
                                            <div className="flex gap-2 mb-3">
                                                <button onClick={handleSelectAll} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200">
                                                    Tümünü Seç
                                                </button>
                                                <button onClick={handleDeselectAll} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors border border-slate-200">
                                                    Temizle
                                                </button>
                                            </div>
                                        )}

                                        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-4">
                                            {Object.entries(servicesByCategory).map(([category, catServices]: [string, any]) => (
                                                <div key={category} className="space-y-2">
                                                    <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{category}</span>
                                                        <button
                                                            onClick={(e) => handleToggleCategory(category, e)}
                                                            className="text-[10px] bg-white border border-slate-200 text-slate-500 hover:text-[var(--color-primary)] px-2 py-0.5 rounded transition-colors"
                                                        >
                                                            Kategoriyi Seç/Bırak
                                                        </button>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {catServices.map((service: any) => (
                                                            <label key={service.id} className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-lg hover:border-slate-300 cursor-pointer transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedServiceIds.includes(service.id)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedServiceIds(prev => [...prev, service.id]);
                                                                        } else {
                                                                            setSelectedServiceIds(prev => prev.filter(id => id !== service.id));
                                                                        }
                                                                    }}
                                                                    className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-bold text-slate-700">{service.name}</span>
                                                                    <span className="text-[10px] text-slate-400">{service.duration_minutes} dk • {service.price} ₺</span>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}

                                            {services.length === 0 && (
                                                <p className="text-sm text-slate-500 text-center py-4">Önce hizmet eklemelisiniz.</p>
                                            )}
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <div className="p-6 border-t border-slate-100 bg-slate-50">
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 rounded-xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        form="salonForm"
                                        disabled={isSubmitting}
                                        className="flex-1 px-4 py-3 rounded-xl font-bold bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
                                    >
                                        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Blocking Appointments Modal */}
            {blockingAppointments.length > 0 && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4 mb-6">
                            <span className="material-symbols-outlined text-4xl text-rose-500 bg-rose-50 p-3 rounded-2xl">event_busy</span>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Salon Silinemiyor</h3>
                                <p className="text-sm text-slate-500 mt-1">Bu salona ait planlanmış, devam eden veya onaylanmış randevular bulunduğu için silme işlemi engellendi. En az {blockingAppointments.length} randevu mevcut.</p>
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
