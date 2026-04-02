"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Image from "next/image";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { logOut } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { updateBusinessProfile, getBusinessProfile } from "@/app/actions/businesses";
import { addCustomer } from "@/app/actions/customers";
import { MusteriEkleModal } from "@/components/MusteriEkleModal";

export function Header() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isMusteriModalOpen, setIsMusteriModalOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    const [isPending, startTransition] = useTransition();
    const [userName, setUserName] = useState("Kullanıcı");
    const router = useRouter();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        }
        if (isDropdownOpen || isNotifOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen, isNotifOpen]);

    useEffect(() => {
        async function fetchUser() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.user_metadata) {
                const first = user.user_metadata.first_name || "";
                const last = user.user_metadata.last_name || "";
                if (first || last) {
                    setUserName(`${first} ${last}`.trim());
                } else if (user.user_metadata.full_name) {
                    setUserName(user.user_metadata.full_name);
                }
            }
        }
        fetchUser();
    }, []);

    const handleLogout = () => {
        startTransition(async () => {
            await logOut();
            // Force a full redirect to clear all contexts
            window.location.href = "/login";
        });
    };

    const handleStartTour = async () => {
        setIsDropdownOpen(false);
        const { data: b } = await getBusinessProfile();
        if (b) {
            await updateBusinessProfile(b.id, { is_tour_completed: false });
            router.push('/');
            router.refresh();
        }
    };

    const handleAddCustomer = async (customer: any) => {
        const { data: b } = await getBusinessProfile();
        if (b) {
            await addCustomer(customer);
            router.refresh();
        } else {
            throw new Error("İşletme profili bulunamadı.");
        }
    };

    return (
        <header className="h-20 bg-white border-b border-slate-100 px-10 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4 w-1/2">
                <GlobalSearch />
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="relative" ref={notifRef}>
                        <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="p-2 rounded-full hover:bg-slate-50 relative transition-colors">
                            <span className="material-symbols-outlined text-slate-600">notifications</span>
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        {isNotifOpen && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 origin-top-right transform animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-900 text-sm">Bildirimler</h3>
                                    <button className="text-[11px] text-[var(--color-primary)] font-bold hover:underline">Tümünü Okundu İşaretle</button>
                                </div>
                                <div className="flex-1 overflow-y-auto max-h-[300px] flex flex-col">
                                    <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                                        <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-emerald-600 text-[16px]">calendar_add_on</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 leading-tight">Ayşe Yılmaz yeni randevu oluşturdu.</p>
                                            <p className="text-xs text-slate-400 mt-1">5 dk önce</p>
                                        </div>
                                    </div>
                                    <div className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                                        <div className="size-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-rose-600 text-[16px]">campaign</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 leading-tight">"Doğum Günü" kampanyası 4 kişiye ulaştı.</p>
                                            <p className="text-xs text-slate-400 mt-1">2 saat önce</p>
                                        </div>
                                    </div>
                                    <div className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3">
                                        <div className="size-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[var(--color-primary)] text-[16px]">auto_awesome</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 leading-tight">AI Asistanınızın size yeni bir önerisi var.</p>
                                            <p className="text-xs text-slate-400 mt-1">Dün</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 border-t border-slate-100 text-center">
                                    <button onClick={() => { router.push('/ayarlar'); setIsNotifOpen(false); }} className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">Bildirim Ayarları</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button onClick={() => router.push('/ayarlar')} className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-slate-600">settings</span>
                    </button>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold">{userName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salon Sahibi</p>
                        </div>
                        <div className="size-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-slate-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400">person</span>
                        </div>
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 origin-top-right transform animate-in fade-in zoom-in-95 duration-200 overflow-hidden divide-y divide-slate-100">

                            {/* PROFİL & AYARLAR */}
                            <div className="p-2 flex flex-col">
                                <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Ayarlar</span>
                                <button onClick={() => { router.push('/ayarlar'); setIsDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px] text-slate-400">account_circle</span>
                                    Profilim
                                </button>
                                <button onClick={() => { router.push('/ayarlar'); setIsDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px] text-slate-400">business</span>
                                    İşletme Ayarları
                                </button>
                            </div>

                            {/* HIZLI AKSİYONLAR */}
                            <div className="p-2 flex flex-col">
                                <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">Hızlı Aksiyonlar</span>
                                <button onClick={() => { router.push('/randevu-olustur'); setIsDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-bold hover:bg-purple-50 hover:text-[var(--color-primary)] rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                    Yeni Randevu
                                </button>
                                <button onClick={() => { setIsMusteriModalOpen(true); setIsDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-bold hover:bg-purple-50 hover:text-[var(--color-primary)] rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                                    Yeni Müşteri
                                </button>
                                <button onClick={() => { router.push('/kampanyalar?action=new'); setIsDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-bold hover:bg-purple-50 hover:text-[var(--color-primary)] rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">campaign</span>
                                    Kampanya Oluştur
                                </button>
                                <button onClick={() => { router.push('/ai-asistan'); setIsDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-bold hover:bg-purple-50 hover:text-[var(--color-primary)] rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                                    Bugünün Öncelikleri
                                </button>
                            </div>

                            {/* YARDIM & ÇIKIŞ */}
                            <div className="p-2 flex flex-col">
                                <button onClick={handleStartTour} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px] text-slate-400">play_circle</span>
                                    Hızlı Tur Başlat
                                </button>
                                <button onClick={() => { router.push('/ayarlar/destek'); setIsDropdownOpen(false); }} className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px] text-slate-400">help</span>
                                    Destek Merkezi
                                </button>
                                <button
                                    onClick={handleLogout}
                                    disabled={isPending}
                                    className={`flex items-center gap-3 px-3 py-2 mt-1 text-sm font-bold rounded-lg text-left transition-colors ${isPending ? 'text-slate-400 cursor-not-allowed' : 'text-rose-600 hover:bg-rose-50'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{isPending ? 'hourglass_empty' : 'logout'}</span>
                                    {isPending ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals from Header */}
            <MusteriEkleModal
                isOpen={isMusteriModalOpen}
                onClose={() => setIsMusteriModalOpen(false)}
                onAdd={handleAddCustomer}
            />
        </header>
    );
}
