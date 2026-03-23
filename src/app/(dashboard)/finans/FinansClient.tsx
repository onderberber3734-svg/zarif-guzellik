"use client";

import { useState, useTransition } from "react";
import CustomerLink from "@/components/CustomerLink";
import Link from "next/link";
import { addExpense, deleteExpense, getFinanceSummary, getOutstandingPayments, getExpenses, getTopServices } from "@/app/actions/finance";
import { OdemeAlModal } from "@/components/OdemeAlModal";
import { useRouter } from "next/navigation";

export default function FinansClient({ 
    initialSummary,
    initialOutstanding,
    initialExpenses,
    initialTopServices
}: { 
    initialSummary: any;
    initialOutstanding: any[];
    initialExpenses: any[];
    initialTopServices: any[];
}) {
    const router = useRouter();
    const [summary, setSummary] = useState(initialSummary || { revenue: 0, collections: 0, outstanding: 0, expenses: 0, profit: 0 });
    const [outstanding, setOutstanding] = useState(initialOutstanding || []);
    const [expenses, setExpenses] = useState(initialExpenses || []);
    const [topServices, setTopServices] = useState(initialTopServices || []);

    const [isPending, startTransition] = useTransition();
    const [filter, setFilter] = useState("this_month");
    
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        expense_date: new Date().toISOString().split('T')[0],
        category: 'Kira',
        title: '',
        amount: '',
        notes: ''
    });

    const expenseCategories = ["Kira", "Maaş / Prim", "Ürün / Sarf Malzeme", "Pazarlama ve Reklam", "Fatura", "Yazılım / Aidat", "Diğer"];

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPaymentPlan, setSelectedPaymentPlan] = useState<any>(null);

    const handleFilterChange = (newFilter: string) => {
        setFilter(newFilter);
        startTransition(async () => {
            const today = new Date();
            let start = new Date(today.getFullYear(), today.getMonth(), 1); // Varsayılan Bu Ay
            let end = today;

            if (newFilter === "today") {
                start = new Date(today);
            } else if (newFilter === "this_week") {
                const first = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
                start = new Date(today.setDate(first));
                end = new Date(today);
            } else if (newFilter === "last_month") {
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
            } else if (newFilter === "all_time") {
                start = new Date("2020-01-01");
            }

            const startDateStr = start.toISOString().split('T')[0];
            const endDateStr = end.toISOString().split('T')[0];

            const [sumRes, expRes, topRes] = await Promise.all([
                getFinanceSummary(startDateStr, endDateStr),
                getExpenses(startDateStr, endDateStr),
                getTopServices(startDateStr, endDateStr)
            ]);

            if (sumRes.success) setSummary(sumRes.data);
            if (expRes.success) setExpenses(expRes.data || []);
            if (topRes.success) setTopServices(topRes.data || []);
            
            // Outstanding değişmez (her zaman aktif bekleyenler) ama tekrar fetchleyebiliriz
            const outRes = await getOutstandingPayments();
            if (outRes.success) setOutstanding(outRes.data || []);
        });
    };

    const handleSaveExpense = async (e: any) => {
        e.preventDefault();
        if (!expenseForm.amount || !expenseForm.title) return alert("Tutarı ve Başlığı giriniz.");

        const res = await addExpense({
            expense_date: expenseForm.expense_date,
            category: expenseForm.category,
            title: expenseForm.title,
            amount: Number(expenseForm.amount),
            notes: expenseForm.notes
        });

        if (res.success) {
            setIsExpenseModalOpen(false);
            setExpenseForm({ ...expenseForm, title: '', amount: '', notes: '' });
            handleFilterChange(filter); // Verileri Yenile
        } else {
            alert("Hata: " + res.error);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm("Gider kaydı silinecek. Emin misiniz?")) return;
        const res = await deleteExpense(id);
        if (res.success) {
            handleFilterChange(filter);
        } else {
            alert("Silinemedi: " + res.error);
        }
    };

    return (
        <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header & Smart Fırsat Barı */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="material-symbols-outlined text-[var(--color-primary)] text-3xl">query_stats</span>
                        Kârlılık Paneli
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">Takvimi değil, kârlılığı yönetin. Gelirlerinizi, içerideki tahsilatlarınızı ve giderlerinizi takip edin.</p>
                </div>

                <div className="bg-white border text-sm font-bold border-slate-200 rounded-xl p-1 inline-flex items-center gap-1 shadow-sm">
                    {["today", "this_week", "this_month", "last_month", "all_time"].map((f, i) => {
                        const labels = ["Bugün", "Bu Hafta", "Bu Ay", "Geçen Ay", "Tüm Zamanlar"];
                        return (
                            <button 
                                key={f} 
                                onClick={() => handleFilterChange(f)}
                                className={`px-4 py-2 rounded-lg transition-all ${filter === f ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                {labels[i]}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Smart Action Önerisi */}
            {outstanding.length > 0 && (
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-purple-500/20 text-white animate-in slide-in-from-top duration-500">
                    <div className="flex items-center gap-4">
                        <div className="size-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md">
                            <span className="material-symbols-outlined text-3xl text-white">tips_and_updates</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-0.5">Yapay Zeka Tespiti: Tahsilat Fırsatı</h3>
                            <p className="text-white/80 font-medium text-sm">İçeride bekleyen toplam <strong>₺{summary.outstanding.toLocaleString('tr-TR')}</strong> bakiye var. {outstanding.length} müşerinin vadesi / seansı gelmiş. Hemen aksiyon alarak nakit akışınızı güçlendirin!</p>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                {isPending && <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 rounded-3xl flex items-center justify-center">
                    <span className="material-symbols-outlined animate-spin text-3xl text-emerald-500">progress_activity</span>
                </div>}

                {/* 1. TAHSİLAT (KASA) */}
                <div className="bg-white p-6 rounded-3xl border border-emerald-200/50 shadow-sm shadow-emerald-50 border-b-4 border-b-emerald-400 flex flex-col justify-between group cursor-default hover:border-emerald-300 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">payments</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Gelen Para (Kasa)</p>
                        <h3 className="text-3xl font-black text-emerald-600">₺{summary.collections.toLocaleString('tr-TR')}</h3>
                        <p className="text-[11px] text-emerald-600/60 font-medium mt-2">Müşterilerden direkt tahsil edilen toplam tutar.</p>
                    </div>
                </div>

                {/* 2. AÇIK BAKİYE */}
                <div className="bg-white p-6 rounded-3xl border border-amber-200/50 shadow-sm shadow-amber-50 border-b-4 border-b-amber-400 flex flex-col justify-between group cursor-default hover:border-amber-300 transition-all">
                    <div className="flex items-start justify-between mb-4">
                        <div className="size-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">hourglass_empty</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Dışarıdaki Para (Alacak)</p>
                        <h3 className="text-3xl font-black text-amber-600">₺{summary.outstanding.toLocaleString('tr-TR')}</h3>
                        <p className="text-[11px] text-amber-600/60 font-medium mt-2">Aktif paketlerden henüz tahsil edilmeyen alacağınız.</p>
                    </div>
                </div>

                {/* 3. NET KAR */}
                <div className={`p-6 rounded-3xl border border-b-4 flex flex-col justify-between group cursor-default transition-all ${
                    summary.profit >= 0 ? "bg-purple-50/50 border-purple-200 border-b-purple-500 shadow-purple-100 shadow-sm hover:border-purple-300" : "bg-rose-50/50 border-rose-200 border-b-rose-500 shadow-rose-100 shadow-sm hover:border-rose-300"
                }`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className={`size-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${summary.profit >= 0 ? 'bg-purple-100 text-[var(--color-primary)]' : 'bg-rose-100 text-rose-600'}`}>
                            <span className="material-symbols-outlined">account_balance</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${summary.profit >= 0 ? 'bg-[var(--color-primary)] text-white' : 'bg-rose-500 text-white'}`}>
                            {summary.profit >= 0 ? 'KARDA' : 'ZARARDA'}
                        </span>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Net Kârlılık</p>
                        <h3 className={`text-3xl font-black ${summary.profit >= 0 ? 'text-[var(--color-primary)]' : 'text-rose-600'}`}>
                            ₺{summary.profit.toLocaleString('tr-TR')}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-2">Kasa - Giderler. Gerçek işletme kârlılığınızı yansıtır.</p>
                    </div>
                </div>
            </div>

            {/* İki Kolonlu Yapı */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
                {isPending && <div className="absolute inset-0 z-10"></div>}

                {/* SOL: Aksiyon Fırsatları & Giderler */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Alacak Listesi (Tahsilat Odaklı) */}
                    <div className="bg-white border text-sm font-bold border-slate-200 shadow-sm rounded-3xl overflow-hidden flex flex-col h-[500px]">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-amber-500">warning</span>
                                    Öncelikli Tahsilat Hedefleri
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-1 font-medium">Borcu olup sıradaki seansı yaklaşmış/gecikmiş üyeler. Bu listeden hızlıca ödeme veya randevu talep edin.</p>
                            </div>
                            <span className="bg-amber-100 text-amber-700 font-extrabold px-3 py-1 rounded-full text-[10px] tracking-wider uppercase">
                                {outstanding.length} Fırsat
                            </span>
                        </div>
                        <div className="p-0 overflow-y-auto custom-scrollbar flex-1 relative">
                            {outstanding.length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-slate-400 text-center">
                                    <span className="material-symbols-outlined text-5xl mb-3 text-emerald-200">check_circle</span>
                                    <p className="font-bold text-slate-600 mb-1">Harika! İçeride alacağınız kalmamış.</p>
                                    <p className="text-xs font-medium">Satış yapmak için yeni paketler oluşturabilirsiniz.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white border-b border-slate-100 text-[9px] uppercase tracking-widest text-slate-400 font-bold sticky top-0 z-10">
                                            <th className="p-4 pl-5">Müşteri / Hizmet</th>
                                            <th className="p-4">Finansal Durum</th>
                                            <th className="p-4">Tahmini Seans</th>
                                            <th className="p-4 pr-5 text-right">Aksiyon</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {outstanding.map((o: any) => {
                                            const total = Number(o.package_total_price) || 0;
                                            const paid = Number(o.paid_amount) || 0;
                                            const req = total - paid;
                                            return (
                                                <tr key={o.id} className="hover:bg-amber-50/10 transition-colors group">
                                                    <td className="p-4 pl-5 align-top w-2/5">
                                                        <div className="flex flex-col gap-1">
                                                            <h4 className="font-bold text-slate-900 text-sm">
                                                                <CustomerLink id={o.customers?.id} firstName={o.customers?.first_name} lastName={o.customers?.last_name} className="hover:text-[var(--color-primary)] transition-colors" />
                                                            </h4>
                                                            <div className="text-[11px] text-slate-500 font-medium inline-flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[13px] text-slate-400">style</span>
                                                                {o.services?.name}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center justify-between text-xs font-bold w-full max-w-[120px]">
                                                                <span className="text-slate-400">Alınacak Borç:</span>
                                                                <span className="text-amber-600">₺{req.toLocaleString('tr-TR')}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between text-[10px] font-bold w-full max-w-[120px]">
                                                                <span className="text-slate-400">Ödenen:</span>
                                                                <span className="text-emerald-600">₺{paid.toLocaleString('tr-TR')}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 align-top">
                                                        {o.completed_sessions === 0 ? (
                                                            <div className="text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded w-max flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[14px]">event_busy</span>
                                                                1. Seansı Planlayın
                                                            </div>
                                                        ) : o.next_recommended_date ? (
                                                            <div className={`text-xs font-bold flex items-center gap-1 ${new Date(o.next_recommended_date) < new Date() ? 'text-rose-600 bg-rose-50 px-2 py-1 rounded w-max' : 'text-slate-600'}`}>
                                                                <span className="material-symbols-outlined text-[14px]">calendar_clock</span>
                                                                {new Date(o.next_recommended_date).toLocaleDateString('tr-TR')}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 pr-5 align-top text-right">
                                                        <div className="flex flex-col items-end gap-2">
                                                            <div className="flex gap-2">
                                                                <Link href={`/paket-seans`} className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded font-bold text-[10px] uppercase flex items-center gap-1">
                                                                     Detay
                                                                </Link>
                                                                {o.customers?.phone && (
                                                                    <a href={`tel:${o.customers?.phone}`} className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded font-bold text-[10px] uppercase flex items-center gap-1 transition-colors">
                                                                        <span className="material-symbols-outlined text-[12px]">call</span> Ara
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedPaymentPlan(o);
                                                                    setIsPaymentModalOpen(true);
                                                                }} 
                                                                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                                                            >
                                                                <span className="material-symbols-outlined text-[14px]">payments</span>
                                                                Ödeme Al
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Gider Tablosu */}
                    <div className="bg-white border text-sm font-bold border-slate-200 shadow-sm rounded-3xl overflow-hidden p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-rose-500">trending_down</span>
                                    İşletme Giderleri
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Bu listedeki kayıtlar "Kârlılık" metriklerini doğrudan etkiler.</p>
                            </div>
                            <button onClick={() => setIsExpenseModalOpen(true)} className="px-4 py-2 bg-slate-900 text-white hover:bg-black rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-md">
                                <span className="material-symbols-outlined text-[16px]">add</span>
                                Gider Ekle
                            </button>
                        </div>
                        
                        {expenses.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                                <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">receipt_long</span>
                                <p className="font-bold text-sm">Henüz bu dönemde gider kaydedilmemiş.</p>
                                <p className="text-xs mt-1">Giderleri işleyerek gerçek kârınızı görün.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                                            <th className="pb-3 px-2 font-bold">Tarih</th>
                                            <th className="pb-3 px-2 font-bold">Kategori / Başlık</th>
                                            <th className="pb-3 px-2 font-bold">Not</th>
                                            <th className="pb-3 px-2 font-bold text-right">Tutar</th>
                                            <th className="pb-3 pl-2 font-bold text-right">Aksiyon</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {expenses.map((e: any) => (
                                            <tr key={e.id} className="hover:bg-slate-50/50 group transition-colors">
                                                <td className="py-3 px-2 text-xs font-bold text-slate-600">
                                                    {new Date(e.expense_date).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="py-3 px-2">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{e.category}</span>
                                                        <span className="text-xs font-bold text-slate-800">{e.title}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2 text-xs text-slate-500 font-medium truncate max-w-[150px]" title={e.notes}>
                                                    {e.notes || '-'}
                                                </td>
                                                <td className="py-3 px-2 text-sm font-black text-rose-600 text-right">
                                                    ₺{(Number(e.amount) || 0).toLocaleString('tr-TR')}
                                                </td>
                                                <td className="py-3 pl-2 text-right">
                                                    <button onClick={() => handleDeleteExpense(e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600 rounded-lg">
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* SAĞ: Analiz Panel */}
                <div className="space-y-6">
                    <div className="bg-white border text-sm font-bold border-slate-200 shadow-sm rounded-3xl p-6 relative overflow-hidden h-[500px] flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-bl-full -z-10" />
                        
                        <div className="mb-6 shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[var(--color-primary)]">military_tech</span>
                                En Çok Kazandıran Hizmetler
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-1 font-medium">Bu dönemde tamamlanan randevuların (revenue) hizmet kırılımı.</p>
                        </div>
                        
                        <div className="space-y-5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            {topServices.length === 0 ? (
                                <p className="text-xs text-slate-400 font-medium italic">Bu dönemde tamamlanan randevu verisi yok.</p>
                            ) : topServices.map((ts, idx) => {
                                // max revenue'i alarak dinamik bar çizelim
                                const maxRev = topServices[0].revenue;
                                const widthPct = Math.max(10, (ts.revenue / maxRev) * 100);
                                return (
                                    <div key={idx} className="relative group">
                                        <div className="flex items-end justify-between mb-1.5">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-extrabold text-slate-400 flex items-center gap-1">
                                                    <div className={`size-3 text-[8px] flex items-center justify-center text-white rounded-sm font-bold ${idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-amber-700/50' : 'bg-slate-200'}`}>
                                                        #{idx + 1}
                                                    </div>
                                                    {ts.count} İşlem
                                                </span>
                                                <span className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-[var(--color-primary)] transition-colors">{ts.name}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-700">₺{ts.revenue.toLocaleString('tr-TR')}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-[var(--color-primary)] to-purple-400 rounded-full transition-all duration-1000" style={{ width: `${widthPct}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        {topServices.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-slate-100 shrink-0">
                                <Link href="/randevular" className="text-xs font-bold text-[var(--color-primary)] flex justify-center hover:underline">Tüm randevuları gör</Link>
                            </div>
                        )}
                    </div>
                    
                    {/* Küçük Not Kartı */}
                    <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-400">lightbulb</span>
                            Büyüme İpucu
                        </h4>
                        <p className="text-white/70 text-[11px] font-medium leading-relaxed">Sistem sadece gerçekleşen verileri gösterir. Bekleyen açık bakiyeden ("{summary.outstanding.toLocaleString('tr-TR')} ₺") tahsilat yaptıkça Nakit Kasa puanınız artar. Paketlere indirim uygulayıp tek kalemde kapatarak Net Kârlılığı yükseltin.</p>
                    </div>
                </div>
            </div>

            {/* GIDER EKLME MODAL */}
            {isExpenseModalOpen && (
                <>
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9998] transition-opacity animate-in fade-in" onClick={() => setIsExpenseModalOpen(false)}></div>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in zoom-in-95 overflow-hidden flex flex-col pointer-events-auto shadow-rose-900/10" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-slate-100 bg-rose-50/30">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-rose-500 text-2xl">account_balance_wallet</span> 
                                    Yeni Gider İşle
                                </h3>
                                <p className="text-xs text-slate-500 font-medium mt-1">Kira, maaş veya faturalarınızı gider olarak kaydedin.</p>
                            </div>
                            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 bg-white">
                                <div>
                                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">Tarih</label>
                                    <input type="date" required value={expenseForm.expense_date} onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">Kategori</label>
                                        <select required value={expenseForm.category} onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all">
                                            {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">Gider Başlığı</label>
                                        <input type="text" placeholder="Örn: Nisan Ayı Elektrik Faturası" required value={expenseForm.title} onChange={(e) => setExpenseForm({...expenseForm, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all placeholder:font-medium placeholder:text-slate-400" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">Tutar (₺)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₺</span>
                                            <input type="number" min="0" step="0.01" required value={expenseForm.amount} onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})} className="w-full pl-8 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-lg font-black text-slate-900 focus:ring-4 focus:ring-rose-100 focus:border-rose-500 outline-none transition-all" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5 block">Not (İsteğe Bağlı)</label>
                                    <textarea value={expenseForm.notes} onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none transition-all custom-scrollbar resize-none"></textarea>
                                </div>
                                <div className="pt-2 flex gap-3">
                                    <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">İptal</button>
                                    <button type="submit" className="flex-[2] px-4 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">add_task</span> Gideri Kaydet
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}

            {/* ÖDEME AL MODAL */}
            {isPaymentModalOpen && selectedPaymentPlan && (
                <OdemeAlModal
                    isOpen={isPaymentModalOpen}
                    onClose={() => {
                        setIsPaymentModalOpen(false);
                        setSelectedPaymentPlan(null);
                        handleFilterChange(filter); // Tahsilat sonrası finans verilerini yenile
                    }}
                    customerId={selectedPaymentPlan.customers?.id}
                    sessionPlanId={selectedPaymentPlan.id}
                    suggestedAmount={(Number(selectedPaymentPlan.package_total_price) || 0) - (Number(selectedPaymentPlan.paid_amount) || 0)}
                    title="Paket Ödemesi Al"
                    description={`${selectedPaymentPlan.customers?.first_name} ${selectedPaymentPlan.customers?.last_name} adlı müşteriden ${selectedPaymentPlan.services?.name} paketi için ödeme alıyorsunuz.`}
                />
            )}

        </div>
    );
}
