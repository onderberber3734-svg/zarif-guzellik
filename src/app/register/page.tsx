"use client";

import { useState } from "react";
import { signUp } from "@/app/actions/auth";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
    // 1: Kullanıcı Bilgileri, 2: İşletme Adı, 3: Success Animasyonu
    const [step, setStep] = useState(1);
    
    // Step 1
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    // Step 2
    const [businessName, setBusinessName] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleNextStep = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        if(!email || !password || !firstName || !lastName) {
           setError("Lütfen tüm alanları doldurun.");
           return;
        }
        
        if (password.length < 6) {
           setError("Şifreniz en az 6 karakter olmalıdır.");
           return;
        }
        setStep(2);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setLoading(true);

        const result = await signUp({ email, password, firstName, lastName, businessName });

        if (result.error) {
            setError(result.error);
            setLoading(false);
        } else {
            setStep(3); // Success Screen
            setSuccessMessage("Sihir başlıyor! NYazılım seni kurulum sihirbazına alıyor...");
            setTimeout(() => {
                window.location.href = "/onboarding";
            }, 3000);
        }
    };

    return (
        <div className="h-screen w-full bg-white flex flex-col md:flex-row font-sans overflow-hidden relative">
            
            {/* Sağ Tarafa Hafif Ambiyans Işıklandırması */}
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-100/80 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 pointer-events-none z-0"></div>
            <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-pink-100/80 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none z-0"></div>

            {/* Sol Taraf: Tipografi + Animasyon (Dengeli Boyutlar) */}
            <div className="w-full md:w-[55%] h-full flex flex-col items-center justify-start pt-[6vh] md:pt-[10vh] px-8 lg:px-12 xl:px-16 relative z-10">
                
                {/* İçerik Wrapper'ı (Sweet spot genişlik: Dengeli ferahlık) */}
                <div className="w-full max-w-[600px] xl:max-w-[700px] flex flex-col h-full">
                    
                    {/* Tipografi Alanı */}
                    <div className="flex-shrink-0 text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-50 border border-pink-100 text-pink-600 text-[11px] xl:text-xs font-bold uppercase tracking-widest mb-6 border border-pink-100/50 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                            ÜCRETSİZ DENEYİN
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl lg:text-[64px] xl:text-[72px] font-black tracking-tighter text-slate-900 leading-[1.05] mb-5 xl:mb-6">
                            Geleceğin salonunu <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 font-serif font-normal italic pr-2">bugün inşa et.</span>
                        </h1>
                        <p className="text-slate-500 font-medium max-w-[420px] xl:max-w-[500px] text-[15px] xl:text-[18px] leading-relaxed">
                            Asistanınızla tanışmaya hazır mısınız? Salonunuza özel kâr planınız saniyeler içinde hazır.
                        </p>
                    </div>
                    
                    {/* Maskot - Orantılı ve Dengeli Boyut */}
                    <div className="flex-grow w-full relative mt-4 md:mt-8 xl:mt-10 mb-[2vh] xl:mb-[5vh]">
                        {/* Maskot GIF - mix-blend-multiply ile beyaz arka plan gizleniyor */}
                        <div className="absolute inset-0 w-full h-full origin-top mix-blend-multiply">
                            <img 
                                src="/mascot/maskot-giris.gif"
                                alt="NYazılım Maskot"
                                className="w-full h-full object-contain object-bottom md:object-center"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sağ Taraf: Form Kartı (Dengeli Genişlik) */}
            <div className="w-full md:w-[45%] h-full flex items-center justify-center relative z-20">
                {/* Form Konteyneri: Optimal okunabilirlik */}
                <div className="w-full max-w-[420px] xl:max-w-[440px] px-6">
                    
                    {step === 3 ? (
                        /* Success Animasyonu */
                        <div className="text-center py-12 animate-in fade-in zoom-in duration-500">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-purple-50 mb-8 border border-purple-100 shadow-xl shadow-purple-500/10 relative">
                                <div className="absolute inset-0 rounded-full animate-ping bg-purple-400 opacity-20"></div>
                                <span className="material-symbols-outlined text-[48px] text-purple-600 animate-bounce">auto_awesome</span>
                            </div>
                            <h2 className="text-3xl xl:text-[36px] font-black text-slate-900 tracking-tight mb-4">Mükemmel!</h2>
                            <p className="text-[15px] xl:text-lg text-slate-600 font-medium">{successMessage}</p>
                            <div className="mt-10">
                                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                     <div className="bg-gradient-to-r from-purple-600 to-pink-500 h-full w-full animate-progress"></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10 flex items-end justify-between text-left">
                                <div>
                                    <h2 className="text-3xl xl:text-[36px] font-bold text-slate-900 tracking-tight mb-2">Kayıt Ol</h2>
                                    <p className="text-[14px] xl:text-[15px] text-slate-500 font-medium">Sizi ve salonunuzu tanıyalım.</p>
                                </div>
                                {/* Zarif Adım Göstergesi */}
                                <div className="flex gap-1.5 pb-2">
                                    <div className={`w-8 xl:w-10 h-1.5 rounded-full transition-all duration-500 cursor-pointer ${step === 1 ? 'bg-gradient-to-r from-purple-600 to-pink-500' : 'bg-slate-200 hover:bg-slate-300'}`} onClick={() => { if(step === 2) setStep(1); }}></div>
                                    <div className={`w-8 xl:w-10 h-1.5 rounded-full transition-all duration-500 ${step === 2 ? 'bg-gradient-to-r from-purple-600 to-pink-500' : 'bg-slate-200'}`}></div>
                                </div>
                            </div>

                            <form onSubmit={step === 1 ? handleNextStep : handleRegister}>
                                {error && (
                                    <div className="bg-red-50 text-red-600 text-[13px] p-4 rounded-2xl font-semibold border border-red-100 flex items-center gap-2 mb-6 animate-in slide-in-from-top-2">
                                        <span className="material-symbols-outlined text-[18px]">error</span>
                                        {error}
                                    </div>
                                )}

                                {step === 1 && (
                                    <div className="space-y-4 xl:space-y-5 animate-in fade-in fill-mode-both duration-400">
                                        <div className="flex gap-4">
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    required
                                                    value={firstName}
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="w-full px-5 py-4 xl:py-[18px] bg-slate-50/80 border border-slate-200/60 rounded-[1.25rem] text-slate-900 text-[14px] xl:text-[15px] font-semibold focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm"
                                                    placeholder="Adınız"
                                                />
                                            </div>
                                            <div className="relative flex-1">
                                                <input
                                                    type="text"
                                                    required
                                                    value={lastName}
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="w-full px-5 py-4 xl:py-[18px] bg-slate-50/80 border border-slate-200/60 rounded-[1.25rem] text-slate-900 text-[14px] xl:text-[15px] font-semibold focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm"
                                                    placeholder="Soyadınız"
                                                />
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-5 py-4 xl:py-[18px] bg-slate-50/80 border border-slate-200/60 rounded-[1.25rem] text-slate-900 text-[14px] xl:text-[15px] font-semibold focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm"
                                                placeholder="E-posta Adresi"
                                            />
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full px-5 py-4 xl:py-[18px] bg-slate-50/80 border border-slate-200/60 rounded-[1.25rem] text-slate-900 text-[14px] xl:text-[15px] font-semibold focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm"
                                                placeholder="Şifre"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className="relative w-full flex items-center justify-center py-4 xl:py-[20px] px-6 rounded-[1.25rem] overflow-hidden text-[14px] xl:text-[16px] font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all hover:-translate-y-1 mt-3 shadow-lg shadow-slate-900/10"
                                        >
                                            Devam Et <span className="material-symbols-outlined text-[18px] ml-2">east</span>
                                        </button>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-5 xl:space-y-6 animate-in slide-in-from-right-8 fade-in fill-mode-both duration-400">
                                        
                                        <div className="bg-purple-50/80 px-5 py-4 rounded-xl border border-purple-100 flex items-start gap-3 shadow-sm">
                                            <span className="material-symbols-outlined text-purple-600 text-[24px] mt-0.5">storefront</span>
                                            <p className="text-[14px] xl:text-[15px] text-purple-900 font-medium leading-relaxed">Harika ilerliyoruz, {firstName}! Son olarak işletme veya marka adınızı öğrenelim.</p>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                required
                                                value={businessName}
                                                onChange={(e) => setBusinessName(e.target.value)}
                                                className="w-full px-5 py-4 xl:py-[18px] bg-slate-50/80 border border-slate-200/60 rounded-[1.25rem] text-slate-900 text-[14px] xl:text-[15px] font-semibold focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm"
                                                placeholder="İşletmeniz Yada Markanız"
                                            />
                                        </div>

                                        <div className="flex gap-4 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="w-[30%] flex justify-center py-4 xl:py-[20px] px-5 border border-slate-200/60 rounded-[1.25rem] text-[14px] xl:text-[16px] font-bold text-slate-600 bg-slate-50 hover:bg-white hover:border-slate-300 transition-all shadow-sm"
                                            >
                                                Geri
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className={`group/btn relative w-[70%] flex items-center justify-center py-4 xl:py-[20px] px-6 rounded-[1.25rem] overflow-hidden shadow-lg shadow-purple-600/20 text-[14px] xl:text-[16px] font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 transition-all ${loading ? 'opacity-70 cursor-not-allowed transform-none shadow-none' : 'hover:-translate-y-1'}`}
                                            >
                                                <span className="relative z-10 flex items-center gap-2">
                                                    {loading ? 'Kayıt Olunuyor...' : <>Kayıt Ol <span className="material-symbols-outlined text-[18px] ml-2">east</span></>}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>

                            <div className="mt-10 pt-8 flex items-center justify-between border-t border-slate-100">
                                <p className="text-[13px] xl:text-[14px] text-slate-500 font-medium">
                                    Zaten bir salonunuz mu var?
                                </p>
                                <Link href="/login" className="inline-block text-[13px] xl:text-[14px] font-bold text-slate-800 hover:text-purple-600 transition-colors px-4 py-2.5 bg-slate-50 hover:bg-purple-50 rounded-xl">
                                    Giriş Yapın
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>

        </div>
    );
}
