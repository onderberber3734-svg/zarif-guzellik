"use client";

import { useState, useTransition, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { updateAppointmentStatus, deleteAppointment } from "@/app/actions/appointments";
import CustomerLink from "@/components/CustomerLink";

interface RandevularClientProps {
    appointments: any[];
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

export default function RandevularClient({ appointments }: RandevularClientProps) {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Takvim yükleniyor...</div>}>
            <RandevularClientContent appointments={appointments} />
        </Suspense>
    );
}

function RandevularClientContent({ appointments }: RandevularClientProps) {
    const [isPending, startTransition] = useTransition();
    const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

    // Canlı Saat
    const liveTime = useLiveTime();

    // Takvim Offset State (0 = Mevcut hafta, -1 geçen hafta, 1 gelecek hafta)
    const [weekOffset, setWeekOffset] = useState(0);

    // Test İçin Tarih Simülasyonu (URL parametresi: ?date=2026-03-05)
    // Timezone safe olarak (kullanıcının kendi yerel saatine göre gece 12 sınırını aşmasını engeller)
    const searchParams = useSearchParams();
    const paramDate = searchParams.get("date");

    // 1. Dinamik Tarih: Normalde system time, param varsa simüle edilmiş tarih.
    const today = paramDate ? new Date(paramDate) : new Date();
    // 2. UTC Timezone kaymalarını önleyen güvenli String formatı (YYYY-MM-DD)
    const todayStr = getLocalIsoDate(today);

    // Haftalık randevu sayısını hesapla (bugün + 7 gün)
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    const sevenDaysLaterStr = getLocalIsoDate(sevenDaysLater);

    // İlgili Haftanın Verileri (AI Kartı için vs listeye göre)
    const weeklyAppts = appointments.filter(a => a.appointment_date >= todayStr && a.appointment_date <= sevenDaysLaterStr);
    const todayAppts = appointments.filter(a => a.appointment_date === todayStr);

    // Gruplama
    const grouped: { [date: string]: any[] } = {};
    for (const appt of appointments) {
        const k = appt.appointment_date;
        if (!grouped[k]) grouped[k] = [];
        grouped[k].push(appt);
    }

    const sortedDates = Object.keys(grouped).sort();

    // Sadece bugünün randevuları
    const todayAppointments = grouped[todayStr] || [];

    // Gelecekteki Date grupları listesi
    const futureDates = sortedDates.filter(d => d > todayStr);

    // AI Kartı İçin Doluluk Tahmini
    const capacity = 50;
    const fillRate = Math.min(100, Math.round((weeklyAppts.length / capacity) * 100));

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
                        Bugün için <span className="font-bold text-slate-800">{todayAppts.length}</span>,
                        bu hafta için toplam <span className="font-bold text-slate-800">{weeklyAppts.length}</span> randevu görünüyor.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
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
                                                    const servicesText = appt.services?.map((s: any) => s.service?.name).filter(Boolean).join(', ') || 'Belirtilmedi';

                                                    // Geçmişte kalmış ya da no_show/canceled appt ise soluk kutu
                                                    const isInactive = appt.status === "canceled" || appt.status === "no_show";

                                                    // isTodayCol içinde bir de "tam şu an" randevusu ise farklı renklendiriyordu tasarımda, simplifiye edip sadece normal renk skalasına bindirelim:
                                                    const colorScheme = CALENDAR_COLORS[i % CALENDAR_COLORS.length];

                                                    return (
                                                        <div key={appt.id} className={`p-3 ${colorScheme.bg} border ${colorScheme.border} rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isInactive ? 'opacity-50 grayscale' : ''}`}>
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
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                                Bugünkü Randevular
                                <span className="px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm rounded-full font-bold">
                                    {todayAppointments.length}
                                </span>
                            </h3>
                            <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                                <span className="material-symbols-outlined text-lg opacity-70">event</span>
                                {formatDateFull(todayStr)}
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
                                        isToday={true}
                                        startTransition={startTransition}
                                        liveTime={liveTime}
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
                                                            const servicesText = appt.services?.map((s: any) => s.service?.name).filter(Boolean).join(', ') || 'Belirtilmedi';
                                                            return (
                                                                <div key={appt.id} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                                                                    <div className="text-center shrink-0 w-12 bg-slate-50 py-1.5 rounded-lg border border-slate-100 group-hover:bg-white group-hover:border-[var(--color-primary)]/20 transition-colors">
                                                                        <span className="text-[var(--color-primary)] font-bold text-sm block leading-none">{formatTime(appt.appointment_time)}</span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <CustomerLink
                                                                            id={customer.id}
                                                                            firstName={customer.first_name}
                                                                            lastName={customer.last_name}
                                                                            className="text-[15px] font-bold text-slate-900 truncate block"
                                                                        />
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
        </div>
    );
}

// ============================================================
// Randevu Kartı (AppointmentCard) Bileşeni
// ============================================================
function AppointmentCard({ appt, isToday = false, startTransition, liveTime }: { appt: any, isToday?: boolean, startTransition: any, liveTime?: Date }) {
    const customer = appt.customer || {};
    const status: string = appt.status || "scheduled";
    const servicesText = appt.services?.map((s: any) => s.service?.name).filter(Boolean).join(', ') || 'Belirtilmedi';

    // Basit Initials (Avatar Resmi yerine İsim Basharfi)
    const initials = `${customer.first_name?.[0] || ''}${customer.last_name?.[0] || ''}`;

    // Menü State (Hover Yerine)
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
    const handleStatusUpdate = (newStatus: any) => {
        setMenuOpen(false);
        startTransition(async () => {
            const res = await updateAppointmentStatus(appt.id, newStatus);
            if (!res.success) alert("Hata: " + res.error);
        });
    };

    const handleDelete = () => {
        setMenuOpen(false);
        if (!confirm("Bu randevuyu kalıcı olarak silmek istediğinize emin misiniz?")) return;
        startTransition(async () => {
            const res = await deleteAppointment(appt.id);
            if (!res.success) alert("Hata: " + res.error);
        });
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
        <div className={`bg-white p-5 rounded-3xl border ${cardBorder} shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 hover:shadow-md transition-all relative ${menuOpen ? 'z-50' : 'z-10'} ${opacityClass}`}>

            {/* Sol aktiflik şeridi */}
            {activeLeftStrip && <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-3xl ${stripColor}`}></div>}

            {/* Saat Alanı */}
            <div className={`text-center w-24 border-r border-slate-100 pr-4 shrink-0 ${activeLeftStrip ? 'pl-2' : ''}`}>
                <p className={`text-2xl font-extrabold tracking-tight ${isNoShow ? 'text-rose-500' : isCompleted ? 'text-emerald-600' : isCanceled ? 'text-slate-400' : opsStatus === 'late' || opsStatus === 'noshow_candidate' ? 'text-rose-600' : 'text-[var(--color-primary)]'}`}>
                    {formatTime(appt.appointment_time)}
                </p>
                <p className="text-[13px] text-slate-400 font-medium mt-0.5">{appt.total_duration_minutes} dk</p>
            </div>

            {/* Avatar ve Müşteri & Hizmet Bilgisi */}
            <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                {/* Avatar */}
                <div className={`size-14 rounded-full flex items-center justify-center font-bold text-xl shrink-0 ${isNoShow || isCanceled ? 'bg-slate-100 text-slate-400' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700'}`}>
                    {initials}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className={`font-bold text-lg leading-none ${isNoShow || isCanceled ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900 group-hover:text-[var(--color-primary)] transition-colors'}`}>
                            <CustomerLink id={customer.id} firstName={customer.first_name} lastName={customer.last_name} className="text-inherit hover:text-[var(--color-primary)] transition-colors" />
                        </h4>

                        {/* Canlı Operasyon Badgeleri */}
                        {opsStatus === 'now' && <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1"><span className="size-1.5 bg-emerald-500 rounded-full"></span>ŞİMDİ</span>}
                        {opsStatus === 'soon' && <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">timer</span>YAKLAŞIYOR ({Math.abs(minutesDiff)} dk)</span>}
                        {opsStatus === 'late' && <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">warning</span>GECİKTİ ({minutesDiff} dk)</span>}
                        {opsStatus === 'noshow_candidate' && <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">error</span>{minutesDiff} DK GECİKTİ</span>}

                        {/* Status Badges (Sadece normal ve tamamlanmış durumlar için, opsStatus varsa ezilmesin) */}
                        {isScheduled && opsStatus === 'normal' && <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded-full uppercase tracking-wider">BEKLİYOR</span>}
                        {isCheckedIn && <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold rounded-full uppercase tracking-wider">SALONDA</span>}
                        {isNoShow && <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold rounded-full uppercase tracking-wider">GELMEDİ</span>}
                        {isCanceled && <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold rounded-full uppercase tracking-wider">İPTAL EDİLDİ</span>}
                    </div>

                    <div className="flex items-center gap-2.5 mt-2 flex-wrap text-sm">
                        <span className="text-slate-500 italic max-w-xs truncate">{servicesText}</span>
                        <span className="size-1 bg-slate-300 rounded-full shrink-0"></span>
                        <span className="font-extrabold text-emerald-600">₺{appt.total_price}</span>
                    </div>
                </div>
            </div>

            {/* Aksiyon Butonları & 3 Nokta Menü */}
            <div className="flex items-center gap-3 shrink-0 mt-3 sm:mt-0 w-full sm:w-auto justify-end">

                {/* Duruma Göre Ana Butonlar */}
                {isCompleted && (
                    <span className="px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm flex items-center gap-2 border border-emerald-100/50">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        Tamamlandı
                    </span>
                )}

                {/* Gecikmiş / No Show Adayı İçin Öncelikli Aksiyonlar */}
                {isScheduled && (opsStatus === 'late' || opsStatus === 'noshow_candidate') && (
                    <div className="flex items-center gap-2">
                        {customer.phone && (
                            <a href={phoneLink} className="px-4 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">call</span>
                                Ara
                            </a>
                        )}
                        <button
                            onClick={() => handleStatusUpdate('no_show')}
                            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                        >
                            Gelmedi İşaretle
                        </button>
                    </div>
                )}

                {/* Normal Scheduled Actions */}
                {isScheduled && (opsStatus === 'soon' || opsStatus === 'now' || opsStatus === 'normal') && (
                    <button
                        onClick={() => handleStatusUpdate('checked_in')}
                        className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all flex items-center gap-2"
                    >
                        Check-in Yap
                    </button>
                )}

                {isCheckedIn && (
                    <button
                        onClick={() => handleStatusUpdate('completed')}
                        className="px-6 py-2.5 bg-white border-2 border-[var(--color-primary)] text-[var(--color-primary)] shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.1)] rounded-xl font-bold text-sm hover:bg-[var(--color-primary)] hover:text-white transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">done_all</span>
                        İşlemi Tamamla
                    </button>
                )}

                {/* Pasif olan durumlarda sadece ara ikonu (Eğer çoktan gelmedi/iptal ise) */}
                {(isNoShow || isCanceled) && customer.phone && (
                    <a href={phoneLink} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-xl transition-colors shrink-0 flex items-center justify-center border border-transparent">
                        <span className="material-symbols-outlined">call</span>
                    </a>
                )}

                {/* Dropdown Menü (3 Nokta) */}
                <div className="relative shrink-0" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors ${menuOpen ? 'bg-slate-100 text-slate-700' : ''}`}
                    >
                        <span className="material-symbols-outlined">more_vert</span>
                    </button>

                    {/* Tıklama ile açılan menü */}
                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 origin-top-right transform animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1.5 flex flex-col">
                                {isScheduled && (
                                    <>
                                        {/* Düzenle (Şimdilik işlevi yok, modal bağlanacak) */}
                                        <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-lg text-left" onClick={() => setMenuOpen(false)}>
                                            <span className="material-symbols-outlined text-[18px]">edit</span> Düzenle
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate('checked_in')}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary)]/10 rounded-lg text-left"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">where_to_vote</span> Check-in
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate('completed')}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 font-medium hover:bg-emerald-50 rounded-lg text-left"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">check_circle</span> Tamamlandı
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate('no_show')}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-amber-600 font-medium hover:bg-amber-50 rounded-lg text-left"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">person_cancel</span> Gelmedi
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate('canceled')}
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 font-medium hover:bg-slate-50 rounded-lg text-left"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">block</span> İptal Et
                                        </button>
                                        <div className="h-px bg-slate-100 my-1"></div>
                                    </>
                                )}
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-rose-600 font-medium hover:bg-rose-50 rounded-lg text-left"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span> Sil
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
