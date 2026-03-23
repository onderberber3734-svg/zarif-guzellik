"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateSessionPlan } from "@/app/actions/appointments";

interface UpdateSessionPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: any;
    futureAppointmentsCount: number;
    completedAppointmentsCount: number;
    isNewPackage?: boolean;
    appointmentDate?: string; // override baseDate if new package
    onSaveOverride?: (total_sessions: number, interval_days: number) => void;
}

export function UpdateSessionPlanModal({
    isOpen,
    onClose,
    plan,
    futureAppointmentsCount,
    completedAppointmentsCount,
    isNewPackage,
    appointmentDate,
    onSaveOverride
}: UpdateSessionPlanModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [totalSessions, setTotalSessions] = useState(plan?.total_sessions || 8);
    const [intervalDays, setIntervalDays] = useState(plan?.recommended_interval_days || 30);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [dateMode, setDateMode] = useState<'interval' | 'manual'>('interval'); // Kullanıcı hangi modu kullanmak istiyor?
    const [manualDate, setManualDate] = useState<string>(plan?.next_recommended_date || '');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Son tamamlanan randevu tarihi, planın oluşturulma tarihi veya randevu ekranındaki seçili tarih
    const baseDate: Date = useMemo(() => {
        if (isNewPackage && appointmentDate) return new Date(appointmentDate + "T00:00:00");
        if (plan?.base_date) return new Date(plan.base_date + "T00:00:00");
        if (plan?.last_completed_date) return new Date(plan.last_completed_date);
        if (plan?.next_recommended_date) {
            // Geri hesapla: next - interval = base
            const nd = new Date(plan.next_recommended_date);
            nd.setDate(nd.getDate() - (plan?.recommended_interval_days || 30));
            return nd;
        }
        return appointmentDate ? new Date(appointmentDate + "T00:00:00") : new Date();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plan?.id, plan?.base_date, appointmentDate, isNewPackage]);

    // Aralık modunda hesaplanan öneri tarihi
    const computedNextDate: string = useMemo(() => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + Number(intervalDays));
        return d.toISOString().split('T')[0];
    }, [baseDate, intervalDays]);

    // Manuel tarih seçildiğinde interval'ı yeniden hesapla (gösterim amaçlı)
    const computedIntervalFromManual: number = useMemo(() => {
        if (!manualDate) return intervalDays;
        const ms = new Date(manualDate).getTime() - baseDate.getTime();
        return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
    }, [manualDate, baseDate, intervalDays]);

    if (!mounted || !isOpen || !plan) return null;

    const completed = plan.completed_sessions || completedAppointmentsCount;
    const totalReserved = completed + futureAppointmentsCount;

    // Güncel next_recommended_date - moda göre
    const effectiveNextDate = dateMode === 'manual' ? manualDate : computedNextDate;

    const handleIntervalChange = (val: number) => {
        setIntervalDays(val);
        setDateMode('interval');
    };

    const handleManualDateChange = (val: string) => {
        setManualDate(val);
        setDateMode('manual');
        // Aralık alanını güncelle (bağlantılı)
        const ms = new Date(val).getTime() - baseDate.getTime();
        const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
        setIntervalDays(days);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (totalSessions < completed) {
            setErrorMsg(`Toplam seans sayısı, bitirilmiş olan seanslardan (${completed}) daha az olamaz.`);
            return;
        }

        if (intervalDays < 1) {
            setErrorMsg("Seans aralığı en az 1 gün olmalıdır.");
            return;
        }

        if (isNewPackage && onSaveOverride) {
            onSaveOverride(totalSessions, intervalDays);
            onClose();
            return;
        }

        setIsLoading(true);

        const res = await updateSessionPlan(plan.id, {
            total_sessions: totalSessions,
            recommended_interval_days: intervalDays,
            next_recommended_date: effectiveNextDate || undefined
        });

        if (!res.success) {
            setErrorMsg(res.error || "Güncelleme sırasında bir hata oluştu.");
            setIsLoading(false);
            return;
        }

        setIsLoading(false);
        onClose();
    };

    const todayStr = new Date().toISOString().split('T')[0];

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden relative z-[110]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[var(--color-primary)]">tune</span>
                        Paketi Düzenle
                    </h3>
                    <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0 relative z-50">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {/* Uyarılar */}
                    {totalSessions < totalReserved && (
                        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                            <span className="material-symbols-outlined text-amber-500 shrink-0">warning</span>
                            <div className="text-amber-800 text-xs">
                                <p className="font-bold mb-1">Fazlası Olan Randevular</p>
                                <p>Toplam seansı <b>{totalSessions}</b> olarak belirliyorsunuz ancak <b>{futureAppointmentsCount}</b> adet gelecek randevu dahil toplam <b>{totalReserved}</b> randevu atanmış. Gelecekteki bazı randevuları manuel iptal etmeniz gerekebilir.</p>
                            </div>
                        </div>
                    )}

                    {errorMsg && (
                        <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
                            <span className="material-symbols-outlined text-rose-500">error</span>
                            <p className="text-rose-700 font-medium text-xs font-bold">{errorMsg}</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        {/* Toplam Seans */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                            <label className="text-sm font-bold text-slate-700 mb-2 flex justify-between">
                                <span>Toplam Seans Sayısı</span>
                                <span className="text-slate-400 text-xs font-medium">Biten: {completed}</span>
                            </label>
                            <input
                                type="number"
                                min={completed}
                                value={totalSessions}
                                onChange={(e) => setTotalSessions(Number(e.target.value))}
                                className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all font-bold text-slate-800"
                                required
                            />
                        </div>

                        {/* Seans Aralığı */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Seans Aralığı (Gün)</label>
                            <input
                                type="number"
                                min={1}
                                value={intervalDays}
                                onChange={(e) => handleIntervalChange(Number(e.target.value))}
                                className="w-full bg-white border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all font-bold text-slate-800"
                                required
                            />
                        </div>

                        {/* Sonraki Seans Tarihi - Canlı Önizleme + Manuel Mod */}
                        <div className={`p-4 rounded-2xl border-2 transition-colors ${dateMode === 'manual' ? 'border-[var(--color-primary)] bg-purple-50/50' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-[var(--color-primary)]">calendar_clock</span>
                                    Sonraki Seans Tarihi
                                </label>
                                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 text-[11px] font-bold">
                                    <button
                                        type="button"
                                        onClick={() => setDateMode('interval')}
                                        className={`px-2 py-1 rounded-md transition-colors ${dateMode === 'interval' ? 'bg-[var(--color-primary)] text-white' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Otomatik
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateMode('manual')}
                                        className={`px-2 py-1 rounded-md transition-colors ${dateMode === 'manual' ? 'bg-[var(--color-primary)] text-white' : 'text-slate-500 hover:text-slate-800'}`}
                                    >
                                        Manuel
                                    </button>
                                </div>
                            </div>

                            {dateMode === 'interval' ? (
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-white border border-purple-200 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">event</span>
                                        <div>
                                            <p className="font-extrabold text-slate-900 text-base">
                                                {new Date(computedNextDate + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-medium">Son seanstan {intervalDays} gün sonra</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setManualDate(computedNextDate); setDateMode('manual'); }}
                                        className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
                                        title="Bu tarihi düzenle"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="date"
                                        value={manualDate}
                                        min={todayStr}
                                        onChange={(e) => handleManualDateChange(e.target.value)}
                                        className="w-full bg-white border border-purple-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all font-bold text-slate-800"
                                    />
                                    {manualDate && (
                                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[13px] text-emerald-500">check_circle</span>
                                            Seans aralığı bu tarihe göre <b className="text-slate-700">{computedIntervalFromManual} güne</b> güncellenecek
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Mevcut next_recommended_date gösterimi */}
                        {plan.next_recommended_date && (
                            <p className="text-[11px] text-slate-400 pl-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">history</span>
                                Mevcut kayıtlı: {new Date(plan.next_recommended_date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        )}
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex justify-center items-center gap-2"
                        >
                            {isLoading ? (
                                <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                    Değişiklikleri Kaydet
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
