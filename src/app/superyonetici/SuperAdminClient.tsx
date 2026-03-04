"use client";

import { useState, useTransition } from "react";
import { deleteBusinessCompletely } from "@/app/actions/superadmin";

export default function SuperAdminClient({ businesses }: { businesses: any[] }) {
    const [bizList, setBizList] = useState(businesses);
    const [isPending, startTransition] = useTransition();

    const handleDelete = async (id: string, name: string) => {
        // İki aşamalı confirm. Çok kritik işlem!
        const prompt1 = confirm(`DİKKAT: "${name}" adlı işletmeyi silmek üzeresiniz.\nBu işlem geri alınamaz!\n\nEminseniz 'Tamam' butonuna basın.`);
        if (!prompt1) return;

        const prompt2 = prompt(`Eğer gerçekten eminseniz işletme adını ("${name}") aşağıya yazın:`);
        if (prompt2 !== name) {
            alert("İşlem iptal edildi veya isim yanlış girildı.");
            return;
        }

        startTransition(async () => {
            const result = await deleteBusinessCompletely(id);
            if (result.success) {
                alert(`${name} adlı işletme ve ona ait tüm veriler tamamen silindi.`);
                setBizList(prev => prev.filter(b => b.id !== id));
            } else {
                alert(`Silme başarısız: ${result.error}`);
            }
        });
    };

    if (bizList.length === 0) {
        return (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">storefront</span>
                <h3 className="text-xl font-bold text-slate-700">Sistemde Hiç İşletme Yok</h3>
                <p className="text-slate-500 mt-2">Daha önce açılmış bir salon kaydı bulunmuyor.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">İşletme Adı</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">İletişim & Lokasyon</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">İstatistikler</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kayıt / Kurulum</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksiyonlar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {bizList.map(biz => (
                            <tr key={biz.id} className="hover:bg-slate-50 transition-colors">
                                {/* İşletme Adı */}
                                <td className="px-6 py-5 align-top">
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
                                            {biz.name?.[0]?.toUpperCase() || "B"}
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-slate-900">{biz.name}</p>
                                            <p className="text-[11px] text-slate-400 font-mono mt-1">ID: {biz.id.substring(0, 8)}...</p>
                                        </div>
                                    </div>
                                </td>

                                {/* İletişim / Lokasyon */}
                                <td className="px-6 py-5 align-top">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                            <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                                            {biz.phone || "-"}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                            <span className="material-symbols-outlined text-[16px] text-slate-400">location_city</span>
                                            {biz.city || "-"}
                                        </div>
                                    </div>
                                </td>

                                {/* İstatistikler */}
                                <td className="px-6 py-5 align-top">
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 font-semibold mb-0.5">Kullanıcılar</span>
                                            <span className="font-bold text-slate-800">{biz.stats?.users || 0}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 font-semibold mb-0.5">Müşteriler</span>
                                            <span className="font-bold text-slate-800">{biz.stats?.customers || 0}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 font-semibold mb-0.5">Randevular</span>
                                            <span className="font-bold text-slate-800">{biz.stats?.appointments || 0}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 font-semibold mb-0.5">Odalar</span>
                                            <span className="font-bold text-slate-800">{biz.stats?.salons || 0}</span>
                                        </div>
                                    </div>
                                </td>

                                {/* Kayıt Durumu */}
                                <td className="px-6 py-5 align-top">
                                    <div className="space-y-2">
                                        <p className="text-xs text-slate-500">
                                            {new Date(biz.created_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                        {biz.is_onboarding_completed ? (
                                            <span className="inline-flex px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-md tracking-wider">Aktif (Kurulu)</span>
                                        ) : (
                                            <span className="inline-flex px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase rounded-md tracking-wider">Kurulum Bekliyor</span>
                                        )}
                                    </div>
                                </td>

                                {/* Aksiyonlar */}
                                <td className="px-6 py-5 align-top text-right">
                                    <button
                                        onClick={() => handleDelete(biz.id, biz.name)}
                                        disabled={isPending}
                                        className="h-9 px-4 inline-flex items-center gap-2 bg-white text-rose-600 border border-slate-200 hover:border-rose-300 hover:bg-rose-50 rounded-xl font-bold transition-all text-sm disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete_forever</span>
                                        Kökten Sil
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 p-4 text-center">
                <p className="text-xs font-bold text-slate-500">Toplam {bizList.length} işletme gösteriliyor.</p>
            </div>
        </div>
    );
}
