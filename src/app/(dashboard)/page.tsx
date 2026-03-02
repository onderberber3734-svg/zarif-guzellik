import { getAppointments } from "@/app/actions/appointments";
import { getCustomers } from "@/app/actions/customers";
import CustomerLink from "@/components/CustomerLink";

function getLocalIsoDate(date: Date) {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, -1);
    return localISOTime.split("T")[0];
}

export default async function DashboardPage() {
    // Veritabanından gerçek verileri çekiyoruz
    const appointments = await getAppointments();
    const customers = await getCustomers();

    const today = new Date();
    const todayStr = getLocalIsoDate(today);

    // 1. Bugünkü Randevular ve Gelir
    const todayAppointments = appointments.filter(a => a.appointment_date === todayStr);
    const todayRevenue = todayAppointments.reduce((sum, a) => sum + (Number(a.total_price) || 0), 0);
    const todayMinutes = todayAppointments.reduce((sum, a) => sum + (Number(a.total_duration_minutes) || 0), 0);

    // 2. Yeni Müşteriler (Son 30 gün doğumlu/kayıtlı)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const newCustomersCount = customers.filter(c => new Date(c.created_at) >= thirtyDaysAgo).length;

    // 3. Bugünkü Program (Saate göre sıralı ilk 5)
    const todaysSchedule = [...todayAppointments]
        .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
        .slice(0, 5);

    // 4. Popüler Hizmetler Analizi
    const serviceCounts: Record<string, number> = {};
    let totalServices = 0;

    appointments.forEach(appt => {
        if (appt.services && appt.services.length > 0) {
            appt.services.forEach((s: any) => {
                const serviceName = s.service?.name;
                if (serviceName) {
                    serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
                    totalServices++;
                }
            });
        }
    });

    const popularServices = Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({
            name,
            percentage: totalServices > 0 ? Math.round((count / totalServices) * 100) : 0
        }));

    const popularColors = ["bg-[var(--color-primary)]", "bg-purple-400", "bg-slate-300"];

    // 5. Hızlı İstatistikler
    const customerApptCounts: Record<string, number> = {};
    appointments.forEach(a => {
        customerApptCounts[a.customer_id] = (customerApptCounts[a.customer_id] || 0) + 1;
    });

    const totalUniqueCustomers = Object.keys(customerApptCounts).length;
    const returningCustomers = Object.values(customerApptCounts).filter(count => count > 1).length;
    const loyaltyScore = totalUniqueCustomers > 0 ? ((returningCustomers / totalUniqueCustomers) * 10).toFixed(1) : "0.0";
    const loyaltyPercent = totalUniqueCustomers > 0 ? Math.round((returningCustomers / totalUniqueCustomers) * 100) : 0;

    // Kapasite Kullanımı (Günlük 8 saat = 480 dk üzerinden örnek tahmini oran)
    const dailyCapacityMinutes = 480;
    const capacityPercent = Math.min(100, Math.round((todayMinutes / dailyCapacityMinutes) * 100));

    return (
        <div className="space-y-8 pb-16">
            {/* Sayfa Başlığı */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-[32px] font-extrabold text-slate-900 tracking-tight leading-tight">Merhaba, Elif Hanım</h2>
                    <p className="text-slate-400 mt-1 text-[15px]">Salonunuzun bugünkü performansına göz atın.</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-purple-50 text-[var(--color-primary)] font-bold text-sm rounded-[14px] hover:bg-purple-100 transition-all shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Günlük Raporu İndir
                </button>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[150px] relative overflow-hidden">
                    <div className="flex items-center justify-between z-10 mb-2">
                        <div className="p-2 bg-purple-50/80 rounded-[12px] text-[var(--color-primary)]">
                            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                        </div>
                        <span className="text-emerald-500 text-[11px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]">trending_up</span>
                            Trend
                        </span>
                    </div>
                    <div className="z-10 mt-auto">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">BUGÜNKÜ RANDEVULAR</p>
                        <h3 className="text-3xl font-black text-slate-900">{todayAppointments.length}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[150px] relative overflow-hidden">
                    <div className="flex items-center justify-between z-10 mb-2">
                        <div className="p-2 bg-amber-50/80 rounded-[12px] text-amber-500">
                            <span className="material-symbols-outlined text-[20px]">payments</span>
                        </div>
                        <span className="text-emerald-500 text-[11px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]">trending_up</span>
                            Gelir
                        </span>
                    </div>
                    <div className="z-10 mt-auto">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">TAHMİNİ GELİR</p>
                        <h3 className="text-3xl font-black text-slate-900">₺{todayRevenue.toLocaleString('tr-TR')}</h3>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between h-[150px] relative overflow-hidden">
                    <div className="flex items-center justify-between z-10 mb-2">
                        <div className="p-2 bg-rose-50/80 rounded-[12px] text-rose-500">
                            <span className="material-symbols-outlined text-[20px]">person_add</span>
                        </div>
                        <span className="text-emerald-500 text-[11px] font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[14px]">group</span>
                            Aktif
                        </span>
                    </div>
                    <div className="z-10 mt-auto">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">YENİ MÜŞTERİLER</p>
                        <h3 className="text-3xl font-black text-slate-900">{newCustomersCount}</h3>
                    </div>
                </div>
            </div>

            {/* AI Asistan Odak Noktası */}
            <div className="bg-gradient-to-br from-[#6832db] to-[#4c24a3] rounded-[32px] p-10 shadow-xl relative overflow-hidden text-white">
                <div className="flex flex-col md:flex-row gap-10 items-center justify-between relative z-10">
                    <div className="flex-1 space-y-5">
                        <div className="flex items-center gap-2 text-white/80 font-bold uppercase tracking-widest text-[10px]">
                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                            AI İŞ BÜYÜTME ASİSTANI
                        </div>
                        <h3 className="text-3xl lg:text-4xl text-white font-extrabold tracking-tight">Bugünkü Odak Noktası</h3>
                        <p className="text-white/80 text-[17px] leading-[1.6] font-light max-w-2xl">
                            "Verilerimize göre Salı günleri öğleden sonra doluluk oranınız %40. Bugün <b>'Yenilenme Paketi'</b> için %15 indirimli SMS kampanyası çıkmak gelirinizi ortalama <b>₺1.200</b> artırabilir."
                        </p>
                        <div className="flex flex-wrap gap-4 pt-3">
                            <button className="bg-white text-[#6832db] px-6 py-3 rounded-[14px] font-bold hover:bg-slate-50 shadow-md transition-all text-[15px]">
                                Kampanyayı Başlat
                            </button>
                            <button className="bg-transparent text-white border border-white/30 px-6 py-3 rounded-[14px] font-bold hover:bg-white/10 transition-all text-[15px]">
                                Detayları Gör
                            </button>
                        </div>
                    </div>

                    <div className="hidden md:flex w-72 aspect-square bg-white/5 rounded-3xl items-center justify-center border border-white/10 relative">
                        <span className="material-symbols-outlined text-[100px] text-white/50 z-10 font-extralight">insights</span>
                    </div>
                </div>
            </div>

            {/* Alt 2 Kolon: Program & Extra İstatistikler */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* SOL PANEL: Bugünkü Program */}
                <div className="lg:col-span-8 flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Bugünkü Program</h3>
                        <button className="text-[var(--color-primary)] font-bold text-[13px] hover:underline">
                            Tümünü Gör
                        </button>
                    </div>

                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-4 flex flex-col gap-2">
                        {todaysSchedule.length === 0 ? (
                            <div className="py-10 text-center text-slate-400">Bugün için planlanmış randevu bulunmuyor.</div>
                        ) : (
                            todaysSchedule.map((appt) => {
                                const rawCustomer = appt.customer;
                                const customer = Array.isArray(rawCustomer) ? rawCustomer[0] || {} : rawCustomer || {};
                                const servicesText = appt.services?.map((s: any) => s.service?.name).filter(Boolean).join(", ") || "Belirtilmedi";

                                // Durum Rozeti Tespiti
                                let statusBg = "bg-slate-100";
                                let statusText = "text-slate-500";
                                let statusLabel = "Bekliyor";
                                let rowOpacitiy = "";

                                switch (appt.status) {
                                    case 'completed': statusBg = "bg-emerald-50"; statusText = "text-emerald-600"; statusLabel = "Tamamlandı"; break;
                                    case 'checked_in': statusBg = "bg-indigo-50"; statusText = "text-indigo-600"; statusLabel = "Salonda"; break;
                                    case 'canceled': statusBg = "bg-rose-50"; statusText = "text-rose-600"; statusLabel = "İptal"; rowOpacitiy = "opacity-60"; break;
                                    case 'no_show': statusBg = "bg-slate-100"; statusText = "text-slate-500"; statusLabel = "Gelmedi"; rowOpacitiy = "opacity-60"; break;
                                    default: statusBg = "bg-blue-50"; statusText = "text-blue-600"; statusLabel = "Onaylandı"; break;
                                }

                                return (
                                    <div key={appt.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-slate-50 transition-colors rounded-2xl group ${rowOpacitiy}`}>
                                        <div className="text-center shrink-0 w-16">
                                            <p className={`font-extrabold text-[17px] leading-none ${appt.status === 'canceled' ? 'text-slate-400' : 'text-[var(--color-primary)]'}`}>
                                                {appt.appointment_time.substring(0, 5)}
                                            </p>
                                            <p className="text-[11px] font-medium text-slate-400 mt-1">{appt.total_duration_minutes} dk</p>
                                        </div>
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 shrink-0 uppercase">
                                                {customer?.first_name?.[0] || ""}{customer?.last_name?.[0] || ""}
                                            </div>
                                            <div className="min-w-0">
                                                <CustomerLink id={customer?.id} firstName={customer?.first_name || ""} lastName={customer?.last_name || ""} className="font-bold text-slate-900 text-[15px] truncate block" />
                                                <p className="text-[13px] text-slate-500 truncate mt-0.5 italic">{servicesText}</p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 sm:ml-auto">
                                            <span className={`inline-flex px-4 py-1.5 font-bold text-[11px] rounded-full tracking-wide ${statusBg} ${statusText}`}>
                                                {statusLabel}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* SAĞ PANEL: Ekstra İstatistik Kartları */}
                <div className="lg:col-span-4 flex flex-col gap-6">

                    {/* Popüler Hizmetler */}
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col">
                        <h3 className="text-[17px] font-bold text-slate-900 mb-6 tracking-tight">Popüler Hizmetler</h3>

                        <div className="flex flex-col gap-5">
                            {popularServices.length === 0 ? (
                                <p className="text-sm text-slate-400">Veri bulunmuyor.</p>
                            ) : (
                                popularServices.map((svc, index) => (
                                    <div key={svc.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className={`size-2.5 rounded-full ${popularColors[index] || "bg-slate-200"}`}></span>
                                            <span className="text-[13px] font-medium text-slate-600 truncate max-w-[150px]">{svc.name}</span>
                                        </div>
                                        <span className="text-[12px] font-bold text-slate-400">%{svc.percentage}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <button className="mt-8 w-full py-2.5 outline outline-1 outline-slate-100 text-[var(--color-primary)] rounded-[12px] font-bold text-[12px] hover:bg-slate-50 transition-colors">
                            Analizi İncele
                        </button>
                    </div>

                    {/* Hızlı İstatistikler */}
                    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 flex flex-col">
                        <h3 className="text-[17px] font-bold text-slate-900 mb-6 tracking-tight">Hızlı İstatistikler</h3>

                        <div className="flex flex-col gap-6">
                            {/* İstatistik 1 */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[12px] font-medium text-slate-600">Müşteri Sadakati</span>
                                    <span className="text-[12px] font-bold text-emerald-600">{loyaltyScore}/10</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${loyaltyPercent}%` }}></div>
                                </div>
                            </div>

                            {/* İstatistik 2 */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[12px] font-medium text-slate-600">Kapasite Kullanımı</span>
                                    <span className="text-[12px] font-bold text-[var(--color-primary)]">{capacityPercent}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${capacityPercent}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
