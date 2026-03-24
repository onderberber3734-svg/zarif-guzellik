"use client";

import { useState, useTransition } from "react";
import { deleteBusinessCompletely, resetUserPassword } from "@/app/actions/superadmin";

interface AuthUser {
    id: string;
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    business_name: string;
    created_at: string;
    last_sign_in_at: string | null;
    provider: string;
}

export default function SuperAdminClient({ businesses, users }: { businesses: any[]; users: AuthUser[] }) {
    const [bizList, setBizList] = useState(businesses);
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<"businesses" | "users">("businesses");
    const [resetingUserId, setResetingUserId] = useState<string | null>(null);

    const handleResetPassword = async (userId: string, userName: string) => {
        const newPass = prompt(`"${userName}" kullanıcısı için yeni şifreyi girin (en az 6 karakter):`);
        if (!newPass) return;
        if (newPass.length < 6) {
            alert("Şifre en az 6 karakter olmalıdır.");
            return;
        }
        setResetingUserId(userId);
        const result = await resetUserPassword(userId, newPass);
        setResetingUserId(null);
        if (result.success) {
            alert(`✅ "${userName}" kullanıcısının şifresi başarıyla değiştirildi!\n\nYeni şifre: ${newPass}`);
        } else {
            alert(`❌ Şifre sıfırlama başarısız: ${result.error}`);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const prompt1 = confirm(`DİKKAT: "${name}" adlı işletmeyi silmek üzeresiniz.\nBu işlem geri alınamaz!\n\nEminseniz 'Tamam' butonuna basın.`);
        if (!prompt1) return;

        const prompt2 = prompt(`Eğer gerçekten eminseniz işletme adını ("${name}") aşağıya yazın:`);
        if (prompt2 !== name) {
            alert("İşlem iptal edildi veya isim yanlış girildi.");
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

    const tabs = [
        { key: "businesses" as const, label: "İşletmeler", icon: "store", count: bizList.length },
        { key: "users" as const, label: "Kullanıcılar", icon: "group", count: users.length },
    ];

    return (
        <div className="space-y-6">
            {/* Tab Bar */}
            <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                            }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                        {tab.label}
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* İşletmeler Tablosu */}
            {activeTab === "businesses" && (
                <>
                    {bizList.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
                            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">storefront</span>
                            <h3 className="text-xl font-bold text-slate-700">Sistemde Hiç İşletme Yok</h3>
                            <p className="text-slate-500 mt-2">Daha önce açılmış bir salon kaydı bulunmuyor.</p>
                        </div>
                    ) : (
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
                    )}
                </>
            )}

            {/* Kullanıcılar Tablosu */}
            {activeTab === "users" && (
                <>
                    {users.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm">
                            <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">person_off</span>
                            <h3 className="text-xl font-bold text-slate-700">Kayıtlı Kullanıcı Yok</h3>
                            <p className="text-slate-500 mt-2">Sistemde henüz kayıt olmak kullanıcı bulunmuyor.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">
                            {/* Bilgi Uyarısı */}
                            <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-center gap-3">
                                <span className="material-symbols-outlined text-amber-500 text-[18px]">info</span>
                                <p className="text-xs text-amber-700 font-medium">
                                    <strong>Not:</strong> Supabase şifreleri tek yönlü hashler (bcrypt). Şifreler veritabanından okunamaz, sadece sıfırlanabilir.
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kullanıcı</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">E-Posta</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Bağlı İşletme</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Son Giriş</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Kayıt Tarihi</th>
                                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksiyonlar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {users.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                                {/* Kullanıcı Adı */}
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-10 bg-gradient-to-br from-purple-100 to-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                                            {user.first_name?.[0] || ""}{user.last_name?.[0] || ""}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-900">
                                                                {user.first_name} {user.last_name}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                                {user.id.substring(0, 8)}...
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* E-Posta */}
                                                <td className="px-6 py-5 align-top">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-[16px] text-slate-400">mail</span>
                                                        <span className="text-sm text-slate-700 font-medium">{user.email}</span>
                                                    </div>
                                                </td>

                                                {/* Bağlı İşletme */}
                                                <td className="px-6 py-5 align-top">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${user.business_name !== "Bağlı değil"
                                                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                                                        : "bg-slate-100 text-slate-500 border border-slate-200"
                                                        }`}>
                                                        <span className="material-symbols-outlined text-[14px]">
                                                            {user.business_name !== "Bağlı değil" ? "store" : "link_off"}
                                                        </span>
                                                        {user.business_name}
                                                    </span>
                                                </td>

                                                {/* Son Giriş */}
                                                <td className="px-6 py-5 align-top">
                                                    <p className="text-xs text-slate-500">
                                                        {user.last_sign_in_at
                                                            ? new Date(user.last_sign_in_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                            : "Hiç giriş yapmamış"
                                                        }
                                                    </p>
                                                </td>

                                                {/* Kayıt Tarihi */}
                                                <td className="px-6 py-5 align-top">
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(user.created_at).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                </td>

                                                {/* Aksiyonlar */}
                                                <td className="px-6 py-5 align-top text-right">
                                                    <button
                                                        onClick={() => handleResetPassword(user.id, `${user.first_name} ${user.last_name}`)}
                                                        disabled={resetingUserId === user.id}
                                                        className="h-9 px-4 inline-flex items-center gap-2 bg-white text-amber-600 border border-slate-200 hover:border-amber-300 hover:bg-amber-50 rounded-xl font-bold transition-all text-sm disabled:opacity-50"
                                                    >
                                                        <span className={`material-symbols-outlined text-[18px] ${resetingUserId === user.id ? 'animate-spin' : ''}`}>
                                                            {resetingUserId === user.id ? 'progress_activity' : 'lock_reset'}
                                                        </span>
                                                        {resetingUserId === user.id ? 'Sıfırlanıyor...' : 'Şifre Sıfırla'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-50 border-t border-slate-200 p-4 text-center">
                                <p className="text-xs font-bold text-slate-500">Toplam {users.length} kayıtlı kullanıcı gösteriliyor.</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
