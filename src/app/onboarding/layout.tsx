import { ReactNode } from "react";
import Image from "next/image";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-50/50 flex flex-col items-center">
            {/* Mascot Guide Header */}
            <div className="w-full max-w-5xl px-4 pt-6 md:pt-10 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="w-16 h-16 md:w-20 md:h-20 relative bg-white rounded-full shadow-lg p-1 border-2 border-purple-100 shrink-0 z-10">
                    <Image 
                        src="/mascot/2.png" 
                        alt="NYazılım Rehber" 
                        fill
                        className="object-contain rounded-full p-2"
                    />
                </div>
                <div className="bg-white px-5 py-3 md:py-4 rounded-2xl rounded-tl-none shadow border border-purple-50 max-w-lg mt-2 relative">
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-white border-l border-b border-purple-50 transform rotate-45"></div>
                    <p className="text-sm md:text-base text-slate-700 font-medium relative z-10">
                        Adım adım kurulumda size rehberlik edeceğim. Merak etmeyin, her şey çok kolay! ✨
                    </p>
                </div>
            </div>

            <div className="w-full max-w-5xl px-4 py-8">
                {children}
            </div>
        </div>
    );
}
