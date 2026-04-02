"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CustomerLink from "@/components/CustomerLink";

interface SearchResult {
    type: "customer" | "appointment" | "service";
    id: string;
    title: string;
    subtitle: string;
    url: string;
}

export function GlobalSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (!query.trim()) {
                setResults([]);
                setIsOpen(false);
                return;
            }

            setIsLoading(true);
            setIsOpen(true);

            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data.results);
                }
            } catch (error) {
                console.error("Arama hatası:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 300); // 300ms debounce
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setIsOpen(false);
            setQuery("");
        }
    };

    const handleResultClick = (url: string) => {
        setIsOpen(false);
        setQuery("");
        router.push(url);
    };

    return (
        <div ref={wrapperRef} className="relative w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
                className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 text-sm placeholder:text-slate-400 outline-none transition-all"
                placeholder="Müşteri, randevu veya hizmet ara..."
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (query.trim()) setIsOpen(true) }}
                onKeyDown={handleKeyDown}
            />

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-slate-500 font-medium flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                            Aranıyor...
                        </div>
                    ) : results.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto custom-scrollbar p-2">
                            {results.map((result, i) => (
                                <div
                                    key={`${result.type}-${result.id}-${i}`}
                                    onClick={() => handleResultClick(result.url)}
                                    className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors group"
                                >
                                    <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${result.type === 'customer' ? 'bg-purple-50 text-purple-600' :
                                        result.type === 'appointment' ? 'bg-blue-50 text-blue-600' :
                                            'bg-emerald-50 text-emerald-600'
                                        }`}>
                                        <span className="material-symbols-outlined text-xl">
                                            {result.type === 'customer' ? 'person' :
                                                result.type === 'appointment' ? 'event' :
                                                    'auto_awesome'}
                                        </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-slate-900 truncate group-hover:text-[var(--color-primary)] transition-colors">
                                            {result.title}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{result.subtitle}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-6 text-center text-slate-500">
                            <span className="material-symbols-outlined text-3xl mb-2 opacity-50">search_off</span>
                            <p className="text-sm font-medium">Sonuç bulunamadı</p>
                            <p className="text-xs mt-1">Lütfen farklı bir kelime ile tekrar deneyin.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
