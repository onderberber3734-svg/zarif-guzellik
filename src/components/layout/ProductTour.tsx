"use client";

import { useState, useTransition } from "react";
import { updateBusinessProfile } from "@/app/actions/businesses";
import { useRouter } from "next/navigation";

export function ProductTour({ businessId }: { businessId: string }) {
    const [isOpen, setIsOpen] = useState(true);
    const [step, setStep] = useState(1);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    if (!isOpen) return null;

    const handleNext = () => setStep((p) => p + 1);

    const handleFinish = () => {
        startTransition(async () => {
            await updateBusinessProfile(businessId, { is_tour_completed: true });
            setIsOpen(false);
            router.refresh();
        });
    };

    const tourSteps = [
        {
            title: "Yönetim Paneline Hoş Geldiniz! 🚀",
            desc: "Burası işletmenizin kalbi. Günlük randevularınızı, tahmini gelirinizi ve salon performansınızı tek bir ekranda görebilirsiniz.",
            icon: "dashboard"
        },
        {
            title: "Randevuları Kolayca Yönetin",
            desc: "Randevular butonuna tıklayarak takvimi görebilir, sol üstteki 'Yeni Randevu' ile hızlıca yeni işlemler ekleyebilirsiniz.",
            icon: "calendar_month"
        },
        {
            title: "Müşterileriniz Artık Daha Sadık",
            desc: "Kampanyalar menüsünden özel gün indirimleri veya hatırlatıcı SMS'ler göndererek müşteri kaybını minimuma indirin.",
            icon: "campaign"
        },
        {
            title: "Yapay Zeka Sizi Yönlendirsin",
            desc: "Bizim akıllı asistanımız boş saatlerinizi analiz edecek ve gelirinizi artırmak için size günlük aksiyon önerilerinde bulunacak.",
            icon: "auto_awesome"
        }
    ];

    const currentStep = tourSteps[step - 1];

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-300 relative">

                {/* İlerleme Noktaları */}
                <div className="flex justify-center gap-2 mb-8">
                    {tourSteps.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i + 1 === step ? 'w-8 bg-[var(--color-primary)]' : 'w-2 bg-slate-200'}`} />
                    ))}
                </div>

                <div className="text-center mb-10 min-h-[160px]">
                    <div className="size-16 bg-purple-50 text-[var(--color-primary)] rounded-2xl flex items-center justify-center mx-auto mb-6 transform transition-transform duration-300 hover:scale-110">
                        <span className="material-symbols-outlined text-3xl">{currentStep.icon}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">{currentStep.title}</h3>
                    <p className="text-slate-500 text-[15px] leading-relaxed">
                        {currentStep.desc}
                    </p>
                </div>

                <div className="flex gap-3">
                    {step < tourSteps.length ? (
                        <>
                            <button onClick={handleFinish} disabled={isPending} className="px-5 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm">
                                Turu Atla
                            </button>
                            <button onClick={handleNext} className="flex-1 py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all text-sm flex justify-center items-center gap-2">
                                İleri
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        </>
                    ) : (
                        <button onClick={handleFinish} disabled={isPending} className="w-full py-4 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all text-sm flex justify-center items-center gap-2">
                            {isPending ? 'Bekleniyor...' : 'Sistemi Kullanmaya Başla'}
                            {isPending ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">rocket_launch</span>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
