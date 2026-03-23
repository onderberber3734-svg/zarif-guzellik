"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { createPortal } from "react-dom";
import { createAppointment, getAppointments } from "@/app/actions/appointments";
import { getWorkingHours } from "@/app/actions/workingHours";
import { getSalons } from "@/app/actions/salons";
import { getEligibleStaffForService } from "@/app/actions/staff";

interface PlanNextSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerName: string;
    customerId: string;
    serviceName: string;
    serviceId: string;
    sessionPlanId: string;
    currentSessionNum: number;
    totalSessions: number;
    completedSessions: number;
    recommendedDate: string; // YYYY-MM-DD
    intervalDays: number;
    duration: number;
    packagePrice?: number;
    paidAmount?: number;
    paymentMode?: string;
    previousStaffId?: string | null;
}

type SlotInfo = { time: string; disabled: boolean; reason?: string };

export function PlanNextSessionModal({
    isOpen,
    onClose,
    customerName,
    customerId,
    serviceName,
    serviceId,
    sessionPlanId,
    currentSessionNum,
    totalSessions,
    completedSessions,
    recommendedDate,
    intervalDays,
    duration,
    packagePrice = 0,
    paidAmount = 0,
    paymentMode = "prepaid_full",
    previousStaffId = null,
}: PlanNextSessionModalProps) {
    const [selectedDate, setSelectedDate] = useState(recommendedDate);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(previousStaffId);
    const [isStaffLoading, setIsStaffLoading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Dinamik veriler
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [workingHours, setWorkingHours] = useState<any[]>([]);
    const [salons, setSalons] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Verileri çek
    useEffect(() => {
        if (!isOpen) return;
        setIsLoading(true);
        Promise.all([
            getAppointments(),
            getWorkingHours(),
            getSalons(),
        ]).then(([appts, whRes, salonsData]) => {
            setAllAppointments(appts || []);
            setWorkingHours(whRes.data || []);
            setSalons(salonsData || []);
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, [isOpen]);

    // ——— Zaman Yardımcıları (hook değil, normal fonksiyon) ———
    const timeToMinutes = (timeStr: string) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const minutesToTime = (mins: number) => {
        return `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;
    };

    // ——— Seçili güne ait hesaplamalar ———
    const selectedDateObj = new Date(selectedDate + "T00:00:00");
    const dayOfWeek = selectedDateObj.getDay();
    const dayWorkingHours = workingHours.find((h: any) => h.day_of_week === dayOfWeek) || {};
    const isClosed = (dayWorkingHours.is_closed ?? false) as boolean;
    const startMins = isClosed ? 0 : timeToMinutes(dayWorkingHours.start_time || "09:00:00");
    const endMins = isClosed ? 0 : timeToMinutes(dayWorkingHours.end_time || "19:00:00");
    const breakStartMins = dayWorkingHours.break_start ? timeToMinutes(dayWorkingHours.break_start) : null;
    const breakEndMins = dayWorkingHours.break_end ? timeToMinutes(dayWorkingHours.break_end) : null;

    // O günkü randevular
    const appointmentsOnDate = allAppointments.filter(
        (a: any) => a.appointment_date === selectedDate && a.status !== 'canceled'
    );

    const totalAppointmentsOnDate = appointmentsOnDate.length;

    // Uygun salonlar
    const validSalons = salons.filter((s: any) => {
        if (!s.is_active) return false;
        const supportedIds = s.salon_services?.map((ss: any) => ss.service_id) || [];
        return supportedIds.includes(serviceId) || supportedIds.length === 0;
    });

    // ——— Saat Slotları — useMemo (hook, early return'den ÖNCE) ———
    const availableSlots: SlotInfo[] = useMemo(() => {
        if (isClosed || isLoading) return [];
        const slots: SlotInfo[] = [];

        for (let m = startMins; m < endMins; m += 30) {
            const timeStr = minutesToTime(m);
            const slotStart = m;
            const slotEnd = slotStart + (duration || 30);

            if (slotEnd > endMins) continue;

            let disabled = false;
            let reason = "";

            if (breakStartMins !== null && breakEndMins !== null) {
                if (slotStart < breakEndMins && slotEnd > breakStartMins) {
                    disabled = true;
                    reason = "Mola saati";
                }
            }

            if (!disabled && validSalons.length > 0) {
                const occupiedSalonIds = appointmentsOnDate
                    .filter((appt: any) => {
                        const apptStart = timeToMinutes(appt.appointment_time);
                        const apptEnd = apptStart + (appt.total_duration_minutes || 0);
                        return Math.max(slotStart, apptStart) < Math.min(slotEnd, apptEnd);
                    })
                    .map((appt: any) => appt.salon_id)
                    .filter(Boolean);

                const allSalonsBusy = validSalons.every((salon: any) => occupiedSalonIds.includes(salon.id));
                if (allSalonsBusy) {
                    disabled = true;
                    reason = "Tüm salonlar dolu";
                }
            } else if (!disabled && validSalons.length === 0) {
                disabled = true;
                reason = "Uygun salon yok";
            }

            slots.push({ time: timeStr, disabled, reason });
        }
        return slots;
    }, [selectedDate, allAppointments, workingHours, salons, isLoading, duration, isClosed, startMins, endMins, breakStartMins, breakEndMins, validSalons.length, appointmentsOnDate]);

    // İlk uygun saati otomatik seç (hook, early return'den ÖNCE)
    useEffect(() => {
        if (availableSlots.length > 0 && !selectedTime) {
            const firstAvailable = availableSlots.find(s => !s.disabled);
            if (firstAvailable) setSelectedTime(firstAvailable.time);
        }
    }, [availableSlots]);

    // Tarih değiştiğinde saat sıfırla (hook, early return'den ÖNCE)
    useEffect(() => {
        setSelectedTime(null);
    }, [selectedDate]);

    // Personel listesini çek (tarih ve saat seçildiğinde)
    useEffect(() => {
        if (!selectedDate || !selectedTime || !serviceId) return;
        setIsStaffLoading(true);
        getEligibleStaffForService({
            serviceIds: [serviceId],
            appointmentDate: selectedDate,
            appointmentTime: selectedTime,
            totalDurationMinutes: duration || 30,
        }).then(res => {
            if (res.success) {
                setStaffList(res.data || []);
                // Eğer daha önce seçilen personel hala uygunsa kalsın
                const prevStillEligible = (res.data || []).find((s: any) => s.id === selectedStaffId && s.isEligible);
                if (!prevStillEligible) {
                    // Önceki personeli ara, yoksa ilk uygun personeli seç
                    const prevStaff = (res.data || []).find((s: any) => s.id === previousStaffId && s.isEligible);
                    if (prevStaff) {
                        setSelectedStaffId(prevStaff.id);
                    } else {
                        const firstEligible = (res.data || []).find((s: any) => s.isEligible);
                        setSelectedStaffId(firstEligible?.id || null);
                    }
                }
            }
            setIsStaffLoading(false);
        });
    }, [selectedDate, selectedTime, serviceId]);

    // ——— Şimdi early return'ler güvenle yapılabilir ———
    if (!mounted || !isOpen) return null;

    // Gün adı
    const dayNames = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

    // Basit türetilmiş değerler (hook değil, early return'den sonra güvenle kullanılabilir)
    const nextSessionNum = currentSessionNum + 1;
    const balance = Math.max(0, packagePrice - paidAmount);
    const progressPercent = Math.min(100, (completedSessions / totalSessions) * 100);
    const isRecommendedDate = selectedDate === recommendedDate;
    const enabledCount = availableSlots.filter(s => !s.disabled).length;

    const handleCreate = () => {
        if (!selectedTime) {
            alert("Lütfen bir saat seçiniz.");
            return;
        }
        startTransition(async () => {
            const res = await createAppointment({
                customer_id: customerId,
                staff_id: selectedStaffId,
                appointment_date: selectedDate,
                appointment_time: selectedTime,
                total_duration_minutes: duration,
                total_price: 0,
                services: [{
                    service_id: serviceId,
                    price_at_booking: 0,
                    session_plan_id: sessionPlanId,
                    session_number: nextSessionNum,
                }],
            });
            if (res.success) {
                onClose();
            } else {
                alert("Hata: " + res.error);
            }
        });
    };

    const formatDisplayDate = (dateStr: string) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    };

    const endTimeStr = selectedTime
        ? minutesToTime(timeToMinutes(selectedTime) + duration)
        : "";

    return createPortal(
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9998] animate-in fade-in duration-200" onClick={onClose} />

            {/* Modal */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] animate-in zoom-in-95 fade-in duration-300 overflow-hidden flex flex-col pointer-events-auto" onClick={e => e.stopPropagation()}>
                    {/* inner content stays the same - just the wrapper changes */}

                    {/* Header */}
                    <div className="bg-gradient-to-r from-[var(--color-primary)] to-purple-600 p-5 text-white relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                        <div className="relative flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="material-symbols-outlined text-white/80 text-[20px]">calendar_add_on</span>
                                    <h3 className="text-base font-bold">{nextSessionNum}. Seansı Planla</h3>
                                </div>
                                <p className="text-white/70 text-xs font-medium">{serviceName}</p>
                            </div>
                            <button onClick={onClose} className="size-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white/80 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">

                        {/* Müşteri & İlerleme */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-bold text-xs text-slate-700">
                                        {customerName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">{customerName}</p>
                                        <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[11px] text-[var(--color-primary)]">style</span>
                                            {serviceName}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-slate-800 leading-none">
                                        {completedSessions}<span className="text-slate-400 font-medium text-xs">/{totalSessions}</span>
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Seans</p>
                                </div>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                            </div>
                            {packagePrice > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                    {balance <= 0 ? (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-bold rounded-md flex items-center gap-0.5">
                                            <span className="material-symbols-outlined text-[10px]">check_circle</span>Ödendi
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-bold rounded-md flex items-center gap-0.5">
                                            <span className="material-symbols-outlined text-[10px]">warning</span>Kalan: ₺{balance.toLocaleString("tr-TR")}
                                        </span>
                                    )}
                                    <span className="text-[9px] text-slate-400">Toplam: ₺{packagePrice.toLocaleString("tr-TR")}</span>
                                </div>
                            )}
                        </div>

                        {/* Tarih Seçimi */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-[var(--color-primary)]">event</span>
                                Randevu Tarihi
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] outline-none transition-all"
                            />
                            <div className="flex items-center justify-between mt-1">
                                {isRecommendedDate ? (
                                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                                        <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                                        Önerilen tarih ({intervalDays} gün aralık)
                                    </p>
                                ) : (
                                    <button onClick={() => setSelectedDate(recommendedDate)} className="text-[10px] text-[var(--color-primary)] font-bold flex items-center gap-0.5 hover:underline">
                                        <span className="material-symbols-outlined text-[12px]">undo</span>
                                        Önerilen tarihe dön
                                    </button>
                                )}
                                {isClosed && (
                                    <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5 bg-rose-50 px-2 py-0.5 rounded">
                                        <span className="material-symbols-outlined text-[12px]">block</span>Kapalı gün
                                    </span>
                                )}
                                {!isClosed && (
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {dayNames[dayOfWeek]} • {dayWorkingHours.start_time?.slice(0, 5) || "09:00"} - {dayWorkingHours.end_time?.slice(0, 5) || "19:00"}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* O gündeki randevu yoğunluğu */}
                        {!isLoading && !isClosed && (
                            <div className="flex items-center gap-3 text-[10px]">
                                <div className="flex items-center gap-1 text-slate-500 font-medium">
                                    <span className="material-symbols-outlined text-[14px]">event_note</span>
                                    O gün: <b className="text-slate-700">{totalAppointmentsOnDate}</b> randevu
                                </div>
                                <div className="flex items-center gap-1 text-slate-500 font-medium">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    <b className={enabledCount > 0 ? "text-emerald-600" : "text-rose-600"}>{enabledCount}</b> müsait slot
                                </div>
                                <div className="flex items-center gap-1 text-slate-500 font-medium">
                                    <span className="material-symbols-outlined text-[14px]">chair</span>
                                    {validSalons.length} salon
                                </div>
                            </div>
                        )}

                        {/* Saat Seçimi */}
                        <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-[var(--color-primary)]">schedule</span>
                                Randevu Saati
                                <span className="text-slate-400 font-normal normal-case tracking-normal ml-1">({duration} dk)</span>
                            </label>

                            {isLoading ? (
                                <div className="py-6 flex items-center justify-center gap-2 text-slate-400">
                                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                    <span className="text-xs font-medium">Müsaitlik kontrol ediliyor...</span>
                                </div>
                            ) : isClosed ? (
                                <div className="py-4 bg-rose-50 rounded-xl text-center">
                                    <span className="material-symbols-outlined text-rose-400 text-3xl">event_busy</span>
                                    <p className="text-xs text-rose-600 font-bold mt-1">Bu gün kapalı</p>
                                    <p className="text-[10px] text-rose-400 mt-0.5">Lütfen başka bir tarih seçiniz.</p>
                                </div>
                            ) : availableSlots.length === 0 ? (
                                <div className="py-4 bg-slate-50 rounded-xl text-center">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">schedule</span>
                                    <p className="text-xs text-slate-600 font-bold mt-1">Uygun saat bulunamadı</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-5 gap-1.5">
                                    {availableSlots.map(slot => (
                                        <button
                                            key={slot.time}
                                            onClick={() => !slot.disabled && setSelectedTime(slot.time)}
                                            disabled={slot.disabled}
                                            title={slot.disabled ? slot.reason : `${slot.time} - ${minutesToTime(timeToMinutes(slot.time) + duration)}`}
                                            className={`py-2 rounded-lg text-xs font-bold transition-all relative ${
                                                slot.disabled
                                                    ? "bg-slate-100 text-slate-300 cursor-not-allowed line-through"
                                                    : selectedTime === slot.time
                                                        ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20 ring-2 ring-[var(--color-primary)]/30"
                                                        : "bg-slate-50 text-slate-600 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-slate-100"
                                            }`}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Personel Seçimi */}
                        {selectedTime && (
                            <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 block flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px] text-[var(--color-primary)]">person</span>
                                    Personel
                                </label>
                                {isStaffLoading ? (
                                    <div className="py-3 flex items-center justify-center gap-2 text-slate-400">
                                        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                        <span className="text-xs font-medium">Personeller kontrol ediliyor...</span>
                                    </div>
                                ) : staffList.length === 0 ? (
                                    <div className="py-3 bg-amber-50 rounded-xl text-center border border-amber-100">
                                        <p className="text-xs text-amber-600 font-bold">Uygun personel bulunamadı</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {staffList.filter((s: any) => s.isEligible).map((staff: any) => (
                                            <button
                                                key={staff.id}
                                                onClick={() => setSelectedStaffId(staff.id)}
                                                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                                    selectedStaffId === staff.id
                                                        ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20 ring-2 ring-[var(--color-primary)]/30'
                                                        : 'bg-slate-50 text-slate-700 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] border border-slate-200'
                                                }`}
                                            >
                                                <span className={`size-7 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                                                    selectedStaffId === staff.id
                                                        ? 'bg-white/30 text-white'
                                                        : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                                }`}>
                                                    {staff.first_name?.[0]}{staff.last_name?.[0]}
                                                </span>
                                                <span className="truncate">{staff.first_name} {staff.last_name}</span>
                                                {staff.id === previousStaffId && (
                                                    <span className={`ml-auto text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 font-extrabold ${
                                                        selectedStaffId === staff.id
                                                            ? 'bg-white/25 text-white'
                                                            : 'bg-purple-100 text-[var(--color-primary)]'
                                                    }`}>Önceki</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Randevu Özeti */}
                        {selectedTime && (
                            <div className="bg-purple-50/60 rounded-2xl p-3.5 border border-purple-100">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Randevu Özeti</p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                    <div className="flex items-center gap-1 font-bold text-slate-800">
                                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">event</span>
                                        {formatDisplayDate(selectedDate)}
                                    </div>
                                    <div className="flex items-center gap-1 font-bold text-slate-800">
                                        <span className="material-symbols-outlined text-[15px] text-[var(--color-primary)]">schedule</span>
                                        {selectedTime} — {endTimeStr}
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    {serviceName} — {nextSessionNum}. Seans / {totalSessions} • {duration} dk
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-4 border-t border-slate-100 flex items-center gap-3 shrink-0 bg-white">
                        <button onClick={onClose} disabled={isPending} className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                            İptal
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={isPending || !selectedTime || isClosed}
                            className="flex-[2] px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isPending ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                                    Oluşturuluyor...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                    Randevuyu Oluştur
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    , document.body);
}
