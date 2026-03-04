"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Image from "next/image";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { logOut } from "@/app/actions/auth";
import { useRouter } from "next/navigation";

export function Header() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

    const handleLogout = () => {
        startTransition(async () => {
            await logOut();
            // Force a full redirect to clear all contexts
            window.location.href = "/login";
        });
    };

    return (
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-10 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-4 w-1/2">
                <GlobalSearch />
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                    <button className="p-2 rounded-full hover:bg-slate-50 relative transition-colors">
                        <span className="material-symbols-outlined text-slate-600">notifications</span>
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    <button className="p-2 rounded-full hover:bg-slate-50 transition-colors">
                        <span className="material-symbols-outlined text-slate-600">settings</span>
                    </button>
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                        <div className="text-right">
                            <p className="text-sm font-bold">Elif Hanım</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salon Sahibi</p>
                        </div>
                        <div className="size-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-slate-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-400">person</span>
                        </div>
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 origin-top-right transform animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1.5 flex flex-col">
                                <button className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">account_circle</span>
                                    Profilim
                                </button>
                                <button className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 font-medium hover:bg-slate-50 rounded-lg text-left transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">business</span>
                                    İşletme Ayarları
                                </button>
                                <div className="h-px bg-slate-100 my-1"></div>
                                <button
                                    onClick={handleLogout}
                                    disabled={isPending}
                                    className={`flex items-center gap-2 px-3 py-2.5 text-sm font-bold rounded-lg text-left transition-colors ${isPending ? 'text-slate-400 cursor-not-allowed' : 'text-rose-600 hover:bg-rose-50'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{isPending ? 'hourglass_empty' : 'logout'}</span>
                                    {isPending ? 'Çıkış Yapılıyor...' : 'Çıkış Yap'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
