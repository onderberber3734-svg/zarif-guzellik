import { useState } from "react";

export default function Step4({
    services, localSalons, salonName, setSalonName,
    salonType, setSalonType, salonColor, setSalonColor,
    selectedServiceIds, setSelectedServiceIds,
    handleAddSalon, onNext, onBack, isPending
}: any) {

    // Group services by category for better display
    const servicesByCategory = services.reduce((acc: any, service: any) => {
        const cat = service.service_categories?.name || service.category || "Genel";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(service);
        return acc;
    }, {});

    // Toggle all services feature
    const handleToggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedServiceIds(services.map((s: any) => s.id));
        } else {
            setSelectedServiceIds([]);
        }
    };

    return (
        <div className="bg-background-light min-h-screen flex flex-col items-center p-6 text-slate-900 relative">

            {/* Top Navigation Bar matching design */}
            <nav className="fixed top-0 left-0 w-full h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-50">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-2xl">spa</span>
                    </div>
                    <h1 className="serif-heading text-xl font-bold text-primary">Zarif Güzellik</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-500">Yardıma mı ihtiyacınız var?</span>
                    <button className="text-primary font-bold text-sm hover:underline">Destek Al</button>
                </div>
            </nav>

            <main className="flex-1 w-full max-w-5xl px-6 py-12 mt-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Section */}
                <div className="mb-12">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <h2 className="serif-heading text-3xl font-bold mb-2">Salon / Oda Yönetimi</h2>
                            <p className="text-slate-500">Hizmet verdiğiniz odaları veya çalışma koltuklarını tanımlayın.</p>
                        </div>
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-primary mb-1">Adım 5 / 8</p>
                            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="w-4/6 h-full bg-primary rounded-full transition-all duration-500"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Panel: Form */}
                    <div className="lg:col-span-6 space-y-8">
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
                                Yeni Oda Ekle
                            </h3>

                            <form onSubmit={handleAddSalon} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Ad (Oda / Koltuk vs)</label>
                                    <input
                                        required
                                        type="text"
                                        value={salonName}
                                        onChange={e => setSalonName(e.target.value)}
                                        placeholder="Örn: VIP Cilt Bakım Odası"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Tür</label>
                                        <div className="relative">
                                            <select
                                                value={salonType}
                                                onChange={e => setSalonType(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none text-slate-800 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer font-medium"
                                            >
                                                <option value="room">Oda</option>
                                                <option value="chair">Koltuk / Alan</option>
                                            </select>
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <span className="material-symbols-outlined text-xl">{salonType === 'room' ? 'meeting_room' : 'event_seat'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Renk Kodu</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={salonColor}
                                                onChange={(e) => setSalonColor(e.target.value)}
                                                className="size-11 rounded-xl cursor-pointer border-0 p-0 overflow-hidden shrink-0 shadow-sm"
                                            />
                                            <div className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm font-medium text-slate-600">
                                                {salonColor.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="block text-sm font-bold text-slate-700">Bu odada verilen hizmetleri seçin</label>
                                        <label className="inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={services.length > 0 && selectedServiceIds.length === services.length}
                                                onChange={handleToggleAll}
                                            />
                                            <div className="relative w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            <span className="ms-3 text-xs font-bold text-slate-500">Tümünü Seç</span>
                                        </label>
                                    </div>
                                    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                        {Object.entries(servicesByCategory).map(([category, catServices]: [string, any]) => (
                                            <div key={category} className="space-y-2">
                                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40"></span>
                                                    {category}
                                                </h5>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {catServices.map((s: any) => (
                                                        <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedServiceIds.includes(s.id) ? 'border-primary bg-primary/5 ring-1 ring-primary/10' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only"
                                                                checked={selectedServiceIds.includes(s.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedServiceIds((prev: any) => [...prev, s.id]);
                                                                    else setSelectedServiceIds((prev: any) => prev.filter((id: any) => id !== s.id));
                                                                }}
                                                            />
                                                            <div className={`size-5 rounded flex items-center justify-center border transition-all ${selectedServiceIds.includes(s.id) ? 'bg-primary border-primary text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                                                <span className="material-symbols-outlined text-[14px]">check</span>
                                                            </div>
                                                            <span className={`text-sm font-bold truncate transition-colors ${selectedServiceIds.includes(s.id) ? 'text-primary' : 'text-slate-600'}`}>{s.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isPending || !salonName || selectedServiceIds.length === 0}
                                    className="w-full py-4 bg-primary/10 text-primary rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-all disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined">add</span>
                                    Listeye Ekle
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right Panel: List */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="font-bold text-lg text-slate-800">Eklenen Odalar</h3>
                            <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full">{localSalons.length} Oda</span>
                        </div>

                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {localSalons.map((salon: any, idx: number) => {
                                // Find associated service details for this salon (handles database structure or local structure)
                                const associatedServiceIds = salon.salon_services
                                    ? salon.salon_services.map((ss: any) => ss.service_id)
                                    : (salon.service_ids || []);
                                const salonServiceDetails = associatedServiceIds.length > 0 ? services.filter((s: any) => associatedServiceIds.includes(s.id)) : [];

                                return (
                                    <div key={idx} className="p-5 bg-accent-lilac/30 border border-purple-100 rounded-3xl relative group transition-all hover:bg-accent-lilac/50">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="size-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 mt-1"
                                                    style={{ backgroundColor: salon.color_code || "#8b5cf6" }}
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">{salon.type === 'chair' ? 'event_seat' : 'meeting_room'}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-900">{salon.name}</h4>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                                            {salon.type === 'chair' ? 'Koltuk' : 'Oda'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">{salonServiceDetails.length > 0 ? `${salonServiceDetails.length} Hizmet Tanımlı` : 'Hizmet seçilmedi'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const { deleteSalon } = await import("@/app/actions/salons");
                                                    const res = await deleteSalon(salon.id);
                                                    if (res.success) {
                                                        window.location.reload();
                                                    } else {
                                                        alert("Hata: " + res.error);
                                                    }
                                                }}
                                                disabled={isPending}
                                                className="text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-xl">delete</span>
                                            </button>
                                        </div>

                                        {salonServiceDetails.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {/* Show up to 2 services, then +N indicator */}
                                                {salonServiceDetails.slice(0, 2).map((s: any) => (
                                                    <span key={s.id} className="px-2 py-1 bg-white text-[10px] font-bold rounded-lg border border-purple-100 text-slate-700">
                                                        {s.name}
                                                    </span>
                                                ))}
                                                {salonServiceDetails.length > 2 && (
                                                    <span className="px-2 py-1 bg-white text-[10px] font-bold rounded-lg border border-purple-100 text-slate-700">
                                                        +{salonServiceDetails.length - 2} Diğer
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Empty State placeholder at the bottom */}
                            <div className="p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                                <div className="size-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 mb-3">
                                    <span className="material-symbols-outlined">meeting_room</span>
                                </div>
                                <p className="text-sm font-medium text-slate-400">Daha fazla oda eklemek için formu kullanın</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 w-full h-24 bg-white border-t border-slate-200 px-8 flex items-center justify-between z-50">
                <button onClick={onBack} disabled={isPending} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                    Geri Dön
                </button>
                <button onClick={() => onNext(6)} disabled={isPending || localSalons.length === 0} className="bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50">
                    {isPending ? "Kaydediliyor..." : "Devam Et"}
                    <span className={`material-symbols-outlined transition-transform ${isPending ? 'animate-spin' : 'group-hover:translate-x-1'}`}>
                        {isPending ? 'progress_activity' : 'arrow_forward'}
                    </span>
                </button>
            </footer>
        </div>
    );
}
