import { getAppointedCustomerDetails } from "@/app/actions/customers";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function MusteriDetayPage({ params }: { params: { id: string } }) {
    const { id } = await params;
    const customer = await getAppointedCustomerDetails(id);

    if (!customer) {
        notFound();
    }

    const { stats, ai_summary, segment, sortedAppointments } = customer;
    const isVip = segment === "VIP";
    const initials = `${customer.first_name[0]}${customer.last_name[0]}`.toUpperCase();

    // AI Özeti Badge Renkleri
    let badgeBg = "bg-slate-100";
    let badgeText = "text-slate-700";
    let badgeIcon = "info";

    if (ai_summary === "Sadık Müşteri" || ai_summary === "Düzenli Ziyaretçi") {
        badgeBg = "bg-purple-100"; badgeText = "text-purple-700"; badgeIcon = "temp_preferences_custom";
    } else if (ai_summary === "Potansiyeli Yüksek") {
        badgeBg = "bg-blue-100"; badgeText = "text-blue-700"; badgeIcon = "trending_up";
    } else if (ai_summary === "Yeni Başlangıç") {
        badgeBg = "bg-emerald-100"; badgeText = "text-emerald-700"; badgeIcon = "eco";
    } else if (ai_summary === "Geri Kazanılabilir" || ai_summary === "Riskli") {
        badgeBg = "bg-rose-100"; badgeText = "text-rose-700"; badgeIcon = "history";
    }

    // Avatar
    const avatarClass = isVip
        ? "bg-purple-100 text-purple-700 ring-4 ring-purple-100 ring-offset-4"
        : "bg-orange-100 text-orange-700 ring-4 ring-orange-50 ring-offset-4";

    return (
        <div className="space-y-8 pb-20 max-w-7xl mx-auto">
            {/* Geri Dön ve Üst Etiketler */}
            <div className="flex items-center justify-between">
                <Link
                    href="/musteriler"
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm"
                >
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                    Müşterilere Dön
                </Link>
                <div className="flex items-center gap-3">
                    {isVip && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wider shadow-sm">
                            <span className="material-symbols-outlined text-[14px]">diamond</span> VIP MÜŞTERİ
                        </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${badgeBg} ${badgeText} uppercase tracking-wider shadow-sm`}>
                        <span className="material-symbols-outlined text-[14px]">{badgeIcon}</span> {ai_summary}
                    </span>
                </div>
            </div>

            {/* Profil Header Kartı */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col md:flex-row gap-8 items-start md:items-center relative overflow-hidden">
                {/* Dekoratif Arka Plan (VIP ise mora dönük) */}
                <div className={`absolute top-0 right-0 w-64 h-64 blur-3xl rounded-full opacity-10 -z-10 -translate-y-1/2 translate-x-1/3 ${isVip ? 'bg-purple-500' : 'bg-[var(--color-primary)]'}`}></div>

                <div className={`size-24 rounded-full flex items-center justify-center font-extrabold text-3xl uppercase ${avatarClass} shadow-sm shrink-0 z-10`}>
                    {initials}
                </div>

                <div className="flex-1 z-10">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
                        {customer.first_name} {customer.last_name}
                    </h1>
                    <div className="flex flex-wrap gap-x-6 gap-y-3 mt-4 text-sm font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">call</span>
                            {customer.phone}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">mail</span>
                            {customer.email || 'E-posta Kayıtlı Değil'}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-slate-400">cake</span>
                            {customer.birth_date ? new Date(customer.birth_date).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long' }) : 'Doğum Tarihi Yok'}
                        </div>
                    </div>
                    {customer.notes && (
                        <div className="mt-5 p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-600 italic">
                            "{customer.notes}"
                        </div>
                    )}
                </div>

                {/* Aksiyonlar */}
                <div className="flex flex-col gap-2 w-full md:w-auto z-10">
                    <button className="flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all text-sm w-full">
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Profili Düzenle
                    </button>
                    <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm text-sm w-full">
                        <span className="material-symbols-outlined text-sm">calendar_add_on</span>
                        Randevu Oluştur
                    </button>
                </div>
            </div>

            {/* Metrik Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">TOPLAM HARCAMA</span>
                    <span className="text-3xl font-black text-slate-900 mt-auto">
                        {stats.totalSpent > 0 ? stats.totalSpent.toLocaleString('tr-TR') : '0'} <span className="text-lg text-slate-500 font-bold">TL</span>
                    </span>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">GELİNLEN RANDEVU</span>
                    <span className="text-3xl font-black text-slate-900 mt-auto">{stats.totalAppointments}</span>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">SON ZİYARET</span>
                    <span className="text-2xl font-extrabold text-slate-900 mt-2">
                        {stats.lastVisitDate ? new Date(stats.lastVisitDate).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short', year: 'numeric' }) : 'Hiç Gelmedi'}
                    </span>
                    {stats.daysSinceLastVisit !== null && (
                        <span className={`text-sm font-bold mt-1 ${stats.daysSinceLastVisit > 60 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {stats.daysSinceLastVisit === 0 ? 'Bugün' : `${stats.daysSinceLastVisit} gün önce`}
                        </span>
                    )}
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-1">İLK ZİYARET</span>
                    <span className="text-xl font-extrabold text-slate-900 mt-auto">
                        {stats.firstVisitDate ? new Date(stats.firstVisitDate).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </span>
                </div>
            </div>

            {/* Randevu Geçmişi Tablosu */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-extrabold text-slate-900">Randevu Geçmişi</h3>
                        <p className="text-sm text-slate-500 mt-1">Müşterinin geçmiş ve güncel tüm randevuları</p>
                    </div>
                </div>

                {sortedAppointments.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center">
                        <div className="size-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-slate-300">calendar_month</span>
                        </div>
                        <p className="font-bold text-slate-600">Henüz randevu geçmişi bulunmuyor.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">TARİH & SAAT</th>
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">HİZMETLER</th>
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">TUTAR</th>
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">DURUM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedAppointments.map((appt: any) => {
                                    // Durum Renkleri
                                    let sBg = "bg-slate-100";
                                    let sText = "text-slate-700";
                                    let sIcon = "calendar_month";
                                    let sLabel = "Bilinmiyor";

                                    switch (appt.status) {
                                        case 'completed': sBg = "bg-emerald-100"; sText = "text-emerald-700"; sIcon = "check_circle"; sLabel = "Tamamlandı"; break;
                                        case 'scheduled': sBg = "bg-blue-100"; sText = "text-blue-700"; sIcon = "schedule"; sLabel = "Planlandı"; break;
                                        case 'canceled': sBg = "bg-rose-100"; sText = "text-rose-700"; sIcon = "cancel"; sLabel = "İptal Edildi"; break;
                                        case 'no_show': sBg = "bg-orange-100"; sText = "text-orange-700"; sIcon = "person_off"; sLabel = "Gelmedi"; break;
                                        case 'checked_in': sBg = "bg-indigo-100"; sText = "text-indigo-700"; sIcon = "how_to_reg"; sLabel = "Salonda"; break;
                                    }

                                    const apptDate = new Date(appt.appointment_date);

                                    // Hizmet formatı
                                    let servicesStr = "Hizmet belirtilmemiş";
                                    if (appt.appointment_services && appt.appointment_services.length > 0) {
                                        servicesStr = appt.appointment_services.map((as: any) => as.services?.name).filter(Boolean).join(", ");
                                    }

                                    return (
                                        <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <p className="font-bold text-slate-900 border-b-0">
                                                    {apptDate.toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                                <p className="text-sm font-medium text-slate-500 mt-0.5">
                                                    {apptDate.toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </td>
                                            <td className="py-4 px-6">
                                                <p className="text-sm font-medium text-slate-700 bg-slate-100 inline-block px-3 py-1 rounded-lg">
                                                    {servicesStr}
                                                </p>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <p className="font-bold text-slate-900">{Number(appt.total_price) > 0 ? `${Number(appt.total_price).toLocaleString('tr-TR')} TL` : '-'}</p>
                                            </td>
                                            <td className="py-4 px-6 whitespace-nowrap text-right">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${sBg} ${sText}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{sIcon}</span>
                                                    {sLabel}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
