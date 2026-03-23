"use client";

import { useState } from "react";
import ProfilAyarlari from "./components/ProfilAyarlari";
import IsletmeAyarlari from "./components/IsletmeAyarlari";
import CalismaSaatleriAyarlari from "./components/CalismaSaatleriAyarlari";

export default function AyarlarClient({ user, business, initialWorkingHours }: any) {
    const [activeTab, setActiveTab] = useState("profil");

    const tabs = [
        { id: "profil", label: "Profilim", icon: "person" },
        { id: "isletme", label: "İşletme Bilgileri", icon: "store" },
        { id: "saatler", label: "Çalışma Saatleri", icon: "update" },
        { id: "bildirimler", label: "Bildirimler", icon: "notifications" },
    ];

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            <div className="flex justify-between items-end">
                <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">Sistem Ayarları</h2>
                    <p className="text-slate-500 mt-2 font-medium">Merkez bilgilerinizi, yetkilendirmeleri ve tercihleri yönetin.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sol Menü - Desktop'ta yapışkan */}
                <div className="lg:col-span-3">
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-4 sticky top-28">
                        <nav className="space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 ${activeTab === tab.id
                                            ? "bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 translate-x-1"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                >
                                    <span className={`material-symbols-outlined ${activeTab === tab.id ? '' : 'text-slate-400'}`}>
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                </button>
                            ))}
                        </nav>

                        <div className="mt-8 pt-6 border-t border-slate-100 px-4">
                            <button onClick={() => window.location.href = '/ayarlar/destek'} className="flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-[var(--color-primary)] transition-colors group">
                                <span className="material-symbols-outlined group-hover:-translate-y-0.5 transition-transform">help</span>
                                Destek Merkezi
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sağ İçerik Alanı */}
                <div className="lg:col-span-9">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[500px] overflow-hidden">
                        {activeTab === "profil" && (
                            <ProfilAyarlari user={user} />
                        )}

                        {activeTab === "isletme" && (
                            <IsletmeAyarlari business={business} />
                        )}

                        {activeTab === "saatler" && (
                            <CalismaSaatleriAyarlari initialHours={initialWorkingHours} />
                        )}

                        {activeTab === "bildirimler" && (
                            <div className="p-10 flex flex-col items-center justify-center min-h-[500px] text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">notifications_active</span>
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Bildirim Ayarları</h3>
                                <p className="text-slate-500 max-w-sm">
                                    Yakında SMS ve Email bildirim tercihlerinizi buradan yönetebileceksiniz.
                                </p>
                                <span className="mt-6 inline-flex px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Çok Yakında
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
