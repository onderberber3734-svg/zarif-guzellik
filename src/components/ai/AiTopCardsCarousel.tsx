"use client";

import { useRef, ReactNode } from "react";

interface AiTopCardsCarouselProps {
    winbackCard: ReactNode;
    emptySlotsCard: ReactNode;
}

export function AiTopCardsCarousel({ winbackCard, emptySlotsCard }: AiTopCardsCarouselProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (!scrollRef.current) return;
        const scrollAmount = direction === "left" ? -600 : 600;
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

    return (
        <div className="relative group w-full mb-8 lg:mb-12">
            {/* Sol Kaydırma Butonu */}
            <button 
                onClick={() => scroll("left")}
                className="absolute left-[-20px] lg:left-[-30px] top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-purple-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-0 focus:outline-none"
                style={{ backdropFilter: "blur(10px)" }}
            >
                <span className="material-symbols-outlined text-3xl">chevron_left</span>
            </button>

            {/* Scroll Container */}
            <div 
                ref={scrollRef}
                className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 pt-1 items-stretch"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
                <style dangerouslySetInnerHTML={{__html: `
                    ::-webkit-scrollbar { display: none; }
                `}} />
                
                {/* 1. Kart: Risk O Meter */}
                <div className="snap-start snap-always shrink-0 w-[85%] md:w-[70%] lg:w-[65%] xl:w-[60%] flex">
                    <div className="w-full flex">
                        {winbackCard}
                    </div>
                </div>

                {/* 2. Kart: Boş Slot Tahmini */}
                <div className="snap-start snap-always shrink-0 w-[85%] md:w-[70%] lg:w-[65%] xl:w-[60%] flex">
                    <div className="w-full flex">
                        {emptySlotsCard}
                    </div>
                </div>
            </div>

            {/* Sağ Kaydırma Butonu */}
            <button 
                onClick={() => scroll("right")}
                className="absolute right-[-20px] lg:right-[-30px] top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white rounded-full shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-purple-600 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 focus:outline-none"
            >
                <span className="material-symbols-outlined text-3xl">chevron_right</span>
            </button>
        </div>
    );
}
