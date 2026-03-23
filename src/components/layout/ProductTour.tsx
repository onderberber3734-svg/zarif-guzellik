"use client";

import { useState, useTransition, useEffect } from "react";
import { updateBusinessProfile } from "@/app/actions/businesses";
import { useRouter } from "next/navigation";

export function ProductTour({ businessId }: { businessId: string }) {
    const [isOpen, setIsOpen] = useState(true);
    const [step, setStep] = useState(0);
    const [isPending, startTransition] = useTransition();
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [windowIsReady, setWindowIsReady] = useState(false);
    const router = useRouter();

    const tourSteps = [
        {
            title: "Yönetim Paneline Hoş Geldiniz! 🚀",
            desc: "İşletmenizi bir üst seviyeye taşımak için harika bir adımdasınız! Sizin için hazırladığımız bu kısa eğitimle arayüzün temel mantığını öğrenebilirsiniz.",
            icon: "dashboard",
            targetId: "welcome",
            buttonText: "Eğitime Başla"
        },
        {
            title: "Hizmetlerinizi Seçin",
            desc: "Müşterilerinizin ne satın alacağını bilmesi gerekir. Hizmetler sekmesine girerek yüzlerce hizmetten işletmenize uygun olanları tanımlayıp, fiyat ve süreyi belirleyebilirsiniz.",
            icon: "content_cut",
            targetId: "tour-hizmetler",
            mockRender: () => (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-3 h-full justify-center">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm hover:-translate-y-1 transition-transform cursor-default">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-primary text-[20px]">content_cut</span>
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-slate-800">Saç Kesimi</p>
                                <p className="text-[11px] text-slate-500">45 Dk</p>
                            </div>
                        </div>
                        <span className="font-bold text-slate-800 text-[13px]">₺250</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm opacity-50">
                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-slate-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400 text-[20px]">brush</span>
                            </div>
                            <div>
                                <p className="text-[13px] font-bold text-slate-800">Saç Boyama</p>
                                <p className="text-[11px] text-slate-500">90 Dk</p>
                            </div>
                        </div>
                        <span className="font-bold text-slate-800 text-[13px]">₺600</span>
                    </div>
                </div>
            )
        },
        {
            title: "Oda ve Salon Yönetimi",
            desc: "İşletmenizdeki koltukları, VIP odaları veya istasyonları tanımlayabilir, hangi odada hangi hizmetlerin verileceğini ayarlayabilirsiniz.",
            icon: "meeting_room",
            targetId: "tour-salonlar",
            mockRender: () => (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-3 h-full justify-center">
                    <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-amber-400 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-2 bg-amber-50 rounded-bl-xl group-hover:bg-amber-100 transition-colors">
                            <span className="material-symbols-outlined text-amber-500 text-[16px]">star</span>
                        </div>
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800 text-[14px]">VIP Salon</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mb-4">Mevcut İşlem: Cilt Bakımı</p>
                        <div className="flex gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-300 text-[16px]">chair</span>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_10px_rgba(127,32,223,0.2)]">
                                <span className="material-symbols-outlined text-primary text-[16px]">chair</span>
                            </div>
                            <div className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-300 text-[16px]">add</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Müşterileriniz ile Etkileşim",
            desc: "Sisteminize eklediğiniz müşteriler veya size yeni gelenler burada toplanır. Onların randevu geçmişini ve işlemlerini kolayca takip edebilirsiniz.",
            icon: "group",
            targetId: "tour-musteriler",
            mockRender: () => (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-3 h-full justify-center">
                    <div className="bg-white p-5 rounded-xl shadow-md border border-slate-100">
                        <p className="text-[13px] font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">person_add</span>
                            Yeni Müşteri Ekle
                        </p>
                        <div className="space-y-3">
                            <div className="h-9 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-center px-3 relative">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider absolute -top-2 left-2 bg-white px-1">Sayın</span>
                                <span className="text-[12px] text-slate-700 font-medium">Ayşe Yılmaz</span>
                            </div>
                            <div className="h-9 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-center px-3 relative">
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider absolute -top-2 left-2 bg-white px-1">Telefon</span>
                                <span className="text-[12px] text-slate-700 font-medium">+90 555 123 4567</span>
                            </div>
                        </div>
                        <div className="mt-5 h-9 bg-primary text-white rounded-xl flex items-center justify-center text-[13px] font-bold shadow-lg shadow-primary/20 cursor-pointer hover:-translate-y-0.5 transition-transform">
                            Kaydet
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Randevuları Düzenleyin",
            desc: "Müşterilerin aldıkları hizmetleri salon ve saatlere göre takvim üzerinde görün. Çakışmaları veya iptalleri buradan kolayca yönetin.",
            icon: "calendar_month",
            targetId: "tour-randevular",
            mockRender: () => (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-2 h-full justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full pointer-events-none" />

                    <div className="w-full flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-bold w-8 text-right">10:00</span>
                        <div className="h-[1px] bg-slate-200 flex-1" />
                    </div>

                    <div className="ml-11 bg-white border-l-4 border-primary p-3 rounded-lg shadow-sm text-xs relative z-10 hover:-translate-y-1 transition-transform cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-slate-800 text-[13px]">Ayşe Yılmaz</p>
                            <span className="material-symbols-outlined text-slate-300 text-[14px]">more_vert</span>
                        </div>
                        <p className="text-slate-500 text-[11px]">Saç Boyama • VIP Oda</p>
                        <div className="mt-2 flex gap-1">
                            <div className="size-5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Ayşe`} alt="avatar" />
                            </div>
                        </div>
                    </div>

                    <div className="w-full flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 font-bold w-8 text-right">11:00</span>
                        <div className="h-[1px] bg-slate-200 flex-1" />
                    </div>
                </div>
            )
        },
        {
            title: "Satışları Kampanyalarla Artırın",
            desc: "Doğum günleri, özel tatiller veya boşta kaldığınız saatleri değerlendirmek için yapay zeka destekli hedefi on ikiden vuran hatırlatıcı kampanyalar ile müşteriyi geri çekin.",
            icon: "campaign",
            targetId: "tour-kampanyalar",
            mockRender: () => (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-center h-full">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 p-4 rounded-xl w-full relative shadow-sm hover:shadow-md transition-shadow">
                        <div className="absolute -top-3 -right-3 bg-rose-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg animate-[bounce_2s_infinite]">
                            %20 İndirim
                        </div>
                        <div className="flex gap-2 items-center mb-3">
                            <div className="size-8 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600 text-[16px]">sms</span>
                            </div>
                            <span className="text-[13px] font-bold text-green-900">Doğum Günü SMS</span>
                        </div>
                        <div className="bg-white/60 p-3 rounded-lg border border-green-100/50">
                            <p className="text-[12px] text-green-800 leading-relaxed font-medium">"Mutlu yıllar Ayşe! Bugün sana özel tüm hizmetlerde %20 indirim fırsatını kaçırma!"</p>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <span className="text-[10px] text-green-600 font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">send</span> 150 Gönderim
                            </span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Yapay Zeka Her An Yanınızda",
            desc: "Zarif Güzellik'in AI Asistanı, müşterilerinizin yoğunluk günlerine göre analiz yapıp gelirinizi artıracak akıllı ipuçları ve mali analizler sunar.",
            icon: "auto_awesome",
            targetId: "tour-ai-asistan",
            mockRender: () => (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-3 h-full justify-center">
                    <div className="flex gap-3 items-start w-full">
                        <div className="size-8 rounded-full bg-accent-lilac text-primary flex items-center justify-center shrink-0 shadow-sm border border-primary/10">
                            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                        </div>
                        <div className="bg-white p-3 rounded-2xl rounded-tl-sm shadow-sm text-[12px] text-slate-700 border border-slate-200 flex-1 relative overflow-hidden group hover:border-primary/30 transition-colors">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full" />
                            <p className="leading-relaxed relative z-10 font-medium">
                                "Önümüzdeki Cuma öğleden sonra boşluğunuz var. Geçen ay gelen müşterilerinize %10 indirimli kampanya çıkalım mı?"
                            </p>
                            <div className="mt-3 flex gap-2 relative z-10">
                                <div className="px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-bold cursor-pointer hover:bg-primary/90 transition-colors text-center flex-1">
                                    Evet, Kampanya Oluştur
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    useEffect(() => {
        setWindowIsReady(true);
        if (!isOpen) return;

        const handleUpdateRect = () => {
            const currentStep = tourSteps[step];
            if (currentStep.targetId !== "welcome") {
                const el = document.getElementById(currentStep.targetId);
                if (el) {
                    setTargetRect(el.getBoundingClientRect());
                }
            } else {
                setTargetRect(null);
            }
        };

        handleUpdateRect();

        // Update target rect on resize
        window.addEventListener("resize", handleUpdateRect);
        return () => window.removeEventListener("resize", handleUpdateRect);
    }, [step, isOpen]);

    if (!isOpen || !windowIsReady) return null;

    const handleNext = () => setStep((p) => p + 1);

    const handleFinish = () => {
        startTransition(async () => {
            await updateBusinessProfile(businessId, { is_tour_completed: true });
            setIsOpen(false);
            router.refresh();
        });
    };

    const currentStep = tourSteps[step];
    const isWelcome = step === 0;

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop & Spotlight Overlay */}
            {isWelcome ? (
                // Full backdrop with blur for welcome screen
                <div className="absolute inset-0 bg-slate-900/40 transition-all duration-500 pointer-events-auto" />
            ) : (
                // Box-shadow cutout spotlight trick over the specific element
                targetRect && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-auto transition-all duration-500">
                        <div
                            className="absolute rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] pointer-events-none ring-[10000px] ring-slate-900/40 border border-primary/50"
                            style={{
                                top: targetRect.top - 8,
                                left: targetRect.left - 8,
                                width: targetRect.width + 16,
                                height: targetRect.height + 16,

                            }}
                        />
                    </div>
                )
            )}

            {/* Content Popover */}
            <div
                className={`absolute transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] pointer-events-auto bg-white ${currentStep.mockRender ? 'max-w-2xl' : 'max-w-sm'} w-full rounded-[2rem] shadow-2xl p-8 border border-slate-100 ${isWelcome ? 'scale-100 opacity-100 shadow-[0_20px_60px_-15px_rgba(127,32,223,0.3)]' : 'scale-100 opacity-100'}`}
                style={
                    isWelcome
                        ? {
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)'
                        }
                        : targetRect ? {
                            left: Math.min(window.innerWidth - (currentStep.mockRender ? 650 : 400), targetRect.right + 24),
                            top: Math.max(24, Math.min(window.innerHeight - 350, targetRect.top - 50))
                        } : {
                            display: 'none'
                        }
                }
            >
                {/* Connector arrow for specific targeting (Desktop only visualization hint) */}
                {!isWelcome && targetRect && (
                    <div
                        className="absolute w-4 h-4 bg-white border-l border-b border-slate-100 rotate-45"
                        style={{
                            left: -8,
                            top: Math.max(24, Math.min(100, (targetRect.top - (Math.max(24, targetRect.top - 50))) + (targetRect.height / 2))) // pointing roughly to the item
                        }}
                    />
                )}

                <div className={currentStep.mockRender ? "grid md:grid-cols-2 gap-8 h-full" : "h-full"}>
                    <div className="flex flex-col h-full">
                        <div className="text-left mb-8 flex-1">
                            <div className="size-16 bg-accent-lilac text-primary rounded-2xl flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-3xl">{currentStep.icon}</span>
                            </div>
                            <h3 className="serif-heading text-2xl font-bold text-slate-900 mb-3">{currentStep.title}</h3>
                            <p className="text-slate-500 text-[14px] leading-relaxed">
                                {currentStep.desc}
                            </p>
                        </div>

                        <div className="flex justify-between items-center mt-auto pt-6 border-t border-slate-50">
                            <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
                                {isWelcome ? "Giriş" : `Adım ${step} / ${tourSteps.length - 1}`}
                            </span>
                            <div className="flex gap-2">
                                {step < tourSteps.length - 1 ? (
                                    <>
                                        <button onClick={handleFinish} disabled={isPending} className="px-4 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm disabled:opacity-50">
                                            Atla
                                        </button>
                                        <button onClick={handleNext} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2">
                                            {currentStep.buttonText || "Sonraki"}
                                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={handleFinish} disabled={isPending} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2 disabled:opacity-50">
                                        {isPending ? 'Bekleniyor...' : 'Tamamla'}
                                        {isPending ? <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> : <span className="material-symbols-outlined text-lg">check_circle</span>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {currentStep.mockRender && (
                        <div className="hidden md:block h-full">
                            {currentStep.mockRender()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
