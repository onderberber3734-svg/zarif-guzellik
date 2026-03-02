import Image from "next/image";
import { GlobalSearch } from "@/components/search/GlobalSearch";

export function Header() {
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
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-sm font-bold">Elif Hanım</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salon Sahibi</p>
                    </div>
                    <div className="size-10 rounded-full bg-slate-200 overflow-hidden ring-2 ring-slate-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400">person</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
