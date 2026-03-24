"use client";

import { useState, useTransition, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { updateAppointmentStatus, deleteAppointment, createAppointment } from "@/app/actions/appointments";
import CustomerLink from "@/components/CustomerLink";
import { AppointmentPaymentClient } from "./AppointmentPaymentClient";
import { PlanNextSessionModal } from "@/components/PlanNextSessionModal";

interface RandevularClientProps {
    appointments: any[];
    pendingSessions?: any[];
}

// Canlı Saat Hook'u
function useLiveTime() {
    const [liveTime, setLiveTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setLiveTime(new Date());
        }, 30000); // 30 saniyede bir güncelle (dakikayı yakalamak için yeterli)
        return () => clearInterval(timer);
    }, []);

    return liveTime;
}

// Tarih/Saat Format Yardımcıları
function formatDateFull(dateStr: string) {
    const [y, m, d] = dateStr.split("-");
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        weekday: "long",
    });
}

function formatDateShort(dateStr: string) {
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
}

function formatGroupHeader(dateStr: string, today: Date) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === tomorrow.toDateString()) {
        return "Yarın, " + date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
    }

    return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

function formatTime(timeStr: string) {
    return timeStr.substring(0, 5);
}

// Takvim için gün ismini / numarasını döndürür
function getDayInfo(date: Date) {
    const formatter = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' });
    let dayName = formatter.format(date).substring(0, 3); // "Sal", "Çar" vb ama harf büyüklüğü için capitalize lazım
    dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const dayNum = date.getDate();
    return { dayName, dayNum };
}

// Kart renklerini döngüsel dağıtmak için
const CALENDAR_COLORS = [
    { bg: "bg-accent-pink/50", border: "border-pink-100", textPrimary: "text-pink-600", textSecondary: "text-pink-700/70" },
    { bg: "bg-accent-lilac/50", border: "border-purple-100", textPrimary: "text-primary", textSecondary: "text-primary/70" },
    { bg: "bg-accent-rose/50", border: "border-rose-100", textPrimary: "text-rose-600", textSecondary: "text-rose-700/70" },
    { bg: "bg-emerald-50", border: "border-emerald-100", textPrimary: "text-emerald-600", textSecondary: "text-emerald-700/70" },
    { bg: "bg-blue-50", border: "border-blue-100", textPrimary: "text-blue-600", textSecondary: "text-blue-700/70" },
];

function getLocalIsoDate(date: Date) {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, -1);
    return localISOTime.split("T")[0];
}

export default function RandevularClient({ appointments, pendingSessions = [] }: RandevularClientProps) {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Takvim yükleniyor...</div>}>
            <RandevularClientContent appointments={appointments} pendingSessions={pendingSessions} />
        </Suspense>
    );
}

function RandevularClientContent({ appointments, pendingSessions = [] }: RandevularClientProps) {
    const [isPending, startTransition] = useTransition();
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
    const [selectedAppt, setSelectedAppt] = useState<any>(null);
    const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>("all");
    const router = useRouter();

    // Canlı Saat
    const liveTime = useLiveTime();

    // Takvim Offset State (0 = Mevcut hafta, -1 geçen hafta, 1 gelecek hafta)
    const [weekOffset, setWeekOffset] = useState(0);

    // Test İçin Tarih Simülasyonu (URL parametresi: ?date=2026-03-05)
    // Timezone safe olarak (kullanıcının kendi yerel saatine göre gece 12 sınırını aşmasını engeller)
    const searchParams = useSearchParams();
    const paramDate = searchParams.get("date");

    // Gerçek Bugün (Header metinleri ve istatistikleri için her zaman sabit kalmalı)
    const realToday = new Date();
    const realTodayStr = getLocalIsoDate(realToday);
    const realSevenDaysLater = new Date(realToday);
    realSevenDaysLater.setDate(realToday.getDate() + 7);
    const realSevenDaysLaterStr = getLocalIsoDate(realSevenDaysLater);

    // Staff Filter List
    const staffList = appointments.reduce((acc: any[], current: any) => {
        if (current.staff && !acc.find(s => s.id === current.staff.id)) {
            acc.push(current.staff);
        }
        return acc;
    }, []);

    const filteredAppointments = appointments.filter(a => {
        if (selectedStaffFilter === "all") return true;
        if (selectedStaffFilter === "unassigned") return !a.staff_id;
        return a.staff_id === selectedStaffFilter;
    });

    const realWeeklyAppts = filteredAppointments.filter(a => a.appointment_date >= realTodayStr && a.appointment_date <= realSevenDaysLaterStr);
    const realTodayAppts = filteredAppointments.filter(a => a.appointment_date === realTodayStr);

    // 1. Dinamik Tarih (Kullanıcının Seçtiği Tarih): Normalde system time, param varsa simüle edilmiş tarih.
    const [selectedDate, setSelectedDate] = useState<Date>(() => paramDate ? new Date(paramDate) : new Date());
    const today = selectedDate; // Tüm geri kalan logic (Gelecek Randevular vb.) bu timeline'a göre çalışır
    // 2. UTC Timezone kaymalarını önleyen güvenli String formatı (YYYY-MM-DD)
    const todayStr = getLocalIsoDate(today);

    // Gruplama
    const grouped: { [date: string]: any[] } = {};
    for (const appt of filteredAppointments) {
        const k = appt.appointment_date;
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push(appt);
    }

    // Pending Sessions'ları da Fake Appointment Olarak Ekle
    for (const pending of pendingSessions) {
        if (!pending.next_recommended_date) continue;
        const fakeAppt = {
            id: `pending-${pending.id}`,
            is_pending_session: true, // Takvimde ayırt edebilmek için
            appointment_date: pending.next_recommended_date,
            appointment_time: "10:00", // Görüntülenmesi için öylesine bir saat
            status: "pending_session",
            total_duration_minutes: pending.service?.duration_minutes || 30,
            total_price: 0,
            customer: pending.customer,
            services: [
                {
                    service: pending.service,
                    session_number: pending.completed_sessions + 1,
                    session_plans: { total_sessions: pending.total_sessions },
                }
            ]
        };
        const k = fakeAppt.appointment_date;
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push(fakeAppt);
    }

    const sortedDates = Object.keys(grouped).sort();

    // Sadece bugünün randevuları
    const todayAppointments = grouped[todayStr] || [];

    // Gelecekteki Date grupları listesi
    const futureDates = sortedDates.filter(d => d > todayStr);

    // AI Kartı İçin Doluluk Tahmini
    const capacity = 50;
    const fillRate = Math.min(100, Math.round((realWeeklyAppts.length / capacity) * 100));

    // == TAKVİM GÖRÜNÜMÜ HESAPLAMALARI
    const calendarDays = [];

    // Offset'e göre hesaplanmış referans tarih (Bugün + (weekOffset * 7 gün))
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() + (weekOffset * 7));

    const currentDayOfWeek = referenceDate.getDay(); // 0(Paz) - 6(Cmt)
    const distanceToMonday = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;

    const startOfWeek = new Date(referenceDate);
    startOfWeek.setDate(referenceDate.getDate() - distanceToMonday);

    for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        calendarDays.push(d);
    }

    // Calendar Header Month
    // Haftanın ilk günü hangi ayda ise o ayı göster
    const currentMonthName = startOfWeek.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

    // Takvim Hafta Gezinme Fonksiyonları
    const handlePrevWeek = () => setWeekOffset(prev => prev - 1);
    const handleNextWeek = () => setWeekOffset(prev => prev + 1);
    const handleTodayWeek = () => setWeekOffset(0);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header ve Toolbar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Randevular</h2>
                    <p className="text-slate-500 mt-2 text-lg">
                        Bugün için <span className="font-bold text-slate-800">{realTodayAppts.length}</span>,
                        bu hafta için toplam <span className="font-bold text-slate-800">{realWeeklyAppts.length}</span> randevu görünüyor.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    {/* Personel Filtresi */}
                    {staffList.length > 0 && (
                        <select
                            value={selectedStaffFilter}
                            onChange={(e) => setSelectedStaffFilter(e.target.value)}
                            className="px-4 py-2 text-sm font-bold bg-white text-slate-700 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none cursor-pointer"
                        >
                            <option value="all">Tüm Personel</option>
                            {staffList.map((staff: any) => (
                                <option key={staff.id} value={staff.id}>{staff.first_name} {staff.last_name}</option>
                            ))}
                            <option value="unassigned">Personel Atanmamış</option>
                        </select>
                    )}
                    
                    {/* Arama / Toolbar UX - Liste / Takvim Toggle */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Liste
                        </button>
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Takvim
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                            <span className="material-symbols-outlined text-sm">filter_list</span>
                            Filtrele
                        </button>
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-sm rounded-xl hover:bg-[var(--color-primary)]/20 transition-all">
                            <span className="material-symbols-outlined text-sm">print</span>
                            Listeyi Yazdır
                        </button>
                        <Link href="/randevu-olustur">
                            <button className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all">
                                <span className="material-symbols-outlined">add</span>
                                Yeni Randevu
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {viewMode === "calendar" ? (
                // ==========================================
                // TAKVİM GÖRÜNÜMÜ UI (7 Kolonlu Grid)
                // ==========================================
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                        <h2 className="text-2xl font-bold text-slate-900">{currentMonthName}</h2>
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            <button onClick={handlePrevWeek} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-slate-900">
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <button onClick={handleTodayWeek} className="px-4 py-1 text-sm font-bold text-slate-600 hover:text-slate-900">Bugün</button>
                            <button onClick={handleNextWeek} className="p-1.5 hover:bg-white rounded-lg transition-all text-slate-500 hover:text-slate-900">
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 p-6 overflow-x-auto shadow-sm">
                        <div className="grid grid-cols-7 gap-4 min-w-[1000px]">
                            {calendarDays.map((dateObj, colIndex) => {
                                const dateStr = getLocalIsoDate(dateObj);
                                const isTodayCol = dateStr === todayStr;
                                const { dayName, dayNum } = getDayInfo(dateObj);
                                const dayAppts = grouped[dateStr] || [];

                                return (
                                    <div key={dateStr} className={`flex flex-col gap-3 min-w-[140px] ${isTodayCol ? 'bg-[var(--color-primary)]/5 rounded-3xl p-2 -m-2 border-2 border-[var(--color-primary)]/20' : ''}`}>
                                        <div className={`text-center pb-2 border-b ${isTodayCol ? 'border-[var(--color-primary)]/20' : 'border-slate-200'}`}>
                                            <p className={`text-xs font-bold uppercase tracking-tighter ${isTodayCol ? 'text-[var(--color-primary)]' : 'text-slate-400'}`}>{dayName}</p>
                                            <p className={`text-xl font-bold ${isTodayCol ? 'text-[var(--color-primary)]' : 'text-slate-800'}`}>{dayNum}</p>
                                        </div>

                                        <div className="space-y-3 mt-1 h-full">
                                            {dayAppts.length === 0 ? (
                                                <div className="p-3 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center min-h-[80px] opacity-50">
                                                    <span className="material-symbols-outlined text-slate-300">add</span>
                                                </div>
                                            ) : (
                                                dayAppts.map((appt, i) => {
                                                    const customer = appt.customer || {};
                                                    const servicesText = appt.services?.map((s: any) => {
                                                        const name = s.service?.name;
                                                        if (s.session_number && s.session_plans) {
                                                            return `${name} (Seans ${s.session_number}/${s.session_plans.total_sessions})`;
                                                        }
                                                        return name;
                                                    }).filter(Boolean).join(', ') || 'Belirtilmedi';

                                                    if (appt.is_pending_session) {
                                                        const createLink = `/randevu-olustur?customer_id=${customer.id}&service_id=${appt.services[0].service.id}&date=${appt.appointment_date}&time=10:00`;
                                                        return (
                                                            <div onClick={() => router.push(createLink)} key={appt.id} className="block p-3 bg-purple-50/50 border border-purple-200 border-dashed rounded-2xl shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <div className="flex items-center gap-1 text-purple-600">
                                                                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                                                                        <span className="text-[9px] font-extrabold uppercase tracking-widest">ÖNERİ</span>
                                                                    </div>
                                                                </div>
                                                                <CustomerLink
                                                                    id={customer.id}
                                                                    firstName={customer.first_name}
                                                                    lastName={customer.last_name}
                                                                    className="text-sm font-bold text-slate-800 truncate block group-hover:text-purple-700 transition-colors"
                                                                />
                                                                <p className="text-[10px] text-slate-500 italic truncate mt-0.5" title={servicesText}>
                                                                    {servicesText}
                                                                </p>
                                                            </div>
                                                        );
                                                    }

                                                    // Geçmişte kalmış ya da no_show/canceled appt ise soluk kutu
                                                    const isInactive = appt.status === "canceled" || appt.status === "no_show";

                                                    // isTodayCol içinde bir de "tam şu an" randevusu ise farklı renklendiriyordu tasarımda, simplifiye edip sadece normal renk skalasına bindirelim:
                                                    const colorScheme = CALENDAR_COLORS[i % CALENDAR_COLORS.length];

                                                    return (
                                                        <div key={appt.id} onClick={() => setSelectedAppt(appt)} className={`p-3 ${colorScheme.bg} border ${colorScheme.border} rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isInactive ? 'opacity-50 grayscale' : ''}`}>
                                                            <div className="flex justify-between items-start mb-1">
                                                                <p className={`text-[10px] font-bold ${colorScheme.textPrimary}`}>{formatTime(appt.appointment_time)}</p>
                                                                {appt.status === "completed" && <span className="material-symbols-outlined text-[12px] text-emerald-600">check_circle</span>}
                                                            </div>
                                                            <CustomerLink
                                                                id={customer.id}
                                                                firstName={customer.first_name}
                                                                lastName={customer.last_name}
                                                                className="text-sm font-bold text-slate-800 truncate block"
                                                            />
                                                            {appt.staff && (
                                                                <span className="text-[10px] font-bold text-slate-600 bg-white/50 px-1 py-0.5 mt-0.5 rounded inline-flex items-center gap-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                                                                    <span className="material-symbols-outlined text-[10px]">badge</span>
                                                                    {appt.staff.first_name}
                                                                </span>
                                                            )}
                                                            <p className={`text-[10px] ${colorScheme.textSecondary} italic truncate mt-0.5`} title={servicesText}>
                                                                {servicesText}
                                                            </p>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                // ==========================================
                // LİSTE GÖRÜNÜMÜ UI
                // ==========================================
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* SOL PANEL: Bugünkü Randevular */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b border-slate-100 pb-4">
                            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                                {todayStr === realTodayStr ? "Bugünkü Randevular" : "Seçili Günün Randevuları"}
                                <span className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm rounded-full font-bold">
                                    {todayAppointments.length}
                                </span>
                            </h3>
                            <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-100/80">
                                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }} className="p-1 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-[var(--color-primary)] flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-lg">chevron_left</span></button>

                                <div className="flex items-center gap-2 cursor-pointer relative px-2">
                                    <span className="material-symbols-outlined text-lg opacity-70 text-[var(--color-primary)]">calendar_month</span>
                                    <span className="text-sm font-bold text-slate-600 min-w-[140px] text-center">{formatDateFull(todayStr)}</span>
                                    <input type="date" value={todayStr} onChange={(e) => { if (e.target.value) setSelectedDate(new Date(e.target.value)) }} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                                </div>

                                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }} className="p-1 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-[var(--color-primary)] flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {todayAppointments.length === 0 ? (
                                <p className="text-slate-400 p-6 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 border-dashed">
                                    Bugün için randevunuz yok.
                                </p>
                            ) : (
                                todayAppointments.map((appt) => (
                                    <AppointmentCard
                                        key={appt.id}
                                        appt={appt}
                                        isToday={todayStr === realTodayStr}
                                        startTransition={startTransition}
                                        liveTime={liveTime}
                                        onViewClick={setSelectedAppt}
                                        pendingSessions={pendingSessions}
                                    />
                                ))
                            )}
                        </div>
                    </div>

                    {/* SAĞ PANEL: Gelecek Randevular + AI */}
                    <div className="lg:col-span-5 space-y-8">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-2xl font-extrabold text-slate-900">Gelecek Randevular</h3>
                                <button
                                    onClick={() => setViewMode("calendar")}
                                    className="text-[var(--color-primary)] text-sm font-bold hover:underline"
                                >
                                    Haftalık Görünüm
                                </button>
                            </div>

                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden pt-2 pb-4">
                                {futureDates.length === 0 ? (
                                    <p className="text-slate-400 text-sm text-center p-6">Gelecekte randevu planlanmamış.</p>
                                ) : (
                                    <div className="divide-y divide-slate-100/50">
                                        {futureDates.slice(0, 5).map(dateStr => {
                                            const dayAppts = grouped[dateStr];
                                            return (
                                                <div key={dateStr} className="pt-4 pb-2">
                                                    <div className="px-6 mb-3 flex items-center gap-2 text-sm font-bold text-slate-600">
                                                        <span className="size-2 rounded-full bg-[var(--color-primary)]"></span>
                                                        {formatGroupHeader(dateStr, today)}
                                                    </div>

                                                    <div className="space-y-1">
                                                        {dayAppts.map(appt => {
                                                            const customer = appt.customer || {};
                                                            const servicesText = appt.services?.map((s: any) => {
                                                                const name = s.service?.name;
                                                                if (s.session_number && s.session_plans) {
                                                                    return `${name} (Seans ${s.session_number}/${s.session_plans.total_sessions})`;
                                                                }
                                                                return name;
                                                            }).filter(Boolean).join(', ') || 'Belirtilmedi';
                                                            if (appt.is_pending_session) {
                                                                return (
                                                                    <div onClick={() => router.push(`/randevu-olustur?customer_id=${customer.id}&service_id=${appt.services[0].service.id}&date=${appt.appointment_date}&time=10:00`)} key={appt.id} className="px-6 py-3 flex items-center gap-4 hover:bg-purple-50/50 transition-colors cursor-pointer group border-l-2 border-transparent hover:border-purple-400">
                                                                        <div className="text-center shrink-0 w-12 bg-purple-50 text-purple-600 py-1.5 rounded-lg border border-purple-100 group-hover:bg-white transition-colors flex items-center justify-center">
                                                                            <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center gap-2">
                                                                                <CustomerLink id={customer.id} firstName={customer.first_name} lastName={customer.last_name} className="text-[15px] font-bold text-slate-900 truncate block" />
                                                                                <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase tracking-widest mt-0.5">ÖNERİ</span>
                                                                            </div>
                                                                            <p className="text-[13px] text-slate-500 truncate">{servicesText}</p>
                                                                        </div>
                                                                        <span className="material-symbols-outlined text-purple-200 text-xl group-hover:text-purple-500 transition-colors">edit_calendar</span>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div key={appt.id} onClick={() => setSelectedAppt(appt)} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                                                                    <div className="text-center shrink-0 w-12 bg-slate-50 py-1.5 rounded-lg border border-slate-100 group-hover:bg-white group-hover:border-[var(--color-primary)]/20 transition-colors">
                                                                        <span className="text-[var(--color-primary)] font-bold text-sm block leading-none">{formatTime(appt.appointment_time)}</span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                            <CustomerLink
                                                                                id={customer.id}
                                                                                firstName={customer.first_name}
                                                                                lastName={customer.last_name}
                                                                                className="text-[15px] font-bold text-slate-900 truncate block"
                                                                            />
                                                                            {appt.staff && (
                                                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                                                                                    <span className="material-symbols-outlined text-[10px]">badge</span>
                                                                                    {appt.staff.first_name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[13px] text-slate-500 truncate">{servicesText}</p>
                                                                    </div>
                                                                    <span className="material-symbols-outlined text-slate-200 text-xl group-hover:text-[var(--color-primary)]/50 transition-colors">chevron_right</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {futureDates.length > 5 && (
                                    <div className="pt-4 px-6 text-center border-t border-slate-100 mt-2">
                                        <button
                                            onClick={() => setViewMode("calendar")}
                                            className="text-[var(--color-primary)] text-sm font-bold hover:opacity-80 transition-colors"
                                        >
                                            Tüm Haftayı Listele
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* AI Kartı */}
                        <div className="bg-[var(--color-primary)] rounded-3xl p-6 text-white shadow-xl shadow-[var(--color-primary)]/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
                                <span className="material-symbols-outlined text-8xl">bolt</span>
                            </div>

                            <h4 className="font-bold flex items-center gap-2 text-lg relative z-10">
                                <span className="material-symbols-outlined">bolt</span>
                                Doluluk Tahmini
                            </h4>

                            <p className="text-white/80 mt-2 text-sm leading-relaxed relative z-10">
                                Önümüzdeki hafta için doluluk oranınız şu an <strong className="text-white">%{fillRate}</strong>. Otomatik randevu hatırlatıcıları gönderilsin mi?
                            </p>

                            <button className="mt-5 w-full py-3 bg-white text-[var(--color-primary)] rounded-xl font-bold text-sm hover:shadow-lg transition-all relative z-10">
                                Hatırlatıcı Gönder
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Randevu Detay Modalı */}
            {selectedAppt && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-xl font-extrabold text-slate-900">Randevu Detayları</h3>
                            <button onClick={() => setSelectedAppt(null)} className="p-2 hover:bg-slate-200 text-slate-400 rounded-full transition-colors flex items-center justify-center">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto w-full">
                            {/* Müşteri Bilgisi */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                                <div className="size-16 rounded-full bg-gradient-to-br from-[var(--color-primary)]/20 to-purple-600/10 text-[var(--color-primary)] flex items-center justify-center font-bold text-2xl uppercase shadow-inner border border-white shrink-0">
                                    {selectedAppt.customer?.first_name?.[0]}{selectedAppt.customer?.last_name?.[0]}
                                </div>
                                <div>
                                    <h4 className="text-xl font-extrabold text-slate-900">
                                        <CustomerLink id={selectedAppt.customer?.id} firstName={selectedAppt.customer?.first_name} lastName={selectedAppt.customer?.last_name} className="hover:text-[var(--color-primary)] transition-colors" />
                                    </h4>
                                    <p className="text-sm font-medium text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-1">
                                        <span className="material-symbols-outlined text-[16px]">call</span>
                                        {selectedAppt.customer?.phone || "Telefon Yok"}
                                    </p>
                                </div>
                                <div className="ml-0 sm:ml-auto w-full sm:w-auto">
                                    <span className="inline-flex w-full justify-center px-4 py-1.5 font-bold text-[11px] rounded-full tracking-wider uppercase border border-slate-200 text-slate-600 bg-white">
                                        {selectedAppt.status === "completed" ? "TAMAMLANDI" : selectedAppt.status === "scheduled" ? "BEKLİYOR" : selectedAppt.status === "no_show" ? "GELMEDİ" : selectedAppt.status === "canceled" ? "İPTAL EDİLDİ" : selectedAppt.status === "checked_in" ? "SALONDA" : "BİLİNMİYOR"}
                                    </span>
                                </div>
                            </div>

                            {/* Hizmetler ve Tutar */}
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4 shadow-inner">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                                    <span className="text-sm font-bold text-slate-500 flex items-center gap-1.5 shrink-0"><span className="material-symbols-outlined text-[18px]">spa</span> Hizmetler</span>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full">
                                        {selectedAppt.services?.map((s: any, i: number) => {
                                            const sName = s.service?.name;
                                            const display = (s.session_number && s.session_plans) ? `${sName} (Seans ${s.session_number}/${s.session_plans.total_sessions})` : sName;
                                            return (
                                                <span key={i} className="text-sm font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm whitespace-nowrap">{display}</span>
                                            );
                                        })}
                                        {(!selectedAppt.services || selectedAppt.services.length === 0) && (
                                            <span className="text-sm font-medium text-slate-400">Belirtilmedi</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-slate-200/60">
                                    <span className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">payments</span> Toplam Tutar</span>
                                    <span className="text-2xl font-black text-[var(--color-primary)]">{selectedAppt.total_price} TL</span>
                                </div>
                            </div>

                            <AppointmentPaymentClient appt={selectedAppt} />

                            {/* Personel ve Salon (Varsa) */}
                            {(selectedAppt.staff || selectedAppt.salons) && (
                                <div className="flex flex-wrap items-center gap-3">
                                    {selectedAppt.staff && (
                                        <div className="flex-1 flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                            <div className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] p-2 rounded-xl flex items-center justify-center">
                                                <span className="material-symbols-outlined text-xl">badge</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">PERSONEL</p>
                                                <p className="font-extrabold text-slate-900 text-sm">{selectedAppt.staff.first_name} {selectedAppt.staff.last_name}</p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedAppt.salons && (
                                        <div className="flex-1 flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                            <div className="bg-slate-200 text-slate-600 p-2 rounded-xl flex items-center justify-center">
                                                <span className="material-symbols-outlined text-xl">meeting_room</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-slate-400">SALON / ODA</p>
                                                <p className="font-extrabold text-slate-900 text-sm">{selectedAppt.salons.name}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tarih ve Saat */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-3xl border border-slate-100 bg-white shadow-sm flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow">
                                    <div className="size-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-3 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] transition-colors">
                                        <span className="material-symbols-outlined">calendar_month</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">TARİH</span>
                                    <p className="font-extrabold text-slate-900 text-[15px]">{new Date(selectedAppt.appointment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <div className="p-4 rounded-3xl border border-slate-100 bg-white shadow-sm flex flex-col justify-center items-center text-center hover:shadow-md transition-shadow">
                                    <div className="size-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                                        <span className="material-symbols-outlined">schedule</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">SAAT & SÜRE</span>
                                    <p className="font-extrabold text-slate-900 text-[15px]">{selectedAppt.appointment_time?.substring(0, 5)} <span className="text-slate-400 font-medium whitespace-nowrap">({selectedAppt.total_duration_minutes} dk)</span></p>
                                </div>
                            </div>

                            {/* Notlar */}
                            {selectedAppt.notes && (
                                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/50 text-amber-800 text-sm flex gap-3 items-start">
                                    <span className="material-symbols-outlined text-amber-500 shrink-0">notes</span>
                                    <p className="leading-relaxed font-medium">{selectedAppt.notes}</p>
                                </div>
                            )}

                            {/* Salon Bilgisi */}
                            {selectedAppt.salons && (
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-500 flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">storefront</span> Salon</span>
                                    <span className="flex items-center gap-2 font-bold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                        <div className="size-2.5 rounded-full" style={{ backgroundColor: selectedAppt.salons.color_code || '#805ad5' }}></div>
                                        {selectedAppt.salons.name}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button onClick={() => setSelectedAppt(null)} className="px-8 py-3 bg-[var(--color-primary)] text-white rounded-xl font-bold shadow-md shadow-[var(--color-primary)]/20 hover:opacity-90 transition-opacity w-full sm:w-auto">Kapat</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Randevu Kartı (AppointmentCard) Bileşeni
// ============================================================
function AppointmentCard({ appt, isToday = false, startTransition, liveTime, onViewClick, pendingSessions = [] }: { appt: any, isToday?: boolean, startTransition: any, liveTime?: Date, onViewClick?: (appt: any) => void, pendingSessions?: any[] }) {
    const customer = appt.customer || {};
    const status: string = appt.status || "scheduled";
    const servicesText = appt.services?.map((s: any) => {
        const name = s.service?.name;
        if (s.session_number && s.session_plans) {
            return `${name} (Seans ${s.session_number}/${s.session_plans.total_sessions})`;
        }
        return name;
    }).filter(Boolean).join(', ') || 'Belirtilmedi';

    const initials = `${customer.first_name?.[0] || ''}${customer.last_name?.[0] || ''}`;

    // Paket ve Ödeme Durumu Hesaplamaları
    const packageService = appt.services?.find((s: any) => s.session_plans);
    let packetBadge = null;
    let paymentBadge = null;
    let nextSessionData: { sessionPlanId: string; serviceId: string; sessionNum: number; totalSessions: number; completedSessions: number; dateStr: string; serviceName: string; duration: number; intervalDays: number; packagePrice: number; paidAmount: number; paymentMode: string } | null = null;

    if (packageService && packageService.session_plans) {
        const plan = packageService.session_plans;
        const total = Number(plan.package_total_price) || 0;
        const paid = Number(plan.paid_amount) || 0;
        const balance = Math.max(0, total - paid);
        const paymentMode = plan.payment_mode || 'prepaid_full';
        
        packetBadge = <span className="px-2.5 py-0.5 bg-purple-100 text-[var(--color-primary)] border border-purple-200 text-[10px] font-extrabold rounded-full flex items-center gap-1 shrink-0 uppercase tracking-widest"><span className="material-symbols-outlined text-[12px]">style</span>Paket • Seans {packageService.session_number}/{plan.total_sessions}</span>;
        
        if (paymentMode === 'prepaid_full') {
            if (balance <= 0 && total > 0) {
                paymentBadge = <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0 uppercase tracking-widest"><span className="material-symbols-outlined text-[12px]">check_circle</span>Ödendi</span>;
            } else if (balance > 0) {
                paymentBadge = <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0 uppercase tracking-widest"><span className="material-symbols-outlined text-[12px]">warning</span>Kalan Var</span>;
            }
        } else {
             paymentBadge = <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-bold rounded-full flex items-center gap-1 shrink-0 uppercase tracking-widest"><span className="material-symbols-outlined text-[12px]">payments</span>Seanslık</span>;
        }

        // Sonraki seans planla — SADECE en son tamamlanan seansta göster ve EĞER gelecekte planlanmış bir randevusu yoksa
        const currentSessionNum = packageService.session_number || 0;
        const hasMoreSessions = currentSessionNum < plan.total_sessions;
        const isLatestCompletedSession = currentSessionNum === (plan.completed_sessions || 0);

        // pendingSessions listesinde bu plan_id varsa, demek ki ileri tarihli randevusu yok, öneri bekliyor!
        const needsPlanning = pendingSessions.some((p: any) => p.id === plan.id);

        if (hasMoreSessions && isLatestCompletedSession && needsPlanning) {
            const intervalDays = plan.recommended_interval_days || 30;
            const apptDateObj = new Date(appt.appointment_date);
            apptDateObj.setDate(apptDateObj.getDate() + intervalDays);
            const y = apptDateObj.getFullYear();
            const m = String(apptDateObj.getMonth() + 1).padStart(2, '0');
            const d = String(apptDateObj.getDate()).padStart(2, '0');
            nextSessionData = {
                sessionPlanId: plan.id,
                serviceId: packageService.service?.id,
                sessionNum: currentSessionNum + 1,
                totalSessions: plan.total_sessions,
                completedSessions: plan.completed_sessions || currentSessionNum,
                dateStr: `${y}-${m}-${d}`,
                serviceName: packageService.service?.name || 'Paket Hizmet',
                duration: packageService.service?.duration_minutes || 60,
                intervalDays,
                packagePrice: Number(plan.package_total_price) || 0,
                paidAmount: Number(plan.paid_amount) || 0,
                paymentMode: plan.payment_mode || 'prepaid_full'
            };
        }
    }

    // Menü State ve Modal State
    const [menuOpen, setMenuOpen] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // EĞER PENDING SESSION İSE (Tavsiye Edilen Gelecek Seans)
    if (appt.is_pending_session) {
        const createLink = `/randevu-olustur?customer_id=${customer.id}&service_id=${appt.services[0].service.id}&date=${appt.appointment_date}&time=10:00`;

        const handleAutoCreate = () => {
            if (!confirm(`Bu önerilen seansı ${formatDateShort(appt.appointment_date)} saat 10:00 için hızlıca oluşturmak istiyor musunuz?`)) return;
            startTransition(async () => {
                const pendingId = appt.id.replace('pending-', '');
                const res = await createAppointment({
                    customer_id: customer.id,
                    appointment_date: appt.appointment_date,
                    appointment_time: "10:00",
                    total_duration_minutes: appt.total_duration_minutes || 30,
                    total_price: 0,
                    services: [
                        {
                            service_id: appt.services[0].service.id,
                            price_at_booking: 0, // Zaten paket içi
                            session_plan_id: pendingId,
                            session_number: appt.services[0].session_number,
                        }
                    ]
                });
                if (res.success) {
                    // Success, it will reload via revalidatePath automatically
                } else {
                    alert("Hata: " + res.error);
                }
            });
        };

        return (
            <div className="bg-purple-50/50 p-5 rounded-3xl border border-purple-200 border-dashed shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 hover:shadow-md transition-all group">
                {/* Saat Alanı (Gizli veya Sembolik) */}
                <div className="text-center w-24 border-r border-purple-100 pr-4 shrink-0 flex flex-col items-center justify-center text-purple-400">
                    <span className="material-symbols-outlined text-3xl mb-1">auto_awesome</span>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-purple-600 mb-0.5">TAVSİYE</p>
                </div>

                {/* Avatar ve Müşteri & Hizmet Bilgisi */}
                <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                    {/* Avatar */}
                    <div className="size-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0 bg-purple-100 text-purple-700">
                        {initials}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-bold text-lg text-slate-900 group-hover:text-purple-700 transition-colors">
                                <CustomerLink id={customer.id} firstName={customer.first_name} lastName={customer.last_name} className="text-inherit hover:text-purple-700 transition-colors" />
                            </h4>
                            <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 text-[10px] font-extrabold rounded-full uppercase tracking-wider">
                                ÖNERİLEN SEANS
                            </span>
                        </div>

                        <div className="flex items-center gap-2.5 mt-2 flex-wrap text-sm">
                            <span className="text-slate-600 font-medium">
                                {servicesText}
                            </span>
                        </div>
                    </div>

                    {/* Aksiyon Butonu */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-purple-100 pt-4 sm:pt-0 mt-2 sm:mt-0">
                        <button onClick={handleAutoCreate} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm shadow-purple-600/20">
                            <span className="material-symbols-outlined text-sm">check_circle</span>
                            Hızlı Oluştur
                        </button>
                        <Link href={createLink} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold rounded-xl text-sm transition-colors shadow-sm">
                            <span className="material-symbols-outlined text-sm">edit_calendar</span>
                            Detaylı Saat
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Dışarı tıklama hook'u (Menüyü kapatmak için)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuOpen]);

    // Status Kontrolleri (Database Status)
    const isNoShow = status === "no_show";
    const isCompleted = status === "completed";
    const isCanceled = status === "canceled";
    const isCheckedIn = status === "checked_in";
    const isScheduled = status === "scheduled";

    // Canlı Zaman Hesaplamaları (Sadece bugün ve Scheduled/Checked-in ise)
    let opsStatus = "normal"; // normal, late, soon, now, noshow_candidate
    let minutesDiff = 0;

    if (isToday && liveTime && (isScheduled || isCheckedIn)) {
        const [hour, min] = formatTime(appt.appointment_time).split(":").map(Number);

        // Randevunun tam tarihi ve saati
        const [y, m, d] = appt.appointment_date.split("-").map(Number);
        const apptDateTime = new Date(y, m - 1, d, hour, min, 0);

        // Şimdiki zaman ile farkı (dakika cinsinden)
        minutesDiff = Math.floor((liveTime.getTime() - apptDateTime.getTime()) / 60000);

        if (minutesDiff > 30 && isScheduled) {
            opsStatus = "noshow_candidate"; // 30 dk geçti hala gelmedi
        } else if (minutesDiff > 0) {
            opsStatus = "late"; // Gecikti (0-30 dk arası)
        } else if (minutesDiff === 0) {
            opsStatus = "now"; // Tam şu an
        } else if (minutesDiff >= -30) {
            opsStatus = "soon"; // Yaklaşıyor (yarım saat kaldı)
        }
    }

    // Action Handlers
    const handleStatusUpdate = async (newStatus: any) => {
        setMenuOpen(false);
        setIsUpdating(true);
        // Doğrudan action'ı await ile çağır; startTransition state uyumsuzluğuna sebep olabiliyor.
        const res = await updateAppointmentStatus(appt.id, newStatus);
        if (!res.success) alert("Hata: " + res.error);
        setIsUpdating(false);
    };

    const handleDelete = async () => {
        setMenuOpen(false);
        if (!confirm("Bu randevuyu kalıcı olarak silmek istediğinize emin misiniz?")) return;
        setIsUpdating(true);
        const res = await deleteAppointment(appt.id);
        if (!res.success) alert("Hata: " + res.error);
        setIsUpdating(false);
    };

    // Card Tasarımı belirtecileri
    let cardBorder = "border-slate-200/60";
    let activeLeftStrip = false;
    let stripColor = "bg-[var(--color-primary)]";

    if (isToday && (isScheduled || isCheckedIn)) {
        if (opsStatus === 'noshow_candidate') {
            cardBorder = "border-rose-300 ring-4 ring-rose-50";
            activeLeftStrip = true;
            stripColor = "bg-rose-500";
        } else if (opsStatus === 'late') {
            cardBorder = "border-amber-300 ring-4 ring-amber-50";
            activeLeftStrip = true;
            stripColor = "bg-amber-500";
        } else if (opsStatus === 'soon' || opsStatus === 'now') {
            cardBorder = "border-[var(--color-primary)]/40 ring-4 ring-[var(--color-primary)]/10";
            activeLeftStrip = true;
            stripColor = "bg-[var(--color-primary)]";
        } else {
            cardBorder = "border-[var(--color-primary)]/20 ring-4 ring-[var(--color-primary)]/5";
            activeLeftStrip = true;
        }
    }

    const opacityClass = (isNoShow || isCanceled) ? "opacity-75 grayscale-[0.3]" : "";

    // Telefon Linki
    const phoneLink = customer.phone ? `tel:${customer.phone.replace(/\s+/g, '')}` : "#";

    return (
        <div className={`bg-white rounded-3xl border ${cardBorder} shadow-sm hover:shadow-md transition-all relative ${menuOpen ? 'z-50' : 'z-10'} ${opacityClass}`}>

            {/* Sol aktiflik şeridi */}
            {activeLeftStrip && <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl ${stripColor}`}></div>}

            {/* ÜST SATIR: Saat + Müşteri + Durum + Menü */}
            <div className={`flex items-center gap-4 p-4 pb-0 ${activeLeftStrip ? 'pl-5' : ''}`}>
                {/* Saat */}
                <div className="text-center shrink-0 w-16">
                    <p className={`text-xl font-extrabold tracking-tight leading-none ${isNoShow ? 'text-rose-500' : isCompleted ? 'text-emerald-600' : isCanceled ? 'text-slate-400' : opsStatus === 'late' || opsStatus === 'noshow_candidate' ? 'text-rose-600' : 'text-[var(--color-primary)]'}`}>
                        {formatTime(appt.appointment_time)}
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{appt.total_duration_minutes} dk</p>
                </div>

                {/* Avatar */}
                <div className={`size-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isNoShow || isCanceled ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700'}`}>
                    {initials}
                </div>

                {/* İsim + Status Badge */}
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                    <h4 className={`font-bold text-base leading-none ${isNoShow || isCanceled ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
                        <CustomerLink id={customer.id} firstName={customer.first_name} lastName={customer.last_name} className="text-inherit hover:text-[var(--color-primary)] transition-colors" />
                    </h4>

                    {/* Status / Ops Badges */}
                    {opsStatus === 'now' && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1"><span className="size-1.5 bg-emerald-500 rounded-full"></span>ŞİMDİ</span>}
                    {opsStatus === 'soon' && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">timer</span>{Math.abs(minutesDiff)} dk</span>}
                    {opsStatus === 'late' && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">warning</span>GECİKTİ ({minutesDiff} dk)</span>}
                    {opsStatus === 'noshow_candidate' && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">error</span>{minutesDiff} DK</span>}
                    {isScheduled && opsStatus === 'normal' && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-full uppercase tracking-wider">BEKLİYOR</span>}
                    {isCheckedIn && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-bold rounded-full uppercase tracking-wider">SALONDA</span>}
                    {isCompleted && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold rounded-full uppercase tracking-wider flex items-center gap-0.5"><span className="material-symbols-outlined text-[10px]">check_circle</span>TAMAMLANDI</span>}
                    {isNoShow && <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-bold rounded-full uppercase tracking-wider">GELMEDİ</span>}
                    {isCanceled && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded-full uppercase tracking-wider">İPTAL</span>}
                </div>

                {/* 3 Nokta Menü (Sağ Üst) */}
                <div className="relative shrink-0" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors ${menuOpen ? 'bg-slate-100 text-slate-700' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 origin-top-right transform animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1.5 flex flex-col">
                                {isScheduled && (
                                    <>
                                        <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-lg text-left" onClick={() => setMenuOpen(false)}>
                                            <span className="material-symbols-outlined text-[18px]">edit</span> Düzenle
                                        </button>
                                        <button onClick={() => handleStatusUpdate('checked_in')} className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary)]/10 rounded-lg text-left">
                                            <span className="material-symbols-outlined text-[18px]">where_to_vote</span> Check-in
                                        </button>
                                        <button onClick={() => handleStatusUpdate('completed')} className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 font-medium hover:bg-emerald-50 rounded-lg text-left">
                                            <span className="material-symbols-outlined text-[18px]">check_circle</span> Tamamlandı
                                        </button>
                                        <button onClick={() => handleStatusUpdate('no_show')} className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 font-medium hover:bg-amber-50 rounded-lg text-left">
                                            <span className="material-symbols-outlined text-[18px]">person_cancel</span> Gelmedi
                                        </button>
                                        <button onClick={() => handleStatusUpdate('canceled')} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 font-medium hover:bg-slate-50 rounded-lg text-left">
                                            <span className="material-symbols-outlined text-[18px]">block</span> İptal Et
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                    </>
                                )}
                                <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 text-sm text-rose-600 font-medium hover:bg-rose-50 rounded-lg text-left">
                                    <span className="material-symbols-outlined text-[18px]">delete</span> Sil
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ALT SATIR: Hizmet Rozetleri + Aksiyonlar */}
            <div className={`flex items-center justify-between gap-3 px-4 py-3 ${activeLeftStrip ? 'pl-5' : ''}`}>
                {/* Sol: Hizmet / Paket / Ödeme Bilgileri */}
                <div className="flex items-center gap-1.5 flex-wrap min-w-0 text-xs">
                    {packetBadge}
                    {paymentBadge}

                    {appt.salons && (
                        <span className="flex items-center gap-1 font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                            <div className="size-2 rounded-full" style={{ backgroundColor: appt.salons.color_code || '#805ad5' }}></div>
                            {appt.salons.name}
                        </span>
                    )}

                    {appt.staff && (
                        <span className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            <span className="material-symbols-outlined text-[14px]">badge</span>
                            {appt.staff.first_name} {appt.staff.last_name}
                        </span>
                    )}

                    <span className="text-slate-400 italic truncate max-w-[200px]">{servicesText}</span>

                    {appt.total_price > 0 && (
                        <>
                            <span className="size-1 bg-slate-200 rounded-full shrink-0"></span>
                            <span className="font-extrabold text-emerald-600">₺{appt.total_price}</span>
                        </>
                    )}
                </div>

                {/* Sağ: Aksiyon Butonları */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Göz İkonu */}
                    {onViewClick && (
                        <button
                            onClick={() => onViewClick(appt)}
                            className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors"
                            title="Detayları Görüntüle"
                        >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                    )}

                    {/* Tamamlandı + Sonraki Seans */}
                    {isCompleted && nextSessionData && (
                        <button
                            onClick={() => setShowPlanModal(true)}
                            className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm hover:opacity-90 transition-all whitespace-nowrap"
                        >
                            <span className="material-symbols-outlined text-[14px]">calendar_add_on</span>
                            {nextSessionData.sessionNum}. Seansı Planla
                        </button>
                    )}

                    {/* Gecikmiş / No Show Adayı */}
                    {isScheduled && (opsStatus === 'late' || opsStatus === 'noshow_candidate') && (
                        <div className="flex items-center gap-1.5">
                            {customer.phone && (
                                <a href={phoneLink} className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg font-bold text-xs transition-colors flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">call</span>
                                    Ara
                                </a>
                            )}
                            <button
                                onClick={() => handleStatusUpdate('no_show')}
                                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 rounded-lg font-bold text-xs transition-all"
                            >
                                Gelmedi
                            </button>
                        </div>
                    )}

                    {/* Normal Scheduled */}
                    {isScheduled && (opsStatus === 'soon' || opsStatus === 'now' || opsStatus === 'normal') && (
                        <button
                            onClick={() => handleStatusUpdate('checked_in')}
                            disabled={isUpdating}
                            className={`px-4 py-1.5 text-white rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${isUpdating ? 'bg-[var(--color-primary)]/70 cursor-wait' : 'bg-[var(--color-primary)] hover:shadow-lg hover:shadow-[var(--color-primary)]/30'}`}
                        >
                            {isUpdating ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> : 'Check-in'}
                        </button>
                    )}

                    {/* Checked In */}
                    {isCheckedIn && (
                        <button
                            onClick={() => handleStatusUpdate('completed')}
                            disabled={isUpdating}
                            className={`px-4 py-1.5 border-2 rounded-lg font-bold text-xs transition-all flex items-center gap-1 ${isUpdating ? 'border-[var(--color-primary)]/70 text-[var(--color-primary)]/70 cursor-wait' : 'bg-white border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white'}`}
                        >
                            {isUpdating ? <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span> : <span className="material-symbols-outlined text-[14px]">done_all</span>}
                            {isUpdating ? 'Bekleniyor...' : 'Tamamla'}
                        </button>
                    )}

                    {/* Pasif durumlar */}
                    {(isNoShow || isCanceled) && customer.phone && (
                        <a href={phoneLink} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-[18px]">call</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Sonraki Seans Modal */}
            {nextSessionData && showPlanModal && (
                <PlanNextSessionModal
                    isOpen={showPlanModal}
                    onClose={() => setShowPlanModal(false)}
                    customerName={`${customer.first_name || ''} ${customer.last_name || ''}`}
                    customerId={customer.id}
                    serviceName={nextSessionData.serviceName}
                    serviceId={nextSessionData.serviceId}
                    sessionPlanId={nextSessionData.sessionPlanId}
                    currentSessionNum={nextSessionData.sessionNum - 1}
                    totalSessions={nextSessionData.totalSessions}
                    completedSessions={nextSessionData.completedSessions}
                    recommendedDate={nextSessionData.dateStr}
                    intervalDays={nextSessionData.intervalDays}
                    duration={nextSessionData.duration}
                    packagePrice={nextSessionData.packagePrice}
                    paidAmount={nextSessionData.paidAmount}
                    paymentMode={nextSessionData.paymentMode}
                    previousStaffId={appt.staff_id || null}
                />
            )}
        </div>
    );
}
