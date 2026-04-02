"use client";

import { useState } from "react";
import Link from "next/link";
import { MusteriEkleModal } from "@/components/MusteriEkleModal";
import { addCustomer, updateCustomer, deleteCustomer } from "@/app/actions/customers";
import CustomerLink from "@/components/CustomerLink";
import {
    isVIPCustomer,
    isNewCustomer,
    isRiskGroup,
    isBirthdayApproaching,
    isLoyalCustomer,
    SEGMENT_NAMES
} from "@/utils/segmentRules";

export default function MusterilerClient({ initialCustomers }: { initialCustomers: any[] }) {
    const [customers, setCustomers] = useState(initialCustomers);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<any>(null);

    // Filtreleme ve Sıralama stateleri
    const [searchQuery, setSearchQuery] = useState("");
    const [segmentFilter, setSegmentFilter] = useState(SEGMENT_NAMES.ALL);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-50 transition-opacity">unfold_more</span>;
        }
        return (
            <span className="material-symbols-outlined text-[14px] text-slate-800">
                {sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'}
            </span>
        );
    };

    const handleAddCustomer = async (customerData: any) => {
        if (editingCustomer) {
            // Güncelleme
            const res = await updateCustomer(editingCustomer.id, customerData);
            if (res.success && res.data) {
                // Sadece frontend'de anlık güncelliyoruz, aslında sayfayı yenilemek / server action revalidatePath yaptığı için sayfa zaten yenilenebilir
                setCustomers(customers.map(c => c.id === editingCustomer.id ? { ...c, ...customerData, segment: customerData.is_vip ? "VIP" : "Standart" } : c));
            } else {
                throw new Error(res.error || "Güncelleme başarısız.");
            }
        } else {
            // Yeni Ekleme
            const res = await addCustomer(customerData);
            if (res.success && res.data) {
                // AI özeti veya segment backend'den gelebileceği için basitçe frontendde mock append
                const freshCustomer = {
                    ...res.data,
                    stats: { totalAppointments: 0, totalSpent: 0, lastVisitDate: null },
                    ai_summary: "Yeni Başlangıç",
                    segment: customerData.is_vip ? "VIP" : "Standart"
                };
                setCustomers([freshCustomer, ...customers]);
            } else {
                throw new Error(res.error || "Ekleme başarısız.");
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Bu müşteriyi silmek istediğinize emin misiniz?")) {
            const res = await deleteCustomer(id);
            if (res.success) {
                setCustomers(customers.filter(c => c.id !== id));
            } else {
                alert("Silme hatası: " + res.error);
            }
        }
    };

    const openEditModal = (customer: any) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setEditingCustomer(null);
        setIsModalOpen(true);
    };

    // Client-side filtreleme
    const filteredCustomers = customers.filter(c => {
        const matchesSearch = `${c.first_name} ${c.last_name} ${c.phone}`.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesSegment = false;

        switch (segmentFilter) {
            case SEGMENT_NAMES.ALL:
                matchesSegment = true;
                break;
            case SEGMENT_NAMES.VIP:
                matchesSegment = isVIPCustomer(c);
                break;
            case SEGMENT_NAMES.LOYAL:
                matchesSegment = isLoyalCustomer(c);
                break;
            case SEGMENT_NAMES.NEW:
                matchesSegment = isNewCustomer(c);
                break;
            case SEGMENT_NAMES.RISK:
                matchesSegment = isRiskGroup(c);
                break;
            case SEGMENT_NAMES.BIRTHDAY:
                matchesSegment = isBirthdayApproaching(c);
                break;
            default:
                matchesSegment = true;
        }

        return matchesSearch && matchesSegment;
    });

    // Client-side sıralama
    const sortedCustomers = [...filteredCustomers];
    if (sortConfig !== null) {
        sortedCustomers.sort((a, b) => {
            let aValue: any = a[sortConfig.key];
            let bValue: any = b[sortConfig.key];

            // Özel anahtarlar için değer hesaplamaları
            if (sortConfig.key === 'name') {
                aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
                bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
            } else if (sortConfig.key === 'lastVisit') {
                // Hiç gelmeyenleri en son tarihte/en yüksek gün gibi düşünelim (99999)
                aValue = a.stats?.daysSinceLastVisit !== null && a.stats?.daysSinceLastVisit !== undefined ? a.stats.daysSinceLastVisit : 99999;
                bValue = b.stats?.daysSinceLastVisit !== null && b.stats?.daysSinceLastVisit !== undefined ? b.stats.daysSinceLastVisit : 99999;
            } else if (sortConfig.key === 'totalSpent') {
                aValue = a.stats?.totalSpent || 0;
                bValue = b.stats?.totalSpent || 0;
            } else if (sortConfig.key === 'ai_summary') {
                aValue = (a.ai_summary || "Yeni Başlangıç").toLowerCase();
                bValue = (b.ai_summary || "Yeni Başlangıç").toLowerCase();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    // İstatistik Metrikleri
    const totalCustomers = customers.length;

    // Segment metrikleri (merkezi kurallara bağlı)
    const vipCount = customers.filter(isVIPCustomer).length;
    const loyalCount = customers.filter(isLoyalCustomer).length;
    const newCount = customers.filter(isNewCustomer).length;
    const riskCount = customers.filter(isRiskGroup).length;
    const birthdayCount = customers.filter(isBirthdayApproaching).length;

    return (
        <div className="space-y-8 pb-20">
            {/* Üst Kısım: Başlık ve Butonlar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Müşteriler</h2>
                    <p className="text-slate-500 mt-2 text-lg">Toplam <span className="font-bold text-slate-800">{totalCustomers}</span> kayıtlı müşteri</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                        <span className="material-symbols-outlined text-sm">download</span>
                        Dışa Aktar
                    </button>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all text-sm"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Yeni Müşteri
                    </button>
                </div>
            </div>

            {/* Metrik Kartları Bölümü */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                {/* VIP Kart */}
                <div className="group relative flex flex-col p-5 bg-gradient-to-br from-[#805ad5] to-[#6b46c1] rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-white overflow-hidden text-left cursor-pointer" onClick={() => setSegmentFilter(SEGMENT_NAMES.VIP)}>
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="material-symbols-outlined text-8xl">diamond</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3 relative z-10">
                        <span className="material-symbols-outlined text-white/90 text-[18px]">diamond</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-white/90">{SEGMENT_NAMES.VIP.toUpperCase()}</span>
                    </div>
                    <span className="text-4xl font-extrabold relative z-10">{vipCount}</span>
                    <span className="text-xs text-white/70 mt-1 relative z-10 font-medium">VIP üyelikte olanlar</span>
                </div>

                {/* Sadık Müşteri Kartı */}
                <div className="group relative flex flex-col p-5 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-amber-400 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer" onClick={() => setSegmentFilter(SEGMENT_NAMES.LOYAL)}>
                    <div className="flex items-center gap-2 mb-3 text-amber-500">
                        <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-[#d97706]">{SEGMENT_NAMES.LOYAL.toUpperCase()}</span>
                    </div>
                    <span className="text-4xl font-extrabold text-slate-900">{loyalCount}</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium">3+ randevu & sık gelenler</span>
                </div>

                {/* Yeni Müşteriler Kartı */}
                <div className="group relative flex flex-col p-5 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer" onClick={() => setSegmentFilter(SEGMENT_NAMES.NEW)}>
                    <div className="flex items-center gap-2 mb-3 text-emerald-600">
                        <span className="inline-flex px-2 py-0.5 bg-emerald-100 rounded text-[10px] font-bold uppercase tracking-wider">YENİ</span>
                        <span className="text-xs font-bold uppercase tracking-widest">İLK ZİYARETİ YENİ OLANLAR</span>
                    </div>
                    <span className="text-4xl font-extrabold text-slate-900">{newCount}</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium">İlk completed ziyareti yakın olan müşteriler</span>
                </div>

                {/* Riskli Grup Kartı */}
                <div className="group relative flex flex-col p-5 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-rose-400 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer" onClick={() => setSegmentFilter(SEGMENT_NAMES.RISK)}>
                    <div className="flex items-center gap-2 mb-3 text-rose-600">
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                        <span className="text-xs font-bold uppercase tracking-widest">{SEGMENT_NAMES.RISK.toUpperCase()}</span>
                    </div>
                    <span className="text-4xl font-extrabold text-slate-900">{riskCount}</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium">90+ gündür completed randevusu olmayanlar</span>
                </div>

                {/* Doğum Günü Kartı */}
                <div className="group relative flex flex-col p-5 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-blue-400 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer" onClick={() => setSegmentFilter(SEGMENT_NAMES.BIRTHDAY)}>
                    <div className="flex items-center gap-2 mb-3 text-blue-600">
                        <span className="material-symbols-outlined text-[18px]">cake</span>
                        <span className="text-xs font-bold uppercase tracking-widest">{SEGMENT_NAMES.BIRTHDAY.toUpperCase()}</span>
                    </div>
                    <span className="text-4xl font-extrabold text-slate-900">{birthdayCount}</span>
                    <span className="text-xs text-slate-500 mt-1 font-medium">Bu ay doğum günü yaklaşanlar</span>
                </div>
            </div>

            {/* Arama ve Filtreleme Bari */}
            <div className="flex flex-col md:flex-row gap-4 mb-2">
                <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-xl">search</span>
                    <input
                        type="text"
                        placeholder="Müşteri ara (İsim, Telefon)..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all font-medium text-sm shadow-sm"
                    />
                </div>
                <div className="flex gap-2">
                    {Object.values(SEGMENT_NAMES).map(f => (
                        <button
                            key={f}
                            onClick={() => setSegmentFilter(f)}
                            className={`px-4 py-3 rounded-2xl text-sm font-bold border transition-all ${segmentFilter === f ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Müşteri Tablosu */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                {filteredCustomers.length === 0 ? (
                    <div className="text-center py-24 text-slate-400 flex flex-col items-center">
                        <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
                        </div>
                        <p className="font-bold text-slate-600">Müşteri bulunamadı.</p>
                        <p className="text-sm mt-1">Arama kriterlerinizi değiştirin veya yeni müşteri ekleyin.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1">
                                            MÜŞTERİ {renderSortIcon('name')}
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                        İLETİŞİM
                                    </th>
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('lastVisit')}>
                                        <div className="flex items-center gap-1">
                                            SON ZİYARET {renderSortIcon('lastVisit')}
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap text-center cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('ai_summary')}>
                                        <div className="flex items-center justify-center gap-1">
                                            Aİ ÖZETİ {renderSortIcon('ai_summary')}
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('totalSpent')}>
                                        <div className="flex items-center justify-end gap-1">
                                            {renderSortIcon('totalSpent')} TOPLAM HARCAMA
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest whitespace-nowrap text-right">İŞLEM</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sortedCustomers.map(customer => {
                                    const stats = customer.stats || {};
                                    const aiSummary = customer.ai_summary || "Yeni Başlangıç";
                                    const isVip = customer.segment === "VIP";
                                    const initials = `${customer.first_name[0]}${customer.last_name[0]}`;

                                    // Avatar Renkleri: Baş harfe göre ya da VIP statüsüne göre
                                    const avatarClass = isVip
                                        ? "bg-purple-100 text-purple-700 ring-2 ring-purple-200 ring-offset-2"
                                        : "bg-orange-100 text-orange-700";

                                    // AI Özeti Badge Renkleri
                                    let badgeBg = "bg-slate-100";
                                    let badgeText = "text-slate-700";
                                    let badgeIcon = "info";

                                    if (aiSummary === "Sadık Müşteri" || aiSummary === "Düzenli Ziyaretçi") {
                                        badgeBg = "bg-purple-100"; badgeText = "text-purple-700"; badgeIcon = "temp_preferences_custom";
                                    } else if (aiSummary === "Potansiyeli Yüksek") {
                                        badgeBg = "bg-blue-100"; badgeText = "text-blue-700"; badgeIcon = "trending_up";
                                    } else if (aiSummary === "Yeni Başlangıç") {
                                        badgeBg = "bg-emerald-100"; badgeText = "text-emerald-700"; badgeIcon = "eco";
                                    } else if (aiSummary === "Geri Kazanılabilir") {
                                        badgeBg = "bg-rose-100"; badgeText = "text-rose-700"; badgeIcon = "history";
                                    }

                                    // Son ziyaret String
                                    let lastVisitStr = "Hiç Gelmedi";
                                    if (stats.lastVisitDate) {
                                        const d = new Date(stats.lastVisitDate);
                                        lastVisitStr = d.toLocaleDateString("tr-TR", { day: 'numeric', month: 'short', year: 'numeric' });
                                        if (stats.daysSinceLastVisit === 0) lastVisitStr = "Bugün";
                                        else if (stats.daysSinceLastVisit === 1) lastVisitStr = "Dün";
                                        else if (stats.daysSinceLastVisit > 0 && stats.daysSinceLastVisit <= 7) lastVisitStr = `${stats.daysSinceLastVisit} Gün Önce`;
                                    }

                                    // Gecikmiş Seans Planı Kontrolü
                                    const todayMs = new Date().getTime();
                                    const delayedPlans = (customer.session_plans || []).filter((p: any) =>
                                        p.status === 'active' && p.next_recommended_date && new Date(p.next_recommended_date).getTime() < todayMs
                                    );
                                    const hasDelayedPlan = delayedPlans.length > 0;

                                    return (
                                        <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group">
                                            {/* Müşteri Kolonu (Avatar + İsim + VIP Badge) */}
                                            <td className="py-5 px-6 whitespace-nowrap">
                                                <div className="flex items-center gap-4">
                                                    <div className={`size-12 rounded-full flex items-center justify-center font-bold text-lg uppercase ${avatarClass} shadow-sm shrink-0`}>
                                                        {initials}
                                                    </div>
                                                    <div>
                                                        <CustomerLink
                                                            id={customer.id}
                                                            firstName={customer.first_name}
                                                            lastName={customer.last_name}
                                                            className="font-extrabold text-[15px] block text-slate-900 group-hover:text-[var(--color-primary)] transition-colors"
                                                        />
                                                        {isVip && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 mt-1 uppercase tracking-wider">
                                                                <span className="material-symbols-outlined text-[10px]">diamond</span>VIP
                                                            </span>
                                                        )}
                                                        {hasDelayedPlan && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 mt-1 ml-1 uppercase tracking-wider" title="Seans zamanı geçmiş">
                                                                <span className="material-symbols-outlined text-[10px]">warning</span>SEANS BEKLİYOR
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* İletişim */}
                                            <td className="py-5 px-6 whitespace-nowrap">
                                                <p className="text-sm font-bold text-slate-700">{customer.phone}</p>
                                                <p className="text-[13px] text-slate-400 mt-0.5">{customer.email || 'Mail Yok'}</p>
                                            </td>

                                            {/* Son Ziyaret */}
                                            <td className="py-5 px-6 whitespace-nowrap">
                                                <p className={`text-sm font-bold ${stats.daysSinceLastVisit !== null && stats.daysSinceLastVisit > 90 ? 'text-rose-600' : 'text-slate-900'}`}>
                                                    {lastVisitStr}
                                                </p>
                                                <p className="text-[12px] text-slate-400 mt-0.5 max-w-[120px] truncate" title={customer.notes}>
                                                    {customer.notes ? customer.notes : "Not Yok"}
                                                </p>
                                            </td>

                                            {/* AI Özeti */}
                                            <td className="py-5 px-6 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${badgeBg} ${badgeText}`}>
                                                    <span className="material-symbols-outlined text-[14px]">{badgeIcon}</span>
                                                    {aiSummary}
                                                </span>
                                            </td>

                                            {/* Toplam Harcama & Randevu */}
                                            <td className="py-5 px-6 whitespace-nowrap text-right">
                                                <p className="text-[15px] font-extrabold text-slate-900">{stats.totalSpent > 0 ? stats.totalSpent.toLocaleString('tr-TR') + ' TL' : '0 TL'}</p>
                                                <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                                                    TOPLAM {stats.totalAppointments || 0} RANDEVU
                                                </p>
                                            </td>

                                            {/* İşlemler (Görüntüle / Düzenle) */}
                                            <td className="py-5 px-6 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/musteriler/${customer.id}`}
                                                        className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-bold text-xs rounded-xl hover:bg-[var(--color-primary)]/10 transition-all"
                                                        title="Görüntüle"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                                        Görüntüle
                                                    </Link>
                                                    <button
                                                        onClick={() => openEditModal(customer)}
                                                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-200 transition-all"
                                                        title="Düzenle"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">edit</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <MusteriEkleModal
                isOpen={isModalOpen}
                initialData={editingCustomer}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddCustomer}
            />
        </div>
    );
}
