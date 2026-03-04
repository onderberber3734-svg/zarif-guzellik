"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBusinessProfile } from "@/app/actions/businesses";
import { createSalon } from "@/app/actions/salons";
import { seedDemoData } from "@/app/actions/seed";
import Image from "next/image";

export default function OnboardingClient({ business, services, salons }: { business: any, services: any[], salons: any[] }) {
    const [step, setStep] = useState(business.onboarding_step || 1);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Step 2 Form
    const [bizDetails, setBizDetails] = useState({
        phone: business.phone || "",
        city: business.city || "",
        address: business.address || "",
    });

    // Step 4 Form (Salon)
    const [salonName, setSalonName] = useState("");
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [localSalons, setLocalSalons] = useState(salons);

    const handleNextStep = async (nextStep: number) => {
        startTransition(async () => {
            const updates: any = { onboarding_step: nextStep };

            if (step === 2) {
                updates.phone = bizDetails.phone;
                updates.city = bizDetails.city;
                updates.address = bizDetails.address;
            }

            await updateBusinessProfile(business.id, updates);
            setStep(nextStep);
            router.refresh();
        });
    };

    const handleAddSalon = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const res = await createSalon({
                name: salonName,
                is_active: true,
                color_code: "#805ad5",
                service_ids: selectedServiceIds
            });

            if (res.success) {
                setLocalSalons(prev => [...prev, { name: salonName }]);
                setSalonName("");
                setSelectedServiceIds([]);
                router.refresh();
            } else {
                alert("Hata: " + res.error);
            }
        });
    };

    const handleDemoData = async () => {
        startTransition(async () => {
            const res = await seedDemoData();
            if (res.success) {
                alert(res.message);
                handleNextStep(6);
            } else {
                alert("Hata: " + res.message);
            }
        });
    };

    const completeOnboarding = async () => {
        startTransition(async () => {
            await updateBusinessProfile(business.id, {
                is_onboarding_completed: true,
                onboarding_step: 6 // Final step marker
            });
            window.location.href = "/";
        });
    };

    const totalSteps = 6;

    return (
        <div className="flex w-full min-h-[600px]">
            {/* Sol Pane - İlerleme */}
            <div className="w-1/3 bg-[var(--color-primary)] p-10 text-white flex flex-col justify-between hidden md:flex">
                <div>
                    <h2 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-purple-200">spa</span>
                        Zarif Güzellik
                    </h2>

                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/30 before:to-transparent">
                        {[
                            { n: 1, title: 'Hoş Geldiniz' },
                            { n: 2, title: 'İşletme Bilgileri' },
                            { n: 3, title: 'Hizmetler' },
                            { n: 4, title: 'Salon & Odalar' },
                            { n: 5, title: 'Örnek Veri Aktarımı' },
                            { n: 6, title: 'Kurulum Tamamlandı' }
                        ].map((s) => (
                            <div key={s.n} className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group transition-all duration-300 ${step === s.n ? 'opacity-100 scale-105' : step > s.n ? 'opacity-80' : 'opacity-40'}`}>
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-white/50 bg-[var(--color-primary)] shrink-0 font-bold z-10 transition-colors ${step >= s.n ? 'bg-white text-[var(--color-primary)] border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]' : ''}`}>
                                    {step > s.n ? <span className="material-symbols-outlined text-sm">check</span> : s.n}
                                </div>
                                <div className="ml-4 md:ml-0 md:group-odd:mr-4 md:group-even:ml-4 flex-1">
                                    <h4 className="font-bold text-sm tracking-wide">{s.title}</h4>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-8 text-white/50 text-sm">
                    Aşama {step} / {totalSteps}
                </div>
            </div>

            {/* Sağ Pane - İçerik */}
            <div className="w-full md:w-2/3 p-10 flex flex-col items-center justify-center relative bg-white">
                <div className="w-full max-w-md">
                    {step === 1 && (
                        <div className="text-center animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="size-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-symbols-outlined text-4xl text-[var(--color-primary)]">waving_hand</span>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Aramıza Hoş Geldiniz!</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed">Sistemi en verimli şekilde kullanabilmeniz için işletmenize özel kısa bir kurulum süreci başlatıyoruz. Bu adımları tamamladıktan sonra yönetim paneliniz kullanıma hazır olacak.</p>
                            <button onClick={() => handleNextStep(2)} disabled={isPending} className="w-full py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all flex justify-center items-center gap-2">
                                Kuruluma Başla
                                {isPending ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">İşletme Bilgileriniz</h2>
                            <p className="text-slate-500 mb-8 text-sm">Randevu hatırlatıcıları ve iletişim için kullanılacak temel bilgileri girelim.</p>

                            <div className="space-y-5 mb-8">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">İşletme Adı</label>
                                    <input type="text" disabled value={business.name} className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Telefon Numarası</label>
                                    <input type="tel" value={bizDetails.phone} onChange={e => setBizDetails({ ...bizDetails, phone: e.target.value })} placeholder="05XX XXX XX XX" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Açık Adres</label>
                                        <textarea value={bizDetails.address} onChange={e => setBizDetails({ ...bizDetails, address: e.target.value })} rows={2} placeholder="Mah. Sok. No: vs." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none"></textarea>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Şehir</label>
                                        <input type="text" value={bizDetails.city} onChange={e => setBizDetails({ ...bizDetails, city: e.target.value })} placeholder="İstanbul" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)} className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Geri</button>
                                <button onClick={() => handleNextStep(3)} disabled={isPending} className="flex-1 py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all flex justify-center items-center gap-2">
                                    Devam Et
                                    {isPending ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : null}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Varsayılan Hizmetleriniz</h2>
                            <p className="text-slate-500 mb-6 text-sm">Panelinizin boş kalmaması için sık kullanılan hizmetleri otomatik olarak ekledik. Bunları daha sonra panelden düzenleyebilirsiniz.</p>

                            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 mb-8 max-h-64 overflow-y-auto space-y-3">
                                {services.map(s => (
                                    <div key={s.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="size-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-sm">check</span>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800">{s.name}</h4>
                                                <p className="text-xs text-slate-400">{s.duration_minutes} dk</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-[var(--color-primary)]">₺{s.price}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep(2)} className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Geri</button>
                                <button onClick={() => handleNextStep(4)} disabled={isPending} className="flex-1 py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all flex justify-center items-center gap-2">
                                    Harika! Devam Et
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">İlk Odanızı / Salonunuzu Ekleyin</h2>
                            <p className="text-slate-500 mb-6 text-sm">Randevuların çakışmaması ve sistemin düzgün randevu programlayabilmesi için en az 1 oda tanımlamalısınız.</p>

                            {localSalons.length > 0 ? (
                                <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center mb-8">
                                    <div className="size-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <span className="material-symbols-outlined text-2xl">meeting_room</span>
                                    </div>
                                    <h4 className="text-emerald-800 font-bold mb-1">Oda Ekleme Başarılı!</h4>
                                    <p className="text-emerald-700 text-sm">Sisteme <strong>{localSalons.length}</strong> adet oda tanımlandı. Artık randevu almaya hazırsınız.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleAddSalon} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 mb-8">
                                    <div className="mb-4">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Oda Adı *</label>
                                        <input required type="text" value={salonName} onChange={e => setSalonName(e.target.value)} placeholder="Örn: VIP Cilt Bakım Odası" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none" />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Bu odada verilebilecek hizmetleri seçin:</label>
                                        <div className="max-h-32 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-white">
                                            {services.map(s => (
                                                <label key={s.id} className="flex items-center gap-2 cursor-pointer p-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedServiceIds.includes(s.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedServiceIds(prev => [...prev, s.id]);
                                                            else setSelectedServiceIds(prev => prev.filter(id => id !== s.id));
                                                        }}
                                                        className="w-4 h-4 rounded text-[var(--color-primary)]"
                                                    />
                                                    <span className="text-sm text-slate-700">{s.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <button type="submit" disabled={isPending || !salonName || selectedServiceIds.length === 0} className="w-full py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-all text-sm disabled:opacity-50">
                                        + Odayı Sisteme Ekle
                                    </button>
                                </form>
                            )}

                            <div className="flex gap-3">
                                <button onClick={() => setStep(3)} className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Geri</button>
                                <button onClick={() => handleNextStep(5)} disabled={isPending || localSalons.length === 0} className="flex-1 py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none">
                                    Devam Et
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Simülasyon Verisi Aktarımı</h2>
                            <p className="text-slate-500 mb-6 text-sm">Hazır Excel / CSV aktarımı aracı yakında eklenecektir. Şimdilik sistemin çalışmasını test etmek isterseniz otomatik <strong>Demo Müşteri ve Randevu Data</strong>sı üretebiliriz.</p>

                            <div className="space-y-4 mb-8">
                                <button onClick={handleDemoData} disabled={isPending} className="w-full border-2 border-dashed border-[var(--color-primary)]/50 bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold rounded-2xl p-6 transition-colors flex flex-col items-center justify-center gap-3">
                                    <span className="material-symbols-outlined text-4xl">database</span>
                                    {isPending ? "Üretiliyor..." : "Demo Veri Üret ve Ekle (Tavsiye Edilen)"}
                                    <span className="text-xs font-normal opacity-80 mt-1">Sisteme 65 müşteri ve ilgili geçmiş/gelecek randevuları eklenir, testleri canlı olarak yapabilirsiniz.</span>
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setStep(4)} className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Geri</button>
                                <button onClick={() => handleNextStep(6)} disabled={isPending} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:shadow-lg transition-all flex justify-center items-center gap-2">
                                    Şimdilik Atla
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 6 && (
                        <div className="text-center animate-in zoom-in-95 duration-500">
                            <div className="size-24 bg-gradient-to-tr from-[var(--color-primary)] to-purple-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-[var(--color-primary)]/30 ring-8 ring-purple-50">
                                <span className="material-symbols-outlined text-5xl text-white">celebration</span>
                            </div>
                            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Harika! Kurulum Tamamlandı</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed">İşletmenizin altyapısı kuruldu. Artık randevuları planlayabilir, müsait odalarınızı yönetebilir ve müşterileriniz ile sms etkileşimine geçebilirsiniz.</p>

                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-8 text-left text-sm space-y-2 text-slate-600">
                                <p className="flex justify-between border-b pb-2"><span className="font-bold">İşletme Adı</span> <span>{business.name}</span></p>
                                <p className="flex justify-between border-b pb-2 pt-1"><span className="font-bold">Tanımlı Hizmetler</span> <span>{services.length} adet</span></p>
                                <p className="flex justify-between pt-1"><span className="font-bold">Tanımlı Odalar</span> <span>{localSalons.length} adet</span></p>
                            </div>

                            <button onClick={completeOnboarding} className="w-full py-4 bg-[var(--color-primary)] text-white rounded-2xl font-bold text-lg hover:scale-[1.02] hover:shadow-xl hover:shadow-[var(--color-primary)]/40 hover:-translate-y-1 transition-all flex justify-center items-center gap-2">
                                Yönetim Paneline Geç
                                <span className="material-symbols-outlined font-bold">arrow_forward</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
