"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
    const pathname = usePathname();

    const menuItems = [
        { label: "Panel", icon: "dashboard", href: "/" },
        { label: "Randevular", icon: "calendar_today", href: "/randevular" },
        { label: "Müşteriler", icon: "group", href: "/musteriler" },
        { label: "Hizmetler", icon: "content_cut", href: "/hizmetler" },
        { label: "Personel", icon: "badge", href: "/personel" },
        { label: "Paket & Seans", icon: "layers", href: "/paket-seans" },
        { label: "Salonlar", icon: "meeting_room", href: "/salonlar" },
        { label: "Finans", icon: "payments", href: "/finans" },
        { label: "Kampanyalar", icon: "campaign", href: "/kampanyalar" },
        { label: "AI Asistan", icon: "auto_awesome", href: "/ai-asistan", special: true },
    ];

    return (
        <aside className="w-72 bg-white border-r border-slate-100 flex flex-col fixed h-full z-10 transition-all duration-300">
            <div className="p-8 flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white shadow-md">
                    <span className="material-symbols-outlined text-2xl">spa</span>
                </div>
                <div>
                    <h1 className="text-xl font-bold text-[var(--color-primary)] tracking-tight">Zarif Güzellik</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Yönetici Paneli</p>
                </div>
            </div>
            <nav className="flex-1 px-4 space-y-1.5">
                {menuItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            id={`tour-${item.href === "/" ? "panel" : item.href.replace("/", "")}`}
                            className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl transition-all duration-200 active:scale-[0.98] ${isActive
                                ? "bg-purple-50 text-[var(--color-primary)] font-bold shadow-sm"
                                : "hover:bg-slate-50 text-slate-500 font-bold hover:text-slate-700"
                                }`}
                        >
                            <span className={`material-symbols-outlined transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                                {item.icon}
                            </span>
                            <span className="text-[14px] tracking-wide">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>
            <div className="p-6">
                <Link href="/randevu-olustur">
                    <button className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-4 rounded-2xl font-bold shadow-[0_8px_20px_rgba(104,50,219,0.25)] hover:shadow-[0_12px_25px_rgba(104,50,219,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200">
                        <span className="material-symbols-outlined">add</span>
                        Yeni Randevu
                    </button>
                </Link>
            </div>
        </aside>
    );
}
