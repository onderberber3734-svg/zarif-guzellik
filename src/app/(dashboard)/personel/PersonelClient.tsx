"use client";

import { useState, useEffect } from "react";
import {
    createStaff,
    updateStaff,
    toggleStaffStatus,
    upsertStaffServices,
    addTimeOff,
    deleteTimeOff,
    reassignFutureAppointments,
    getStaffDetail,
    deleteStaff,
    upsertStaffWorkingHours,
    getStaffFutureAppointmentsList,
    reassignSingleAppointment
} from "@/app/actions/staff";
import { useRouter } from "next/navigation";

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const DEFAULT_WORKING_HOURS = Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    is_closed: i === 0, // Pazar kapalı
    start_time: '09:00',
    end_time: '18:00',
    break_start: '12:00',
    break_end: '13:00',
}));

export default function PersonelClient({ initialStaff, services }: { initialStaff: any[], services: any[] }) {
    const router = useRouter();
    const [staffList, setStaffList] = useState(initialStaff);

    // Prop değiştiğinde state'i senkronize et (router.refresh() sonrası)
    useEffect(() => {
        setStaffList(initialStaff);
    }, [initialStaff]);

    // UI States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any>(null); // For Drawer
    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);

    // Filtered lists for KPI
    const activeStaffCount = staffList.filter(s => s.is_active).length;
    const offTodayCount = staffList.filter(s => s.is_off_today).length;

    // Personele atanmamış hizmet uyarısı
    const unassignedToStaffServices = services.filter(service =>
        !staffList.some(staff =>
            staff.is_active && staff.staff_services?.some((ss: any) => ss.service_id === service.id)
        )
    );

    // ADD STAFF FORM
    const [addForm, setAddForm] = useState({ first_name: "", last_name: "", phone: "", email: "", role: "staff", is_active: true, selectedServices: [] as string[] });
    const [isSaving, setIsSaving] = useState(false);

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const res = await createStaff({
            first_name: addForm.first_name,
            last_name: addForm.last_name,
            phone: addForm.phone || undefined,
            email: addForm.email || undefined,
            role: addForm.role as any,
            is_active: addForm.is_active,
            service_ids: addForm.selectedServices
        });
        if (res.success) {
            // Optimistik güncelleme: listeye hemen ekle
            if (res.data) {
                setStaffList(prev => [...prev, { ...res.data, services_count: addForm.selectedServices.length, is_off_today: false }]);
            }
            router.refresh();
            setIsAddModalOpen(false);
            setAddForm({ first_name: "", last_name: "", phone: "", email: "", role: "staff", is_active: true, selectedServices: [] });
        } else {
            alert("Hata: " + res.error);
        }
        setIsSaving(false);
    };

    const openStaffDetail = async (staffId: string) => {
        const res = await getStaffDetail(staffId);
        if (res.success) {
            setSelectedStaff(res.data);
        } else {
            alert("Detaylar alınamadı.");
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-500">
            {/* Header & KPI */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Personeller</h2>
                    <p className="text-slate-500 font-medium">İşletmenizin ekip üyelerini, hizmetlerini ve izinlerini yönetin.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2">
                    <span className="material-symbols-outlined">add</span>
                    Yeni Personel
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <span className="material-symbols-outlined">badge</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400">Toplam Personel</p>
                        <p className="text-2xl font-extrabold text-slate-800">{staffList.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400">Aktif Personel</p>
                        <p className="text-2xl font-extrabold text-slate-800">{activeStaffCount}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <span className="material-symbols-outlined">bed</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-400">Bugün İzinli</p>
                        <p className="text-2xl font-extrabold text-slate-800">{offTodayCount}</p>
                    </div>
                </div>
            </div>

            {/* Personele Atanmamış Hizmet Uyarısı */}
            {unassignedToStaffServices.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-4 items-start mb-8 animate-in fade-in slide-in-from-top-2">
                    <span className="material-symbols-outlined text-amber-500 text-2xl mt-0.5">warning</span>
                    <div>
                        <h4 className="text-amber-800 font-bold mb-1">Eksik Personel Ataması Tespit Edildi</h4>
                        <p className="text-amber-700 text-sm mb-2">
                            <strong>{unassignedToStaffServices.length}</strong> hizmet henüz hiçbir aktif personele atanmamış. Bu hizmetler için randevu oluşturulduğunda uygun personel bulunamayacaktır.
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {unassignedToStaffServices.slice(0, 5).map(s => (
                                <span key={s.id} className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md border border-amber-200 font-bold">{s.name}</span>
                            ))}
                            {unassignedToStaffServices.length > 5 && (
                                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md border border-amber-200 font-bold">+{unassignedToStaffServices.length - 5} daha</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* List Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Çalışan Listesi</h3>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Toplam {staffList.length} aktif personel bulunmaktadır.</p>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {staffList.map(staff => {
                    // Collect services
                    const staffServices = staff.staff_services?.map((ss: any) => {
                        const srv = services.find((srv: any) => srv.id === ss.service_id);
                        return srv ? srv.name : null;
                    }).filter(Boolean) || [];

                    // Status simulation or calculation
                    const isAvailable = staff.is_active && !staff.is_off_today && !staff.is_busy_now;
                    const isBusy = staff.is_active && !staff.is_off_today && staff.is_busy_now;

                    return (
                        <div key={staff.id} className={`group bg-white border border-slate-200 rounded-3xl p-5 hover:shadow-xl hover:shadow-[var(--color-primary)]/5 transition-all flex flex-col md:flex-row items-center gap-6 ${(!staff.is_active || staff.is_off_today) ? 'opacity-80' : ''}`}>
                            <div className="relative shrink-0">
                                <div className={`size-20 rounded-2xl flex items-center justify-center text-2xl font-bold ring-4 ${isAvailable ? 'ring-purple-50 text-[var(--color-primary)] bg-purple-50/50' : isBusy ? 'ring-amber-50 text-amber-600 bg-amber-50/50' : 'ring-slate-50 text-slate-400 bg-slate-100'} ${!staff.is_active ? 'grayscale' : ''}`}>
                                    {staff.first_name[0]}{staff.last_name[0]}
                                </div>

                                <div className="absolute -bottom-1 -right-1 size-5 bg-white rounded-full flex items-center justify-center">
                                    {staff.is_off_today ? (
                                        <div className="size-3 bg-rose-500 rounded-full"></div>
                                    ) : staff.is_busy_now ? (
                                        <div className="size-3 bg-amber-500 rounded-full animate-pulse shadow-sm shadow-amber-500/50"></div>
                                    ) : staff.is_active ? (
                                        <div className="size-3 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></div>
                                    ) : (
                                        <div className="size-3 bg-slate-400 rounded-full"></div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 text-center md:text-left w-full min-w-0">
                                <div className="flex flex-col md:flex-row items-center md:items-center gap-2 mb-1.5">
                                    <h4 className="font-extrabold text-lg text-slate-800 tracking-tight">{staff.first_name} {staff.last_name}</h4>
                                    <span className={`px-2 py-0.5 text-[10px] font-black rounded-md uppercase tracking-wider ${staff.role === 'owner' ? 'bg-purple-100 text-[var(--color-primary)]' : staff.role === 'manager' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                        {staff.role === 'owner' ? 'İşletme Sahibi' : staff.role === 'manager' ? 'Yönetici' : 'Uzman'}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4 text-sm text-slate-500 mb-3 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">content_cut</span>
                                        {staff.services_count} Hizmet Alanı
                                    </span>
                                    {staff.is_off_today ? (
                                        <span className="flex items-center gap-1.5 text-rose-500 font-bold"><span className="size-1.5 rounded-full bg-rose-500"></span> İzinli</span>
                                    ) : staff.is_busy_now ? (
                                        <span className="relative group/status flex items-center gap-1.5 text-amber-500 font-bold cursor-help cursor-pointer">
                                            <span className="size-1.5 rounded-full bg-amber-500"></span> İşlemde
                                            {staff.current_appointment && (
                                                <div className="absolute top-full lg:-top-2 lg:bottom-auto lg:top-auto lg:mt-0 lg:-translate-y-full left-1/2 -translate-x-1/2 mt-2 lg:-mt-2 w-52 bg-slate-800 text-white p-3.5 rounded-2xl shadow-xl opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all z-10 text-xs">
                                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-600/50">
                                                        <span className="material-symbols-outlined text-[16px] text-amber-400">schedule</span>
                                                        <span className="font-bold">{staff.current_appointment.time} Randevusu</span>
                                                    </div>
                                                    <p className="font-extrabold flex items-center gap-2 text-slate-100 mb-1">
                                                        <span className="material-symbols-outlined text-[14px]">person</span>
                                                        <span className="truncate">{staff.current_appointment.customer_name || 'İsimsiz Müşteri'}</span>
                                                    </p>
                                                    {staff.current_appointment.customer_phone && (
                                                        <p className="flex items-center gap-2 text-slate-400 font-medium">
                                                            <span className="material-symbols-outlined text-[14px]">call</span>
                                                            <span className="truncate">{staff.current_appointment.customer_phone}</span>
                                                        </p>
                                                    )}
                                                    <div className="absolute -top-1.5 lg:-bottom-1.5 lg:top-auto left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-800 rotate-45"></div>
                                                </div>
                                            )}
                                        </span>
                                    ) : staff.is_active ? (
                                        <span className="flex items-center gap-1.5 text-emerald-500 font-bold"><span className="size-1.5 rounded-full bg-emerald-500"></span> Müsait</span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-slate-400 font-bold"><span className="size-1.5 rounded-full bg-slate-400"></span> Pasif</span>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                    {staffServices.slice(0, 4).map((name: string, idx: number) => (
                                        <span key={idx} className="px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-100 truncate max-w-[140px]">
                                            {name}
                                        </span>
                                    ))}
                                    {staffServices.length > 4 && (
                                        <span className="px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-black border border-slate-100 text-slate-400">
                                            +{staffServices.length - 4}
                                        </span>
                                    )}
                                    {staffServices.length === 0 && (
                                        <span className="text-xs text-orange-500 font-bold bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">Hiçbir hizmet atanmamış</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 mt-4 md:mt-0">
                                <button onClick={() => openStaffDetail(staff.id)} className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--color-primary)]/90 transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-500/20">
                                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                                    Yönet / Düzenle
                                </button>
                                <button onClick={() => { setSelectedStaff(staff); setIsReassignModalOpen(true); }} className="px-5 py-2.5 bg-purple-50 text-[var(--color-primary)] rounded-xl text-sm font-bold hover:bg-purple-100 transition-all flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                                    Randevu Devret
                                </button>
                            </div>
                        </div>
                    );
                })}

                {staffList.length === 0 && (
                    <div className="py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">group_off</span>
                        <h4 className="font-bold text-slate-700">Henüz Personel Eklenmemiş</h4>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm">İşletmenizde çalışan personelleri ekleyerek randevu takvimini oluşturmaya başlayın.</p>
                    </div>
                )}
            </div>

            {/* AI Verimlilik Analizi - at the bottom */}
            <div className="mt-8 p-6 bg-gradient-to-br from-[var(--color-primary)]/5 to-pink-500/5 rounded-3xl border border-[var(--color-primary)]/10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="size-12 bg-white rounded-2xl flex items-center justify-center text-[var(--color-primary)] shadow-sm">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    </div>
                    <div>
                        <p className="text-sm font-extrabold text-slate-900 tracking-tight">Yapay Zeka Verimlilik Analizi</p>
                        <p className="text-xs font-medium text-slate-500 mt-1 max-w-xl leading-relaxed">
                            Mevcut {activeStaffCount} aktif personel ile operasyon yönetiliyor.
                            {offTodayCount > 0 ? ` Bugün ${offTodayCount} personeliniz izinli.` : " Bütün ekibiniz çalışmaya uygun ve mesaide."} Sistem performansınızı artırmak için randevu boşluklarını analiz ediyor.
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <div className="text-center px-4">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Müsait</p>
                        <p className="text-2xl font-black text-emerald-500 leading-none">{activeStaffCount - offTodayCount - staffList.filter(s => s.is_busy_now).length}</p>
                    </div>
                    <div className="w-px bg-slate-100 my-1"></div>
                    <div className="text-center px-4">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">İşlemde</p>
                        <p className="text-2xl font-black text-amber-500 leading-none">{staffList.filter(s => s.is_busy_now).length}</p>
                    </div>
                    <div className="w-px bg-slate-100 my-1"></div>
                    <div className="text-center px-4">
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">İzinli/Pasif</p>
                        <p className="text-2xl font-black text-rose-500 leading-none">{staffList.length - activeStaffCount + offTodayCount}</p>
                    </div>
                </div>
            </div>

            {/* Drawer */}
            {selectedStaff && (
                <StaffDetailDrawer
                    staff={selectedStaff}
                    services={services}
                    onClose={() => { setSelectedStaff(null); router.refresh(); }}
                    onOpenReassign={() => setIsReassignModalOpen(true)}
                />
            )}

            {/* Reassign Modal */}
            {isReassignModalOpen && selectedStaff && (
                <ReassignModal
                    oldStaff={selectedStaff}
                    allStaff={staffList}
                    onClose={() => setIsReassignModalOpen(false)}
                />
            )}

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-extrabold text-slate-800">Personel Ekle</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><span className="material-symbols-outlined text-[18px]">close</span></button>
                        </div>
                        <form onSubmit={handleAddStaff} className="p-6 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Ad</label>
                                    <input type="text" value={addForm.first_name} onChange={e => setAddForm({ ...addForm, first_name: e.target.value })} required className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Soyad</label>
                                    <input type="text" value={addForm.last_name} onChange={e => setAddForm({ ...addForm, last_name: e.target.value })} required className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Telefon</label>
                                    <input type="tel" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: e.target.value })} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none" placeholder="05XX XXX XX XX" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">E-Posta</label>
                                    <input type="email" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none" placeholder="ornek@email.com" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Rol</label>
                                    <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm bg-white focus:ring-2 focus:ring-[var(--color-primary)] outline-none">
                                        <option value="staff">Personel</option>
                                        <option value="manager">Yönetici</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">Durum</label>
                                    <select value={addForm.is_active ? 'true' : 'false'} onChange={e => setAddForm({ ...addForm, is_active: e.target.value === 'true' })} className="w-full border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm bg-white focus:ring-2 focus:ring-[var(--color-primary)] outline-none">
                                        <option value="true">Aktif</option>
                                        <option value="false">Pasif</option>
                                    </select>
                                </div>
                            </div>

                            {/* Hizmet Seçimi */}
                            <div className="border-t border-slate-100 pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-extrabold text-slate-800">Yaptığı Hizmetler</label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setAddForm({ ...addForm, selectedServices: services.map(s => s.id) })} className="text-[10px] font-bold text-[var(--color-primary)] bg-purple-50 px-2 py-1 rounded-md">Hepsini Seç</button>
                                        <button type="button" onClick={() => setAddForm({ ...addForm, selectedServices: [] })} className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">Temizle</button>
                                    </div>
                                </div>
                                <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                                    {services.map((s: any) => (
                                        <label key={s.id} className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${addForm.selectedServices.includes(s.id) ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                            <input
                                                type="checkbox"
                                                checked={addForm.selectedServices.includes(s.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setAddForm({ ...addForm, selectedServices: [...addForm.selectedServices, s.id] });
                                                    else setAddForm({ ...addForm, selectedServices: addForm.selectedServices.filter(id => id !== s.id) });
                                                }}
                                                className="mt-0.5"
                                            />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{s.name}</p>
                                                <p className="text-[10px] text-slate-500">{s.service_categories?.name || 'Genel'}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={isSaving} className="w-full px-4 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl mt-4 disabled:opacity-50">
                                {isSaving ? "Kaydediliyor..." : "Personel Ekle"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// DRAWER COMPONENT
function StaffDetailDrawer({ staff, services, onClose, onOpenReassign }: any) {
    const router = useRouter();
    const [tab, setTab] = useState<'info' | 'services' | 'timeoff' | 'hours'>('services');
    const [localStaff, setLocalStaff] = useState(staff);

    // Services Tab
    const [selectedServices, setSelectedServices] = useState<string[]>(staff.staff_services?.map((s: any) => s.service_id) || []);
    const [isSavingServices, setIsSavingServices] = useState(false);

    const handleSaveServices = async () => {
        setIsSavingServices(true);
        const res = await upsertStaffServices(localStaff.id, selectedServices);
        setIsSavingServices(false);
        if (res.success) alert("Hizmetler güncellendi.");
        else alert("Hata: " + res.error);
    };

    // Time-off Tab
    const [timeOffForm, setTimeOffForm] = useState({ start_date: "", end_date: "", reason: "" });
    const [isSavingTimeOff, setIsSavingTimeOff] = useState(false);

    const handleAddTimeOff = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingTimeOff(true);
        const res = await addTimeOff(localStaff.id, timeOffForm.start_date, timeOffForm.end_date, timeOffForm.reason);
        setIsSavingTimeOff(false);
        if (res.success) {
            alert("İzin eklendi.");
            setTimeOffForm({ start_date: "", end_date: "", reason: "" });
            const ref = await getStaffDetail(localStaff.id);
            if (ref.success) setLocalStaff(ref.data);
            router.refresh();
        } else {
            alert("Hata: " + res.error);
        }
    };

    const handleDeleteTimeOff = async (id: string) => {
        if (!confirm("Bu izni silmek istediğinize emin misiniz?")) return;
        const res = await deleteTimeOff(id);
        if (res.success) {
            setLocalStaff((prev: any) => ({ ...prev, staff_time_off: prev.staff_time_off.filter((t: any) => t.id !== id) }));
            router.refresh();
        } else {
            alert("Hata: " + res.error);
        }
    };

    const handleStatusToggle = async () => {
        const newVal = !localStaff.is_active;
        const res = await toggleStaffStatus(localStaff.id, newVal);
        if (res.success) {
            setLocalStaff((prev: any) => ({ ...prev, is_active: newVal }));
            router.refresh();
        }
    };

    const handleDeleteStaff = async () => {
        if (!confirm(`${localStaff.first_name} ${localStaff.last_name} isimli personeli kalıcı olarak silmek istediğinize emin misiniz?`)) return;
        const res = await deleteStaff(localStaff.id);
        if (res.success) {
            onClose();
            router.refresh();
        } else {
            alert("Hata: " + res.error);
        }
    };

    // Working Hours Tab
    const existingHours = localStaff.staff_working_hours || [];
    const [workingHours, setWorkingHours] = useState(() => {
        return DEFAULT_WORKING_HOURS.map(dh => {
            const existing = existingHours.find((h: any) => h.day_of_week === dh.day_of_week);
            return existing ? {
                day_of_week: existing.day_of_week,
                is_closed: existing.is_closed,
                start_time: existing.start_time?.substring(0, 5) || '09:00',
                end_time: existing.end_time?.substring(0, 5) || '18:00',
                break_start: existing.break_start?.substring(0, 5) || '',
                break_end: existing.break_end?.substring(0, 5) || '',
            } : dh;
        });
    });
    const [isSavingHours, setIsSavingHours] = useState(false);

    const handleSaveHours = async () => {
        setIsSavingHours(true);
        const res = await upsertStaffWorkingHours(localStaff.id, workingHours.map(h => ({
            ...h,
            break_start: h.break_start || undefined,
            break_end: h.break_end || undefined,
        })));
        setIsSavingHours(false);
        if (res.success) {
            alert("Çalışma saatleri kaydedildi.");
            const ref = await getStaffDetail(localStaff.id);
            if (ref.success) setLocalStaff(ref.data);
        } else {
            alert("Hata: " + res.error);
        }
    };

    const updateHour = (dayIndex: number, field: string, value: any) => {
        setWorkingHours(prev => prev.map(h =>
            h.day_of_week === dayIndex ? { ...h, [field]: value } : h
        ));
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-900">{localStaff.first_name} {localStaff.last_name}</h3>
                        <p className="text-sm font-semibold text-slate-500 capitalize">{localStaff.role === 'owner' ? 'İşletme Sahibi' : localStaff.role === 'manager' ? 'Yönetici' : 'Personel'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-800"><span className="material-symbols-outlined">close</span></button>
                </div>

                <div className="flex border-b border-slate-100 px-6 pt-4 gap-4 bg-slate-50/50 overflow-x-auto">
                    <button onClick={() => setTab('info')} className={`pb-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${tab === 'info' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500'}`}>Bilgiler</button>
                    <button onClick={() => setTab('services')} className={`pb-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${tab === 'services' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500'}`}>Hizmetler</button>
                    <button onClick={() => setTab('hours')} className={`pb-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${tab === 'hours' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500'}`}>Mesai</button>
                    <button onClick={() => setTab('timeoff')} className={`pb-3 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${tab === 'timeoff' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-transparent text-slate-500'}`}>İzinler</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {tab === 'info' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800">Sistem Durumu</p>
                                    <p className="text-xs text-slate-500">Personelin randevu kabul durumunu aç/kapat.</p>
                                </div>
                                <button onClick={handleStatusToggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localStaff.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localStaff.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {/* İletişim Bilgileri */}
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                                <h4 className="font-bold text-slate-800 text-sm">İletişim Bilgileri</h4>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="material-symbols-outlined text-slate-400 text-[18px]">call</span>
                                    <span className="text-slate-700 font-medium">{localStaff.phone || 'Belirtilmemiş'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="material-symbols-outlined text-slate-400 text-[18px]">mail</span>
                                    <span className="text-slate-700 font-medium">{localStaff.email || 'Belirtilmemiş'}</span>
                                </div>
                            </div>

                            <button onClick={onOpenReassign} className="w-full p-4 rounded-2xl bg-amber-50 text-amber-700 font-bold border border-amber-200 flex items-center justify-between hover:bg-amber-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined">move_up</span>
                                    <div className="text-left">
                                        <p>Gelecek Randevuları Taşı</p>
                                        <p className="text-xs font-semibold opacity-80">Personel ayrıldığında kullanılır.</p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>

                            <button onClick={handleDeleteStaff} className="w-full p-4 rounded-2xl bg-rose-50 text-rose-600 font-bold border border-rose-200 flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                Personeli Kalıcı Olarak Sil
                            </button>
                        </div>
                    )}

                    {tab === 'services' && (
                        <div className="space-y-4">
                            <h4 className="font-bold text-slate-800 text-sm">Yapabildiği Hizmetler</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {services.map((s: any) => (
                                    <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedServices.includes(s.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedServices([...selectedServices, s.id]);
                                                else setSelectedServices(selectedServices.filter(id => id !== s.id));
                                            }}
                                            className="w-4 h-4 rounded text-[var(--color-primary)]"
                                        />
                                        <span className="text-sm font-bold text-slate-700">{s.name} <span className="font-medium text-[10px] text-slate-400">({s.service_categories?.name || 'Genel'})</span></span>
                                    </label>
                                ))}
                            </div>
                            <button onClick={handleSaveServices} disabled={isSavingServices} className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl disabled:opacity-50">
                                {isSavingServices ? 'Kaydediliyor...' : 'Hizmetleri Kaydet'}
                            </button>
                        </div>
                    )}

                    {tab === 'hours' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-800 text-sm">Haftalık Çalışma Saatleri</h4>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">Randevu uygunluk kontrolünde kullanılır</span>
                            </div>

                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5, 6, 0].map(dayIndex => {
                                    const h = workingHours.find(wh => wh.day_of_week === dayIndex)!;
                                    return (
                                        <div key={dayIndex} className={`p-4 rounded-2xl border transition-all ${h.is_closed ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="font-bold text-sm text-slate-800">{DAY_NAMES[dayIndex]}</span>
                                                <button
                                                    onClick={() => updateHour(dayIndex, 'is_closed', !h.is_closed)}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${!h.is_closed ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                >
                                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${!h.is_closed ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                                                </button>
                                            </div>
                                            {!h.is_closed && (
                                                <div className="space-y-2">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Başlangıç</label>
                                                            <input type="time" value={h.start_time} onChange={e => updateHour(dayIndex, 'start_time', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-white" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Bitiş</label>
                                                            <input type="time" value={h.end_time} onChange={e => updateHour(dayIndex, 'end_time', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-white" />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Mola Başı</label>
                                                            <input type="time" value={h.break_start} onChange={e => updateHour(dayIndex, 'break_start', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm font-medium bg-white" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Mola Sonu</label>
                                                            <input type="time" value={h.break_end} onChange={e => updateHour(dayIndex, 'break_end', e.target.value)} className="w-full border border-slate-200 rounded-lg p-2 text-sm font-medium bg-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {h.is_closed && (
                                                <p className="text-xs text-slate-400 font-medium italic">Kapalı gün — randevu alınmaz</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <button onClick={handleSaveHours} disabled={isSavingHours} className="w-full py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl disabled:opacity-50 mt-2">
                                {isSavingHours ? 'Kaydediliyor...' : 'Çalışma Saatlerini Kaydet'}
                            </button>
                        </div>
                    )}

                    {tab === 'timeoff' && (
                        <div className="space-y-6">
                            <form onSubmit={handleAddTimeOff} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                                <h4 className="font-extrabold text-slate-800 text-sm mb-2">Yeni İzin Ekle</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Başlangıç</label>
                                        <input type="date" value={timeOffForm.start_date} onChange={e => setTimeOffForm({ ...timeOffForm, start_date: e.target.value })} required className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Bitiş</label>
                                        <input type="date" value={timeOffForm.end_date} onChange={e => setTimeOffForm({ ...timeOffForm, end_date: e.target.value })} required className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold bg-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Sebep (Opsiyonel)</label>
                                    <input type="text" value={timeOffForm.reason} onChange={e => setTimeOffForm({ ...timeOffForm, reason: e.target.value })} className="w-full border border-slate-200 rounded-lg p-2 text-sm font-medium bg-white" placeholder="Örn: Yıllık İzin" />
                                </div>
                                <button type="submit" disabled={isSavingTimeOff} className="w-full py-2 bg-slate-900 text-white text-sm font-bold rounded-lg border">
                                    {isSavingTimeOff ? 'Ekleniyor...' : '+ İzin Ekle'}
                                </button>
                            </form>

                            <div className="space-y-3">
                                <h4 className="font-extrabold text-slate-800 text-sm">Geçmiş ve Gelecek İzinler</h4>
                                {localStaff.staff_time_off?.length === 0 && <p className="text-sm text-slate-400 font-medium">İzin kaydı bulunmuyor.</p>}
                                {localStaff.staff_time_off?.map((t: any) => (
                                    <div key={t.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                                        <div>
                                            <p className="text-xs font-extrabold text-slate-800">{new Date(t.start_date).toLocaleDateString('tr-TR')} - {new Date(t.end_date).toLocaleDateString('tr-TR')}</p>
                                            <p className="text-[10px] font-medium text-slate-500">{t.reason || 'Sebep belirtilmemiş'}</p>
                                        </div>
                                        <button onClick={() => handleDeleteTimeOff(t.id)} className="w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg">
                                            <span className="material-symbols-outlined text-[16px]">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// REASSIGN MODAL
function ReassignModal({ oldStaff, allStaff, onClose }: any) {
    const router = useRouter();
    const [tab, setTab] = useState<'bulk' | 'individual'>('bulk');
    const [targetStaffId, setTargetStaffId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [resultData, setResultData] = useState<{ message: string, count: number, errors: string[] } | null>(null);
    const [resultMsg, setResultMsg] = useState("");

    const [appointments, setAppointments] = useState<any[]>([]);
    const [isLoadingAppts, setIsLoadingAppts] = useState(false);
    const [reassigningApptId, setReassigningApptId] = useState<string | null>(null);

    const oldStaffServiceIds = oldStaff.staff_services?.map((ss: any) => ss.service_id) || [];

    // Yalnızca eski personelin atıflı olduğu hizmetleri verebilecek düzeyde yetkin personeller (ve aktif olanlar)
    const bulkAvailableStaff = allStaff.filter((s: any) => {
        if (s.id === oldStaff.id || !s.is_active) return false;
        const sServiceIds = s.staff_services?.map((ss: any) => ss.service_id) || [];
        // Tüm gerekli hizmetleri kapsıyor mu (eski personelin kapsadığı tüm hizmetleri)?
        return oldStaffServiceIds.every((id: string) => sServiceIds.includes(id));
    });

    useEffect(() => {
        const fetchAppts = async () => {
            setIsLoadingAppts(true);
            const res = await getStaffFutureAppointmentsList(oldStaff.id);
            if (res.success) {
                setAppointments(res.data || []);
            }
            setIsLoadingAppts(false);
        };
        fetchAppts();
    }, [oldStaff.id]);

    const handleBulkReassign = async () => {
        if (!targetStaffId) return;
        setIsLoading(true);
        const res = await reassignFutureAppointments(oldStaff.id, targetStaffId);
        setIsLoading(false);
        if (res.success) {
            setResultData({
                message: res.message || "",
                count: res.count || 0,
                errors: res.errors || []
            });
            router.refresh();
        } else {
            setResultMsg(res.error || "Beklenmeyen bir hata oluştu.");
        }
    };

    const handleSingleReassign = async (apptId: string, newStaffId: string) => {
        if (!newStaffId) return;
        setReassigningApptId(apptId);
        const res = await reassignSingleAppointment(apptId, newStaffId);
        setReassigningApptId(null);

        if (res.success) {
            setAppointments(prev => prev.filter(a => a.id !== apptId));
            alert("Randevu başarıyla devredildi!");
            router.refresh();
        } else {
            alert("Hata: " + res.error);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-extrabold text-xl text-slate-900">Randevuları Devret</h3>
                        <p className="text-sm font-medium text-slate-500 mt-1"><strong className="text-slate-700">{oldStaff.first_name} {oldStaff.last_name}</strong> isimli personelin randevularını yönetin.</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-800"><span className="material-symbols-outlined">close</span></button>
                </div>

                {!resultData && (
                    <div className="flex border-b border-slate-100 bg-slate-50/50">
                        <button onClick={() => setTab('bulk')} className={`flex-1 py-4 font-bold text-sm border-b-2 transition-colors ${tab === 'bulk' ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Toplu Devret</button>
                        <button onClick={() => setTab('individual')} className={`flex-1 py-4 font-bold text-sm border-b-2 transition-colors flex items-center justify-center gap-2 ${tab === 'individual' ? 'border-[var(--color-primary)] text-[var(--color-primary)] bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                            Tek Tek Devret
                            {appointments.length > 0 && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px]">{appointments.length}</span>}
                        </button>
                    </div>
                )}

                <div className="p-6 overflow-y-auto flex-1">
                    {!resultData ? (
                        <>
                            {tab === 'bulk' && (
                                <div className="space-y-4 animate-in fade-in">
                                    <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 flex gap-3 text-sm font-medium text-purple-800">
                                        <span className="material-symbols-outlined text-purple-500">info</span>
                                        <p>Seçilen personelin üstünde olan ve iptal edilmemiş <strong>tüm gelecek randevuları</strong> tek bir personele devredilecektir.</p>
                                    </div>

                                    <label className="block text-sm font-bold text-slate-700 mb-2">Hedef Personel Seçin (Toplu İşlem)</label>
                                    <select value={targetStaffId} onChange={e => setTargetStaffId(e.target.value)} className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold text-slate-700 mb-2 bg-white outline-none focus:border-[var(--color-primary)]">
                                        <option value="">-- Uygun Personel Seçin --</option>
                                        {bulkAvailableStaff.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.services_count} Hizmet)</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-slate-500 italic mb-4">* Yalnızca eski personelin sunduğu tüm hizmetleri verebilen aktif personeller listelenmektedir.</p>

                                    {bulkAvailableStaff.length === 0 && (
                                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold rounded-xl mb-4 text-center">
                                            Bu kişinin tüm hizmetlerini karşılayabilecek uygun personel bulunamadı! Lütfen tek tek devretme seçeneğini deneyin.
                                        </div>
                                    )}

                                    {resultMsg && <p className="text-rose-500 text-xs font-bold bg-rose-50 p-3 rounded-xl">{resultMsg}</p>}

                                    <button onClick={handleBulkReassign} disabled={!targetStaffId || isLoading} className="w-full py-3.5 bg-[var(--color-primary)] text-white font-bold rounded-xl disabled:opacity-50 transition-all hover:opacity-90 flex items-center justify-center gap-2 mt-4">
                                        {isLoading ? <span className="material-symbols-outlined animate-spin text-[20px]">sync</span> : <span className="material-symbols-outlined text-[20px]">swap_horiz</span>}
                                        {isLoading ? "Toplu Olarak Taşınıyor..." : "Tüm Randevuları Devret"}
                                    </button>
                                </div>
                            )}

                            {tab === 'individual' && (
                                <div className="space-y-4 animate-in fade-in">
                                    {isLoadingAppts ? (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                            <span className="material-symbols-outlined text-4xl animate-spin mb-4">sync</span>
                                            <p className="font-bold">Randevular yükleniyor...</p>
                                        </div>
                                    ) : appointments.length === 0 ? (
                                        <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">event_busy</span>
                                            <p className="font-bold text-slate-700">Gelecek randevusu bulunamadı.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {appointments.map(appt => {
                                                const reqServices = appt.appointment_services?.map((s: any) => s.service_id) || [];

                                                // Bu spesifik randevuyu alabilecek personelleri filtrele
                                                const eligibleStaff = allStaff.filter((s: any) => {
                                                    if (s.id === oldStaff.id || !s.is_active) return false;
                                                    const sServiceIds = s.staff_services?.map((ss: any) => ss.service_id) || [];
                                                    return reqServices.every((id: string) => sServiceIds.includes(id));
                                                });

                                                return (
                                                    <div key={appt.id} className="p-4 border border-slate-200 bg-white rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between hover:shadow-md transition-shadow">
                                                        <div className="flex-1 w-full">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-extrabold flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-[14px]">event</span>
                                                                    {new Date(appt.appointment_date).toLocaleDateString('tr-TR')}
                                                                </span>
                                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-extrabold flex items-center gap-1">
                                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                                    {appt.appointment_time.substring(0, 5)}
                                                                </span>
                                                                <span className="text-xs text-slate-400 font-medium ml-2">({appt.total_duration_minutes} dk)</span>
                                                            </div>
                                                            <p className="font-bold text-slate-800">{appt.customers?.first_name} {appt.customers?.last_name}</p>
                                                            <p className="text-xs text-slate-500 mt-1 font-medium">{reqServices.length} hizmet alınacak</p>
                                                        </div>

                                                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0 mt-2 md:mt-0 items-center">
                                                            {eligibleStaff.length > 0 ? (
                                                                <select
                                                                    id={`select-${appt.id}`}
                                                                    className="border border-slate-300 p-2 rounded-xl text-sm font-bold w-full sm:w-auto outline-none focus:border-[var(--color-primary)] bg-white"
                                                                >
                                                                    <option value="">-- Personel Seç --</option>
                                                                    {eligibleStaff.map((s: any) => (
                                                                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <span className="text-xs bg-rose-50 text-rose-600 px-3 py-2 rounded-xl border border-rose-100 font-bold w-full sm:w-auto text-center">
                                                                    Uygun Personel Yok
                                                                </span>
                                                            )}

                                                            <button
                                                                onClick={() => {
                                                                    const sel = document.getElementById(`select-${appt.id}`) as HTMLSelectElement;
                                                                    handleSingleReassign(appt.id, sel.value);
                                                                }}
                                                                disabled={eligibleStaff.length === 0 || reassigningApptId === appt.id}
                                                                className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl disabled:opacity-50 w-full sm:w-auto whitespace-nowrap"
                                                            >
                                                                {reassigningApptId === appt.id ? 'Aktarılıyor..' : 'Aktar'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col h-full overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-inner">
                                    <span className="material-symbols-outlined text-4xl">task_alt</span>
                                </div>
                                <h4 className="text-2xl font-black text-slate-800">Transfer Tamamlandı</h4>
                                <p className="text-slate-500 text-sm mt-2 font-medium">{resultData.message}</p>
                                <div className="mt-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-100 max-w-xs mx-auto shadow-sm">
                                    <p className="text-4xl font-extrabold text-emerald-600 mb-1">{resultData.count}</p>
                                    <p className="text-xs font-bold text-emerald-700/70 uppercase tracking-widest">Taşınan Randevu</p>
                                </div>
                            </div>

                            {resultData.errors && resultData.errors.length > 0 && (
                                <div className="border border-rose-100 bg-rose-50/50 rounded-2xl p-5 mb-6 shadow-sm">
                                    <h5 className="font-extrabold text-rose-800 text-sm mb-3">Taşınamayan Randevular ({resultData.errors.length}):</h5>
                                    <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {resultData.errors.map((err, i) => (
                                            <li key={i} className="text-xs font-bold text-rose-600 bg-white p-3 border border-rose-100 rounded-xl flex gap-3 items-start shadow-sm">
                                                <span className="material-symbols-outlined text-[16px]">warning</span>
                                                {err}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg mt-4">
                                Kapat ve Listeye Dön
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

