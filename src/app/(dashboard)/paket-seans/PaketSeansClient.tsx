"use client";

import { useState, useMemo, useEffect } from "react";
import CustomerLink from "@/components/CustomerLink";
import { getSessionPlanDetails } from "@/app/actions/packages";
import { OdemeAlModal } from "@/components/OdemeAlModal";
import { UpdateSessionPlanModal } from "@/components/UpdateSessionPlanModal";
import Link from 'next/link';
import { useRouter } from "next/navigation";

export default function PaketSeansClient({ initialPlans }: { initialPlans: any[] }) {
    const router = useRouter();
    const [plans, setPlans] = useState(initialPlans || []);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("active");
    const [delayFilter, setDelayFilter] = useState("all");
    const [paymentFilter, setPaymentFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");

    const [selectedPlanDetails, setSelectedPlanDetails] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const [paymentModalData, setPaymentModalData] = useState<{ isOpen: boolean; plan: any } | null>(null);
    const [updateModalData, setUpdateModalData] = useState<{ isOpen: boolean; plan: any; futureAppointmentsCount: number; completedCount: number } | null>(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // KPI Calculations
    const kpiStats = useMemo(() => {
        let activeCount = 0;
        let delayedCount = 0;
        let pendingBalance = 0;
        let thisWeekCount = 0;

        plans.forEach(p => {
            if (p.status === 'active') {
                activeCount++;
                const nextDate = p.next_recommended_date ? new Date(p.next_recommended_date) : null;
                // SADECE aktif randevusu yoksa gecikmeli say!
                if (nextDate && !p.next_appointment) {
                    nextDate.setHours(0, 0, 0, 0);
                    if (nextDate.getTime() < today.getTime()) delayedCount++;
                }

                // Bu hafta planlananlar KPI'ı için: ya planlanmış bir randevusu varsa, ya da önerilen tarihi bu haftaysa
                const targetDate = p.next_appointment ? new Date(p.next_appointment.date) : nextDate;
                if (targetDate) {
                    targetDate.setHours(0, 0, 0, 0);
                    if (targetDate.getTime() >= today.getTime() && targetDate.getTime() <= nextWeek.getTime()) thisWeekCount++;
                }
            }
            if (p.status !== 'canceled') {
                const bal = (Number(p.package_total_price) || 0) - (Number(p.paid_amount) || 0);
                if (bal > 0) pendingBalance += bal;
            }
        });

        return { activeCount, delayedCount, pendingBalance, thisWeekCount };
    }, [plans]);

    // Categories for filter
    const categories = useMemo(() => {
        const cats = new Set<string>();
        plans.forEach(p => {
            const cat = p.services?.service_categories?.name || "Genel";
            cats.add(cat);
        });
        return Array.from(cats);
    }, [plans]);

    // Filtering logic
    const filteredPlans = useMemo(() => {
        return plans.filter(p => {
            let match = true;

            if (statusFilter !== "all" && p.status !== statusFilter) match = false;

            if (delayFilter === "delayed") {
                if (!p.next_recommended_date || p.next_appointment) match = false;
                else {
                    const nd = new Date(p.next_recommended_date);
                    nd.setHours(0, 0, 0, 0);
                    if (nd.getTime() >= today.getTime()) match = false;
                }
            } else if (delayFilter === "this_week") {
                const targetDate = p.next_appointment ? new Date(p.next_appointment.date) : (p.next_recommended_date ? new Date(p.next_recommended_date) : null);
                if (!targetDate) match = false;
                else {
                    targetDate.setHours(0, 0, 0, 0);
                    if (targetDate.getTime() < today.getTime() || targetDate.getTime() > nextWeek.getTime()) match = false;
                }
            }

            if (paymentFilter === "pending") {
                const bal = (Number(p.package_total_price) || 0) - (Number(p.paid_amount) || 0);
                if (bal <= 0) match = false;
            } else if (paymentFilter === "paid") {
                const bal = (Number(p.package_total_price) || 0) - (Number(p.paid_amount) || 0);
                if (bal > 0) match = false;
            }

            if (categoryFilter !== "all") {
                const cat = p.services?.service_categories?.name || "Genel";
                if (cat !== categoryFilter) match = false;
            }

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const name = `${p.customers?.first_name || ""} ${p.customers?.last_name || ""}`.toLowerCase();
                const phone = p.customers?.phone || "";
                if (!name.includes(q) && !phone.includes(q)) match = false;
            }

            return match;
        });
    }, [plans, statusFilter, delayFilter, paymentFilter, categoryFilter, searchQuery]);


    const handleOpenDrawer = async (plan: any) => {
        setIsDrawerOpen(true);
        setIsLoadingDetails(true);
        setSelectedPlanDetails({ ...plan }); // Set basic plan info first for instant UI response

        const res = await getSessionPlanDetails(plan.id);
        if (res.success && res.data) {
            setSelectedPlanDetails(res.data);
        }
        setIsLoadingDetails(false);
    };

    const getDaysDifference = (targetDateStr: string | null) => {
        if (!targetDateStr) return null;
        const target = new Date(targetDateStr);
        target.setHours(0, 0, 0, 0);
        return Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    };

    const refreshData = () => {
        router.refresh();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header & Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">layers</span>
                        Paket & Seans Takibi
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Satılan paketlerin durumunu, geciken seansları ve ödemeleri yönetin.</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-purple-50 text-[var(--color-primary)] flex items-center justify-center">
                        <span className="material-symbols-outlined">style</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Aktif Paket</p>
                        <h3 className="text-2xl font-black text-slate-800">{kpiStats.activeCount}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                        <span className="material-symbols-outlined">event_busy</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Geciken Seans</p>
                        <h3 className="text-2xl font-black text-red-600">{kpiStats.delayedCount}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                        <span className="material-symbols-outlined">account_balance_wallet</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Açık Bakiye Toplamı</p>
                        <h3 className="text-2xl font-black text-emerald-600">₺{kpiStats.pendingBalance.toLocaleString('tr-TR')}</h3>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center">
                        <span className="material-symbols-outlined">today</span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">Bu Hafta Planlanan</p>
                        <h3 className="text-2xl font-black text-blue-600">{kpiStats.thisWeekCount}</h3>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        type="text"
                        placeholder="Müşteri adı veya telefon ile ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-50 font-bold text-slate-700 text-sm px-4 py-3 rounded-2xl border border-slate-200 outline-none">
                        <option value="all">Tüm Durumlar</option>
                        <option value="active">Aktif Paketler</option>
                        <option value="completed">Bitenler</option>
                        <option value="canceled">İptaller</option>
                    </select>

                    <select value={delayFilter} onChange={e => setDelayFilter(e.target.value)} className="bg-slate-50 font-bold text-slate-700 text-sm px-4 py-3 rounded-2xl border border-slate-200 outline-none">
                        <option value="all">Tüm Tarihler</option>
                        <option value="delayed">Gecikenler (Öncelikli)</option>
                        <option value="this_week">Bu Hafta Gelenler</option>
                    </select>

                    <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="bg-slate-50 font-bold text-slate-700 text-sm px-4 py-3 rounded-2xl border border-slate-200 outline-none">
                        <option value="all">Tüm Ödemeler</option>
                        <option value="pending">Kalan / Borçlu</option>
                        <option value="paid">Tamamı Ödendi</option>
                    </select>

                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-slate-50 font-bold text-slate-700 text-sm px-4 py-3 rounded-2xl border border-slate-200 outline-none">
                        <option value="all">Tüm Kategoriler</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Main Table Segment */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                                <th className="p-4 pl-6">Müşteri & Kategori</th>
                                <th className="p-4">Paket Durumu</th>
                                <th className="p-4">Sıradaki Randevu</th>
                                <th className="p-4">Adisyon & Ödeme</th>
                                <th className="p-4 pr-6 text-right">Aksiyonlar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPlans.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="material-symbols-outlined text-4xl">search_off</span>
                                            <p className="text-sm font-bold">Bu kriterlere uyan paket bulunamadı.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPlans.map(plan => {
                                const daysDiff = getDaysDifference(plan.next_recommended_date);
                                const isDelayed = daysDiff !== null && daysDiff > 0 && plan.status === 'active' && !plan.next_appointment;
                                const total = Number(plan.package_total_price) || 0;
                                const paid = Number(plan.paid_amount) || 0;
                                const balance = Math.max(0, total - paid);

                                return (
                                    <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-4 pl-6 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <h4 className="font-bold text-slate-900 text-sm">
                                                    <CustomerLink id={plan.customers?.id} firstName={plan.customers?.first_name} lastName={plan.customers?.last_name} className="hover:text-[var(--color-primary)]" />
                                                </h4>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <span className="material-symbols-outlined text-[14px]">phone_iphone</span>
                                                    {plan.customers?.phone || 'Eksik Tel'}
                                                </div>
                                                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg w-max text-xs text-slate-600 font-bold">
                                                    <span className="material-symbols-outlined text-[14px] text-[var(--color-primary)]">style</span>
                                                    {plan.services?.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-800">{plan.completed_sessions} <span className="text-slate-400 font-medium">/ {plan.total_sessions}</span></span>
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Seans</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all ${plan.status === 'completed' ? 'bg-emerald-500' : 'bg-[var(--color-primary)]'}`} style={{ width: `${Math.min(100, (plan.completed_sessions / plan.total_sessions) * 100)}%` }}></div>
                                                </div>
                                                <div className="mt-1 flex gap-2">
                                                    {plan.status === 'active' && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">Aktif</span>}
                                                    {plan.status === 'completed' && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded uppercase">Bitti</span>}
                                                    {plan.status === 'canceled' && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">İptal</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="space-y-3">
                                                {/* Planlanmış Randevu Bilgisi */}
                                                {plan.next_appointment ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Randevu Planlandı</span>
                                                        <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                                                            <span className="material-symbols-outlined text-[16px]">event_available</span>
                                                            {new Date(plan.next_appointment.date).toLocaleDateString("tr-TR")}
                                                            {plan.next_appointment.time && <span className="text-xs text-emerald-500 font-medium">• {plan.next_appointment.time.slice(0, 5)}</span>}
                                                        </div>
                                                        <span className="text-[10px] text-emerald-600 font-bold">
                                                            Seans {plan.next_appointment.session_number}/{plan.total_sessions}
                                                        </span>
                                                    </div>
                                                ) : plan.completed_sessions === 0 && plan.status === 'active' ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">İlk Seans Eksik</span>
                                                        <div className="flex items-center gap-2 text-sm font-bold text-amber-600">
                                                            <span className="material-symbols-outlined text-[16px]">event_busy</span>
                                                            1. Seansı Planlayın
                                                        </div>
                                                        <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 text-[10px] font-bold rounded-md w-max flex items-center gap-1 mt-0.5">
                                                            <span className="material-symbols-outlined text-[12px]">calendar_add_on</span>
                                                            Henüz başlamadı
                                                        </span>
                                                    </div>
                                                ) : plan.next_recommended_date && plan.status === 'active' ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sıradaki Önerilen</span>
                                                        <div className={`flex items-center gap-2 text-sm font-bold ${isDelayed ? 'text-rose-600' : 'text-slate-700'}`}>
                                                            <span className="material-symbols-outlined text-[16px]">calendar_clock</span>
                                                            {new Date(plan.next_recommended_date).toLocaleDateString("tr-TR")}
                                                            {isDelayed && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] rounded animate-pulse">{daysDiff} gün gecikme!</span>}
                                                        </div>
                                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold rounded-md w-max flex items-center gap-1 mt-0.5">
                                                            <span className="material-symbols-outlined text-[12px]">event_busy</span>
                                                            Randevu Yok
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tarih</span>
                                                        <span className="text-sm font-bold text-slate-400">- Yok -</span>
                                                    </div>
                                                )}
                                                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">history</span>
                                                    Aralık: {plan.recommended_interval_days} gün
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 align-top">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center text-sm font-bold">
                                                    <span className="text-slate-500">Ödenen:</span>
                                                    <span className="text-emerald-600">₺{paid.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-sm font-bold">
                                                    <span className="text-slate-500">Kalan:</span>
                                                    <span className={balance > 0 ? "text-red-500" : "text-slate-400"}>₺{balance.toLocaleString()}</span>
                                                </div>
                                                <div className="h-px w-full bg-slate-100 my-1"></div>
                                                <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                                                    <span>Toplam:</span>
                                                    <span>₺{total.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 pr-6 align-top">
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/randevu-olustur?customer_id=${plan.customer_id}&service_id=${plan.service_id}${plan.next_recommended_date ? `&date=${new Date(plan.next_recommended_date) >= today ? plan.next_recommended_date : new Date().toISOString().split('T')[0]}` : ''}`}>
                                                        <button className="px-3 py-1.5 bg-purple-50 hover:bg-[var(--color-primary)] text-[var(--color-primary)] hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px]">add</span> Randevu
                                                        </button>
                                                    </Link>
                                                    {balance > 0 && plan.status !== 'canceled' && (
                                                        <button onClick={() => setPaymentModalData({ isOpen: true, plan })} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px]">payments</span> Ödeme Al
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => setUpdateModalData({ isOpen: true, plan, futureAppointmentsCount: 0, completedCount: plan.completed_sessions })} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors tooltip tooltip-top" data-tip="Düzenle">
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <a href={`tel:${plan.customers?.phone}`} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip tooltip-top" data-tip="Ara">
                                                        <span className="material-symbols-outlined text-[18px]">call</span>
                                                    </a>
                                                    <button onClick={() => handleOpenDrawer(plan)} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors tooltip tooltip-top" data-tip="Detaylar">
                                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Render Payment/Update Modals */}
            {paymentModalData?.isOpen && paymentModalData.plan && (
                <OdemeAlModal
                    isOpen={paymentModalData.isOpen}
                    onClose={() => { setPaymentModalData(null); refreshData(); }}
                    customerId={paymentModalData.plan.customers?.id}
                    sessionPlanId={paymentModalData.plan.id}
                    suggestedAmount={Math.max(0, (Number(paymentModalData.plan.package_total_price) || 0) - (Number(paymentModalData.plan.paid_amount) || 0))}
                    title="Ödeme Al"
                    description={`${paymentModalData.plan.services?.name || 'Paket'} ödemesi.`}
                />
            )}
            {updateModalData?.isOpen && updateModalData.plan && (
                <UpdateSessionPlanModal
                    isOpen={updateModalData.isOpen}
                    onClose={() => { setUpdateModalData(null); refreshData(); }}
                    plan={updateModalData.plan}
                    futureAppointmentsCount={updateModalData.futureAppointmentsCount}
                    completedAppointmentsCount={updateModalData.completedCount}
                />
            )}

            {/* Quick Details Drawer */}
            {isDrawerOpen && (
                <>
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsDrawerOpen(false)}></div>
                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Paket/Seans Detayı</h3>
                                <p className="text-xs text-slate-500 font-medium">Satış ve seans izleme dökümü.</p>
                            </div>
                            <button onClick={() => setIsDrawerOpen(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                            {isLoadingDetails ? (
                                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                                    <span className="material-symbols-outlined animate-spin text-3xl text-[var(--color-primary)]">progress_activity</span>
                                    <p className="text-sm font-bold">Detaylar yükleniyor...</p>
                                </div>
                            ) : selectedPlanDetails && (
                                <>
                                    {/* Müşteri & Paket Özet Kartı */}
                                    <div className="bg-purple-50/50 p-5 rounded-3xl border border-purple-100 flex gap-4 items-start">
                                        <div className="size-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-[var(--color-primary)] font-bold text-xl">
                                            {selectedPlanDetails.customers?.first_name?.charAt(0)}{selectedPlanDetails.customers?.last_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg">
                                                {selectedPlanDetails.customers?.first_name} {selectedPlanDetails.customers?.last_name}
                                            </h4>
                                            <p className="text-sm text-slate-500 inline-flex items-center gap-1 mt-1">
                                                <span className="material-symbols-outlined text-[14px]">style</span>
                                                <b className="text-slate-700">{selectedPlanDetails.services?.name}</b>
                                            </p>
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className="px-2 py-0.5 bg-white text-slate-600 text-xs font-bold rounded shadow-sm border border-slate-100">
                                                    {selectedPlanDetails.completed_sessions} / {selectedPlanDetails.total_sessions} Seans
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Geçmiş Seanslar & Randevular */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[var(--color-primary)]">history</span> Seans Geçmişi
                                        </h4>
                                        {(!selectedPlanDetails.appointment_services || selectedPlanDetails.appointment_services.length === 0) ? (
                                            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">Hiç randevu veya seans işlenmemiş.</p>
                                        ) : (
                                            <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-slate-200 ml-1">
                                                {selectedPlanDetails.appointment_services.map((asrv: any) => {
                                                    const apt = asrv.appointments;
                                                    const isFuture = apt && new Date(apt.appointment_date) > today;
                                                    return (
                                                        <div key={asrv.id} className="relative flex items-start gap-4 pl-10">
                                                            <div className={`absolute left-2.5 top-1 size-3 rounded-full border-2 ${apt?.status === 'completed' ? 'bg-emerald-500 border-emerald-100' : isFuture ? 'bg-blue-400 border-blue-100' : 'bg-slate-300 border-slate-100'}`}></div>
                                                            <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <p className="text-sm font-bold text-slate-800">Seans {asrv.session_number}</p>
                                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${apt?.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : isFuture ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                                                                        {apt?.status === 'completed' ? 'Tamamlandı' : isFuture ? 'Planlandı' : apt?.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                                                    <span className="material-symbols-outlined text-[14px]">event</span>
                                                                    {apt ? new Date(apt.appointment_date).toLocaleDateString('tr-TR') : 'Randevusuz Kayıt'}
                                                                    {apt && ` - ${apt.appointment_time?.slice(0, 5)}`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                        {selectedPlanDetails.status === 'active' && (
                                            <div className="mt-4 flex justify-end">
                                                <Link href={`/randevu-olustur?customer_id=${selectedPlanDetails.customer_id}&service_id=${selectedPlanDetails.service_id}${selectedPlanDetails.next_recommended_date ? `&date=${new Date(selectedPlanDetails.next_recommended_date) >= today ? selectedPlanDetails.next_recommended_date : new Date().toISOString().split('T')[0]}` : ''}`}>
                                                    <button className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1">
                                                        Sıradaki seansı planla <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                                    </button>
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* Ödeme Geçmişi */}
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-emerald-500">payments</span> Ödeme Hareketleri
                                        </h4>
                                        {(!selectedPlanDetails.payments || selectedPlanDetails.payments.length === 0) ? (
                                            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">Hiç ödeme alınmamış.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {selectedPlanDetails.payments.map((pmt: any) => (
                                                    <div key={pmt.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-700">₺{Number(pmt.amount).toLocaleString('tr-TR')}</p>
                                                            <p className="text-[10px] text-slate-400 mt-0.5">{new Date(pmt.paid_at).toLocaleDateString('tr-TR')} • {pmt.payment_method?.toUpperCase()}</p>
                                                        </div>
                                                        {pmt.notes && <p className="text-[10px] font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 line-clamp-1 max-w-[120px]" title={pmt.notes}>{pmt.notes}</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}

        </div>
    );
}
