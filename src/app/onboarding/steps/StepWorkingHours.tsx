import { useState, useEffect } from "react";
import { getWorkingHours, upsertWorkingHours, WorkingHour } from "@/app/actions/workingHours";

const DAYS = [
    "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"
];

// Helper to calculate total minutes from "HH:MM:SS"
const toMinutes = (timeStr: string | null) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

export default function StepWorkingHours({ onNext, onBack, isPending }: any) {
    const [hours, setHours] = useState<WorkingHour[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        getWorkingHours().then(res => {
            if (res.success && res.data) {
                // Backend returns sorted 0-6 or we sort it just in case
                const sorted = [...res.data].sort((a, b) => a.day_of_week - b.day_of_week);

                // Rearrange array to start from Monday (1) to Sunday (0) for UI display
                const reordered = [
                    ...sorted.slice(1, 7), // Mon-Sat
                    sorted[0]              // Sun
                ];
                setHours(reordered);
            }
            setIsLoading(false);
        });
    }, []);

    const handleChange = (index: number, field: keyof WorkingHour, value: any) => {
        setSaveError(null);
        setHours(prev => {
            const newHours = [...prev];
            newHours[index] = { ...newHours[index], [field]: value };

            // If toggling closed to open, set default times if none exist
            if (field === 'is_closed' && value === false) {
                if (!newHours[index].start_time) newHours[index].start_time = "09:00:00";
                if (!newHours[index].end_time) newHours[index].end_time = "19:00:00";
            }

            // If toggling open to closed, clean up break times
            if (field === 'is_closed' && value === true) {
                newHours[index].break_start = null;
                newHours[index].break_end = null;
            }

            return newHours;
        });
    };

    const toggleBreak = (index: number, hasBreak: boolean) => {
        setSaveError(null);
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

    // Quick Actions
    const setWeekendClosed = () => {
        setSaveError(null);
        setHours(prev => {
            const newHours = [...prev];
            // Sat is 5, Sun is 6
            newHours[5] = { ...newHours[5], is_closed: true, break_start: null, break_end: null };
            newHours[6] = { ...newHours[6], is_closed: true, break_start: null, break_end: null };
            return newHours;
        });
    };

    const setWeekendOpen = () => {
        setSaveError(null);
        setHours(prev => {
            const newHours = [...prev];
            const referenceDay = newHours[0]; // Pazartesi
            const defaultStart = referenceDay.start_time || "09:00:00";
            const defaultEnd = referenceDay.end_time || "19:00:00";

            newHours[5] = { ...newHours[5], is_closed: false, start_time: defaultStart, end_time: defaultEnd };
            newHours[6] = { ...newHours[6], is_closed: false, start_time: defaultStart, end_time: defaultEnd };
            return newHours;
        });
    };

    const setAllWeekOpen = () => {
        setSaveError(null);
        setHours(prev => {
            const newHours = [...prev];
            const referenceDay = newHours[0]; // Pazartesi
            const defaultStart = referenceDay.start_time || "09:00:00";
            const defaultEnd = referenceDay.end_time || "19:00:00";

            return newHours.map(day => ({
                ...day,
                is_closed: false,
                start_time: day.start_time || defaultStart,
                end_time: day.end_time || defaultEnd
            }));
        });
    };

    const validateHours = () => {
        for (const day of hours) {
            if (day.is_closed) continue;

            const dayName = DAYS[day.day_of_week];

            if (!day.start_time || !day.end_time) {
                setSaveError(`${dayName} günü için başlangıç ve bitiş saatleri zorunludur.`);
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
                    setSaveError(`${dayName} günü için öğle arası başlangıç ve bitiş saatleri zorunludur.`);
                    return false;
                }

                const bStartMins = toMinutes(day.break_start);
                const bEndMins = toMinutes(day.break_end);

                if (bStartMins >= bEndMins) {
                    setSaveError(`${dayName} günü için: Mola bitiş saati, mola başlangıcından sonra olmalıdır.`);
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

        setIsLoading(true);
        // Prepare array back to 0-6 order before saving just to be safe, though not strictly required if bulk upsert uses day_of_week
        const payload = [...hours].sort((a, b) => a.day_of_week - b.day_of_week);

        const result = await upsertWorkingHours(payload);
        setIsLoading(false);

        if (result.success) {
            onNext(5); // Progress to next step (adjust index based on where this fits in OnboardingClient)
        } else {
            setSaveError("Kaydedilirken bir hata oluştu: " + result.error);
        }
    };

    if (isLoading && hours.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background-light">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
                    <p className="text-slate-500 font-medium">Saatler Yükleniyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-light min-h-screen flex flex-col items-center p-6 text-slate-900 relative">

            {/* Top Navigation Bar matching design */}
            <nav className="fixed top-0 left-0 w-full h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-2xl">update</span>
                    </div>
                    <h1 className="serif-heading text-xl font-bold text-primary">Zarif Güzellik</h1>
                </div>
                <div className="flex items-center gap-4 hidden sm:flex">
                    <span className="text-sm font-medium text-slate-500">Adım 4 / 8</span>
                    <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="w-[66%] h-full bg-primary rounded-full transition-all duration-500"></div>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-5xl px-0 sm:px-6 py-12 mt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Section */}
                <div className="mb-10 text-center sm:text-left">
                    <h2 className="serif-heading text-3xl font-bold mb-3">Çalışma Saatleri</h2>
                    <p className="text-slate-500 font-medium max-w-2xl">
                        Müşterilerinizin hangi saatler arasında randevu alabileceğini belirleyin.
                        Randevu sistemi, AI asistanınız ve takvim entegrasyonlarınız bu kurala göre çalışacak.
                    </p>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Left: Quick Actions */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-28">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Hızlı İşlemler</h3>

                            <div className="space-y-3">
                                <button
                                    onClick={setWeekendClosed}
                                    className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 transition-all group flex flex-col gap-1"
                                >
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-rose-600 transition-colors">Hafta Sonu Kapalı</span>
                                    <span className="text-[11px] font-medium text-slate-500">Cumartesi ve Pazar'ı kapalı işaretler.</span>
                                </button>

                                <button
                                    onClick={setWeekendOpen}
                                    className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-primary/5 hover:border-primary/30 transition-all group flex flex-col gap-1"
                                >
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">Hafta Sonu Açık</span>
                                    <span className="text-[11px] font-medium text-slate-500">Cumartesi ve Pazar'ı pazartesiye göre açar.</span>
                                </button>

                                <button
                                    onClick={setAllWeekOpen}
                                    className="w-full text-left p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 transition-all group flex flex-col gap-1"
                                >
                                    <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">Tüm Hafta Açık</span>
                                    <span className="text-[11px] font-medium text-slate-500">Haftanın her gününü pazartesiye göre açar.</span>
                                </button>
                            </div>

                            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-amber-500 text-xl">lightbulb</span>
                                    <p className="text-xs font-medium text-amber-800 leading-tight">
                                        Çalışma saatlerini daha sonra Ayarlar sekmesinden dilediğiniz zaman değiştirebilirsiniz.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Days List */}
                    <div className="lg:col-span-3 space-y-4">
                        {saveError && (
                            <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <span className="material-symbols-outlined shrink-0">error</span>
                                <span className="text-sm font-bold">{saveError}</span>
                            </div>
                        )}

                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                            {hours.map((day, idx) => (
                                <div key={day.day_of_week} className={`p-5 sm:p-6 transition-colors ${day.is_closed ? 'bg-slate-50/50' : 'bg-white'}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                                        {/* Day & Toggle */}
                                        <div className="flex items-center gap-4 w-48 shrink-0">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={!day.is_closed}
                                                    onChange={(e) => handleChange(idx, 'is_closed', !e.target.checked)}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                            <span className={`font-bold text-base ${day.is_closed ? 'text-slate-400' : 'text-slate-800'}`}>
                                                {DAYS[day.day_of_week]}
                                            </span>
                                        </div>

                                        {/* Time Controls */}
                                        {!day.is_closed ? (
                                            <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full animate-in fade-in duration-300">
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <input
                                                        type="time"
                                                        value={day.start_time ? day.start_time.substring(0, 5) : ""}
                                                        onChange={(e) => handleChange(idx, 'start_time', e.target.value + ":00")}
                                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full sm:w-[120px] text-center"
                                                    />
                                                    <span className="text-slate-400 font-bold">-</span>
                                                    <input
                                                        type="time"
                                                        value={day.end_time ? day.end_time.substring(0, 5) : ""}
                                                        onChange={(e) => handleChange(idx, 'end_time', e.target.value + ":00")}
                                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all w-full sm:w-[120px] text-center"
                                                    />
                                                </div>

                                                <div className="h-8 w-px bg-slate-200 hidden xl:block"></div>

                                                {/* Break Controls */}
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                                                    <label className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!day.break_start}
                                                            onChange={(e) => toggleBreak(idx, e.target.checked)}
                                                            className="rounded text-primary focus:ring-primary size-4 border-slate-300 cursor-pointer"
                                                        />
                                                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors whitespace-nowrap">Öğle Arası</span>
                                                    </label>

                                                    {day.break_start && (
                                                        <div className="flex items-center gap-2 w-full sm:w-auto animate-in slide-in-from-left-2 duration-200">
                                                            <input
                                                                type="time"
                                                                value={day.break_start ? day.break_start.substring(0, 5) : ""}
                                                                onChange={(e) => handleChange(idx, 'break_start', e.target.value + ":00")}
                                                                className="px-2 py-1.5 bg-orange-50 border border-orange-200 rounded-lg font-bold text-orange-700 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none w-full sm:w-[90px] text-center"
                                                            />
                                                            <span className="text-orange-300 font-bold">-</span>
                                                            <input
                                                                type="time"
                                                                value={day.break_end ? day.break_end.substring(0, 5) : ""}
                                                                onChange={(e) => handleChange(idx, 'break_end', e.target.value + ":00")}
                                                                className="px-2 py-1.5 bg-orange-50 border border-orange-200 rounded-lg font-bold text-orange-700 text-sm focus:ring-2 focus:ring-orange-500/20 outline-none w-full sm:w-[90px] text-center"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-end">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-[14px]">door_front</span>
                                                    Kapalı
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 w-full h-24 bg-white border-t border-slate-200 px-8 flex items-center justify-between z-50">
                <button onClick={onBack} disabled={isLoading || isPending} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                    Geri Dön
                </button>
                <button onClick={handleSave} disabled={isLoading || isPending} className="bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50">
                    {isLoading ? "Kaydediliyor..." : "Kaydet ve Devam Et"}
                    <span className={`material-symbols-outlined transition-transform ${isLoading ? 'animate-spin' : 'group-hover:translate-x-1'}`}>
                        {isLoading ? 'progress_activity' : 'arrow_forward'}
                    </span>
                </button>
            </footer>
        </div>
    );
}
