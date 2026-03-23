import { getAppointedCustomerDetails } from "@/app/actions/customers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionPlanPaymentClient } from "./SessionPlanPaymentClient";

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
                    <Link
                        href={`/musteriler/${id}/duzenle`}
                        className="flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all text-sm w-full"
                    >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Profili Düzenle
                    </Link>
                    <Link
                        href={`/randevu-olustur?customer_id=${id}`}
                        className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm text-sm w-full"
                    >
                        <span className="material-symbols-outlined text-sm">calendar_add_on</span>
                        Randevu Oluştur
                    </Link>
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

            {/* Aktif Seans Planları Kartı */}
            {customer.session_plans && customer.session_plans.length > 0 && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mb-8">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[var(--color-primary)]">style</span>
                                Seans Planları
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">Müşterinin satın aldığı paketler ve aktif seansları</p>
                        </div>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50/50">
                        {customer.session_plans.map((plan: any) => {
                            const todayMs = new Date().getTime();
                            let isDelayed = false;
                            let delayDays = 0;
                            let nextDateText = "Belirsiz";

                            // 1. Önce bu plan için aktif olarak planlanmış bir randevu var mı?
                            const scheduledAppt = sortedAppointments.find((a: any) => 
                                (a.status === 'scheduled' || a.status === 'checked_in') && 
                                a.appointment_services?.some((as: any) => as.session_plan_id === plan.id)
                            );

                            if (scheduledAppt) {
                                const apptMs = new Date(scheduledAppt.appointment_date).getTime();
                                if (apptMs < todayMs) {
                                    isDelayed = true;
                                    delayDays = Math.floor((todayMs - apptMs) / (1000 * 60 * 60 * 24));
                                }
                                nextDateText = new Date(scheduledAppt.appointment_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                            } else if (plan.completed_sessions === 0) {
                                // Hiç randevu planlanmamış ve ilk seans henüz alınmamış.
                                nextDateText = "1. Seansı Planlayın";
                                isDelayed = false;
                            } else if (plan.next_recommended_date) {
                                // İlk seans alınmış ve sonraki seans için manuel plan yapılmamış, o yüzden hedeflenen (önerilen) tarihi göster
                                const nextMs = new Date(plan.next_recommended_date).getTime();
                                if (nextMs < todayMs && plan.status === 'active') {
                                    isDelayed = true;
                                    delayDays = Math.floor((todayMs - nextMs) / (1000 * 60 * 60 * 24));
                                }
                                nextDateText = new Date(plan.next_recommended_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
                            }

                            const progressPercent = Math.min(100, Math.round((plan.completed_sessions / plan.total_sessions) * 100));

                            return (
                                <div key={plan.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                    {plan.status === 'completed' && <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>}
                                    {plan.status === 'active' && <div className="absolute top-0 left-0 w-full h-1 bg-[var(--color-primary)]"></div>}

                                    <div className="flex justify-between items-start mb-4">
                                        <h4 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                                            {plan.services?.name || "Bilinmeyen Hizmet"}
                                        </h4>
                                        <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-xl ${plan.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                            plan.status === 'canceled' ? 'bg-slate-100 text-slate-500' : 'bg-purple-100 text-[var(--color-primary)]'
                                            }`}>
                                            {plan.status === 'completed' ? 'TAMAMLANDI' : plan.status === 'canceled' ? 'İPTAL' : 'AKTİF'}
                                        </span>
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm mb-1 font-bold text-slate-600">
                                            <span>İlerleme ({plan.completed_sessions}/{plan.total_sessions})</span>
                                            <span className={plan.status === 'completed' ? 'text-emerald-600' : 'text-[var(--color-primary)]'}>{progressPercent}%</span>
                                        </div>
                                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 rounded-full ${plan.status === 'completed' ? 'bg-emerald-500' : 'bg-[var(--color-primary)]'}`}
                                                style={{ width: `${progressPercent}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className={`p-3 rounded-xl border ${isDelayed ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'} flex justify-between items-center transition-colors`}>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">SONRAKİ SEANS</p>
                                            <p className={`text-sm font-extrabold flex items-center gap-1 ${isDelayed ? 'text-rose-600' : 'text-slate-800'}`}>
                                                <span className="material-symbols-outlined text-[16px]">event</span>
                                                {nextDateText}
                                            </p>
                                        </div>
                                        {isDelayed && (
                                            <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                                <span className="material-symbols-outlined text-[14px]">warning</span>
                                                Gecikti ({delayDays} gün)
                                            </span>
                                        )}
                                        {plan.status === 'completed' && (
                                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">check</span>
                                                Paket Bitti
                                            </span>
                                        )}
                                    </div>

                                    {/* Kullanım Özeti */}
                                    <div className="mt-3 bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-700">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Kullanılan Seans</span>
                                            <span className="font-bold text-[var(--color-primary)]">{plan.completed_sessions} / {plan.total_sessions}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-500 uppercase tracking-widest text-[10px]">Kalan Seans</span>
                                            <span className="font-bold text-slate-700">{plan.total_sessions - plan.completed_sessions}</span>
                                        </div>
                                    </div>

                                    {/* Finansal Paket Bilgisi */}
                                    {plan.package_total_price && (
                                        <SessionPlanPaymentClient
                                            planId={plan.id}
                                            customerId={customer.id}
                                            packageTotalPrice={plan.package_total_price}
                                            paidAmount={plan.paid_amount || 0}
                                            paymentMode={plan.payment_mode || 'prepaid_full'}
                                        />
                                    )}

                                    {plan.status === 'active' && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
                                            {isDelayed && customer.phone && (
                                                <a href={`tel:${customer.phone.replace(/\s+/g, '')}`} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm">
                                                    <span className="material-symbols-outlined text-[18px]">call</span>
                                                    Arama Yap
                                                </a>
                                            )}
                                            <Link href={`/randevu-olustur?customer_id=${customer.id}&service_id=${plan.service_id}`} className="px-5 py-2 bg-[var(--color-primary)] text-white hover:bg-purple-700 hover:shadow-md hover:shadow-purple-500/20 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-all ml-auto shadow-sm">
                                                <span className="material-symbols-outlined text-[18px]">calendar_add_on</span>
                                                Seans Planla
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                                        servicesStr = appt.appointment_services.map((as: any) => {
                                            const name = as.services?.name;
                                            if (as.session_plan_id && as.session_plans && as.session_number) {
                                                return `${name} (Seans ${as.session_number}/${as.session_plans.total_sessions})`;
                                            }
                                            return name;
                                        }).filter(Boolean).join(", ");
                                    }

                                    return (
                                        <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-4 px-6 whitespace-nowrap">
                                                <p className="font-bold text-slate-900 border-b-0">
                                                    {apptDate.toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </p>
                                                <p className="text-sm font-medium text-slate-500 mt-0.5">
                                                    {appt.appointment_time ? appt.appointment_time.substring(0, 5) : "Belirtilmedi"}
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
