"use client";

import { useState } from "react";
import { createStaff } from "@/app/actions/staff";

interface StepStaffProps {
    services: any[];
    onNext: (nextStep: number) => void;
    onBack: () => void;
    isPending: boolean;
}

export default function StepStaff({ services, onNext, onBack, isPending }: StepStaffProps) {
    const [staffList, setStaffList] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form State
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState<'owner'|'manager'|'staff'>("staff");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const toggleService = (id: string) => {
        setSelectedServices(prev => 
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleQuickAddMe = async () => {
        setIsSaving(true);
        const allServiceIds = services.map(s => s.id);
        const res = await createStaff({
            first_name: "İşletme",
            last_name: "Sahibi",
            role: "owner",
            is_active: true,
            service_ids: allServiceIds
        });
        setIsSaving(false);
        if (res.success) {
            onNext(7); // Go to next step
        } else {
            alert("Hata: " + res.error);
        }
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const res = await createStaff({
            first_name: firstName,
            last_name: lastName,
            phone,
            email,
            role,
            is_active: isActive,
            service_ids: selectedServices
        });
        setIsSaving(false);

        if (res.success) {
            setStaffList(prev => [...prev, { ...res.data, services_count: selectedServices.length }]);
            setIsModalOpen(false);
            // Reset form
            setFirstName(""); setLastName(""); setPhone(""); setEmail("");
            setRole("staff"); setIsActive(true); setSelectedServices([]);
        } else {
            alert("Hata: " + res.error);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-100/50 text-[var(--color-primary)] mb-4 ring-1 ring-purple-100">
                    <span className="material-symbols-outlined text-2xl">groups</span>
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">Ekip Arkadaşlarınız</h2>
                <p className="mt-3 text-slate-500 text-lg font-medium">Personel ekleyerek randevularınızı daha düzenli yönetin.</p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/40 border border-slate-100/60 relative overflow-hidden backdrop-blur-xl">
                {/* Şimdilik sadece ben varım butonu */}
                {staffList.length === 0 && (
                    <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-2xl border border-purple-100/50 text-center">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.3)]">
                            <span className="material-symbols-outlined text-[var(--color-primary)]">person</span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 mb-1">Tek Kişilik Dev Kadro musunuz?</h4>
                        <p className="text-sm text-slate-500 mb-4 font-medium">Sizi otomatik olarak yönetici personeli olarak ekleyip tüm hizmetlerle eşleştirebiliriz.</p>
                        <button 
                            type="button" 
                            onClick={handleQuickAddMe}
                            disabled={isSaving || isPending}
                            className="w-full px-4 py-3 bg-[var(--color-primary)] text-white text-sm font-bold rounded-xl hover:shadow-[0_8px_20px_-6px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">bolt</span>
                            Şimdilik Sadece Ben Varım, Devam Et
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-extrabold text-slate-800">Personelleriniz</h3>
                    <button 
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="px-4 py-2 bg-purple-50 text-[var(--color-primary)] font-bold rounded-xl text-sm flex items-center gap-2 hover:bg-purple-100 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Personel Ekle
                    </button>
                </div>

                {staffList.length > 0 ? (
                    <div className="space-y-3 mb-8">
                        {staffList.map((staff, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/60 bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold uppercase">
                                        {staff.first_name[0]}{staff.last_name[0]}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{staff.first_name} {staff.last_name}</p>
                                        <p className="text-xs text-slate-500 font-medium capitalize">{staff.role}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${staff.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                        {staff.is_active ? 'Aktif' : 'Pasif'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">{staff.services_count} Hizmet</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 mb-8 border-2 border-dashed border-slate-200 rounded-2xl">
                        <p className="text-sm font-medium text-slate-400">Henüz personel eklemediniz.</p>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={isPending || isSaving}
                        className="px-6 py-3 text-slate-500 font-bold hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        Geri
                    </button>
                    {(staffList.length > 0 || staffList.length === 0) && ( // Allow skip conceptually
                        <button
                            type="button"
                            onClick={() => {
                                if (staffList.length === 0) {
                                    handleQuickAddMe();
                                } else {
                                    onNext(7);
                                }
                            }}
                            disabled={isPending || isSaving}
                            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-[var(--color-primary)] hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            Devam Et
                            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-extrabold text-slate-800">Personel Ekle</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleAddStaff} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Ad</label>
                                    <input type="text" value={firstName} onChange={e=>setFirstName(e.target.value)} required className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Soyad</label>
                                    <input type="text" value={lastName} onChange={e=>setLastName(e.target.value)} required className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Rol</label>
                                    <select value={role} onChange={e=>setRole(e.target.value as any)} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-white">
                                        <option value="staff">Personel</option>
                                        <option value="manager">Yönetici</option>
                                        <option value="owner">İşletme Sahibi</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Durum</label>
                                    <select value={isActive ? 'true' : 'false'} onChange={e=>setIsActive(e.target.value==='true')} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none bg-white">
                                        <option value="true">Aktif</option>
                                        <option value="false">Pasif</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Telefon</label>
                                    <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">E-Posta</label>
                                    <input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
                                </div>
                            </div>

                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-extrabold text-slate-800">Yaptığı Hizmetler</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setSelectedServices(services.map(s=>s.id))} className="text-[10px] font-bold text-[var(--color-primary)] bg-purple-50 px-2 py-1 rounded-md">Hepsini Seç</button>
                                        <button type="button" onClick={() => setSelectedServices([])} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Temizle</button>
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto w-full grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                                    {services.map(s => (
                                        <label key={s.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${selectedServices.includes(s.id) ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={() => toggleService(s.id)} className="mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{s.name}</p>
                                                <p className="text-[10px] text-slate-500">{s.category_name}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm">İptal</button>
                                <button type="submit" disabled={isSaving} className="flex-1 px-4 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-purple-500/20 transition-all text-sm flex justify-center items-center gap-2">
                                    {isSaving ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Kaydet'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
