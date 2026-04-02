"use client";

import { useState } from "react";
import { upsertWorkingHours, WorkingHour } from "@/app/actions/workingHours";

const DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

const toMinutes = (timeStr: string | null) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

export default function CalismaSaatleriAyarlari({ initialHours }: { initialHours: WorkingHour[] }) {
    // Backend verisini Pazartesi'den başlayacak şekilde hizala (Onboarding'tekiyle aynı)
    const sorted = [...initialHours].sort((a, b) => a.day_of_week - b.day_of_week);
    const reordered = [
        ...sorted.slice(1, 7), // Mon-Sat
        sorted[0]              // Sun
    ];

    const [hours, setHours] = useState<WorkingHour[]>(reordered);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState("");

    const handleChange = (index: number, field: keyof WorkingHour, value: any) => {
        setSaveError(null);
        setSuccessMessage("");
        setHours(prev => {
            const newHours = [...prev];
            newHours[index] = { ...newHours[index], [field]: value };

            if (field === 'is_closed' && value === false) {
                if (!newHours[index].start_time) newHours[index].start_time = "09:00:00";
                if (!newHours[index].end_time) newHours[index].end_time = "19:00:00";
            }
            if (field === 'is_closed' && value === true) {
                newHours[index].break_start = null;
                newHours[index].break_end = null;
            }

            return newHours;
        });
    };

    const toggleBreak = (index: number, hasBreak: boolean) => {
        setSaveError(null);
        setSuccessMessage("");
        setHours(prev => {
            const newHours = [...prev];
            if (hasBreak) {
                newHours[index].break_start = "12:00:00";
                newHours[index].break_end = "13:00:00";
            } else {
                newHours[index].break_start = null;
                newHours[index].break_end = null;
            }
            return newHours;
        });
    };

    const validateHours = () => {
        for (const day of hours) {
            if (day.is_closed) continue;

            const dayName = DAYS[day.day_of_week];

            if (!day.start_time || !day.end_time) {
                setSaveError(`${dayName} günü için saat seçimi zorunludur.`);
                return false;
            }

            const startMins = toMinutes(day.start_time);
            const endMins = toMinutes(day.end_time);

            if (startMins >= endMins) {
                setSaveError(`${dayName} günü için: Bitiş saati, başlangıç saatinden sonra olmalıdır.`);
                return false;
            }

            if (day.break_start || day.break_end) {
                if (!day.break_start || !day.break_end) {
                    setSaveError(`${dayName} günü için öğle arası saatleri eksik.`);
                    return false;
                }

                const bStartMins = toMinutes(day.break_start);
                const bEndMins = toMinutes(day.break_end);

                if (bStartMins >= bEndMins) {
                    setSaveError(`${dayName} günü için: Mola bitiş saati, başlangıcından sonra olmalıdır.`);
                    return false;
                }

                if (bStartMins < startMins || bEndMins > endMins) {
                    setSaveError(`${dayName} günü için: Mola zamanı, mesai saatleri içerisinde olmalıdır.`);
                    return false;
                }
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateHours()) return;

        setIsSaving(true);
        setSuccessMessage("");

        const payload = [...hours].sort((a, b) => a.day_of_week - b.day_of_week);
        const result = await upsertWorkingHours(payload);

        setIsSaving(false);

        if (result.success) {
            setSuccessMessage("Çalışma saatleriniz sistemi etkileyecek şekilde güncellendi.");
            setTimeout(() => setSuccessMessage(""), 4000);
        } else {
            setSaveError("Kaydedilirken bir hata oluştu: " + result.error);
        }
    };

    return (
        <div className="p-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Çalışma Saatleri</h3>
                    <p className="text-slate-500 font-medium max-w-lg">
                        Müşterilerinizin AI üzerinden ve linklerinizden hangi saat aralığında randevu alabileceğini belirler.
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl border border-amber-100 text-xs font-bold shadow-sm">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Sistemi Anında Etkiler
                </div>
            </div>

            {saveError && (
                <div className="mb-6 bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 flex items-center gap-3 animate-in fade-in">
                    <span className="material-symbols-outlined shrink-0 text-rose-500">error</span>
                    <span className="text-sm font-bold">{saveError}</span>
                </div>
            )}

            {successMessage && (
                <div className="mb-6 bg-[var(--color-primary)]/10 text-[var(--color-primary)] p-4 rounded-xl border border-[var(--color-primary)]/20 flex items-center gap-3 animate-in fade-in">
                    <span className="material-symbols-outlined shrink-0">check_circle</span>
                    <span className="text-sm font-bold">{successMessage}</span>
                </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100 mb-8 max-w-4xl">
                {hours.map((day, idx) => (
                    <div key={day.day_of_week} className={`p-4 sm:p-5 transition-colors ${day.is_closed ? 'bg-slate-50/50' : 'bg-white'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                            {/* Day & Toggle */}
                            <div className="flex items-center gap-4 w-40 shrink-0">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={!day.is_closed}
                                        onChange={(e) => handleChange(idx, 'is_closed', !e.target.checked)}
                                    />
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                                </label>
                                <span className={`font-bold text-sm ${day.is_closed ? 'text-slate-400' : 'text-slate-800'}`}>
                                    {DAYS[day.day_of_week]}
                                </span>
                            </div>

                            {/* Time Controls */}
                            {!day.is_closed ? (
                                <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="time"
                                            value={day.start_time ? day.start_time.substring(0, 5) : ""}
                                            onChange={(e) => handleChange(idx, 'start_time', e.target.value + ":00")}
                                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition-all w-[100px] text-center"
                                        />
                                        <span className="text-slate-400 font-bold">-</span>
                                        <input
                                            type="time"
                                            value={day.end_time ? day.end_time.substring(0, 5) : ""}
                                            onChange={(e) => handleChange(idx, 'end_time', e.target.value + ":00")}
                                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 text-sm focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] outline-none transition-all w-[100px] text-center"
                                        />
                                    </div>

                                    <div className="h-6 w-px bg-slate-200 hidden xl:block"></div>

                                    {/* Break Controls */}
                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={!!day.break_start}
                                                onChange={(e) => toggleBreak(idx, e.target.checked)}
                                                className="rounded text-[var(--color-primary)] focus:ring-[var(--color-primary)] size-4 border-slate-300 cursor-pointer"
                                            />
                                            <span className="text-[13px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors whitespace-nowrap">Öğle Arası</span>
                                        </label>

                                        {day.break_start && (
                                            <div className="flex items-center gap-1.5 animate-in slide-in-from-left-2 duration-200">
                                                <input
                                                    type="time"
                                                    value={day.break_start ? day.break_start.substring(0, 5) : ""}
                                                    onChange={(e) => handleChange(idx, 'break_start', e.target.value + ":00")}
                                                    className="px-2 py-1.5 bg-orange-50 border border-orange-200 rounded-lg font-bold text-orange-700 text-xs focus:ring-2 focus:ring-orange-500/20 outline-none w-[80px] text-center"
                                                />
                                                <span className="text-orange-300 font-bold">-</span>
                                                <input
                                                    type="time"
                                                    value={day.break_end ? day.break_end.substring(0, 5) : ""}
                                                    onChange={(e) => handleChange(idx, 'break_end', e.target.value + ":00")}
                                                    className="px-2 py-1.5 bg-orange-50 border border-orange-200 rounded-lg font-bold text-orange-700 text-xs focus:ring-2 focus:ring-orange-500/20 outline-none w-[80px] text-center"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex justify-end">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                        Kapalı
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-2">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[var(--color-primary)] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? "Değişiklikler Uygulanıyor..." : "Değişiklikleri Kaydet"}
                    <span className={`material-symbols-outlined ${isSaving ? 'animate-spin' : ''}`}>
                        {isSaving ? 'progress_activity' : 'published_with_changes'}
                    </span>
                </button>
            </div>
        </div>
    );
}
