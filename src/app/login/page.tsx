"use client";

import { useState } from "react";
import { signIn } from "@/app/actions/auth";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        const result = await signIn({ email, password });

        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            window.location.href = "/"; // Dashboard'a Yönlendir
        }
    };

    return (
        <div className="h-screen w-full bg-white flex flex-col md:flex-row font-sans overflow-hidden relative">
            
            {/* Çok Hafif Sağ Işıklandırma (Sadece Formun Arkasında) */}
            <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-purple-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 pointer-events-none z-0"></div>
            <div className="absolute bottom-[10%] right-[5%] w-[500px] h-[500px] bg-pink-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 pointer-events-none z-0"></div>

            {/* Sol Taraf: Tipografi + Animasyon (Dengeli boyutlar) */}
            <div className="w-full md:w-[55%] h-full flex flex-col items-center justify-start pt-[6vh] md:pt-[10vh] px-8 lg:px-12 xl:px-16 relative z-10">
                
                {/* İçerik Wrapper'ı (Sweet spot genişlik: Dengeli ferahlık) */}
                <div className="w-full max-w-[600px] xl:max-w-[700px] flex flex-col h-full">
                    
                    {/* Tipografi Alanı */}
                    <div className="flex-shrink-0 text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100 text-purple-600 text-[11px] xl:text-xs font-bold uppercase tracking-widest mb-6 border border-purple-100/50 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                            NYazılım AI
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl lg:text-[64px] xl:text-[72px] font-black tracking-tighter text-slate-900 leading-[1.05] mb-5 xl:mb-6">
                            Takvimi değil,<br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 font-serif font-normal italic pr-2">kârınızı büyütün.</span>
                        </h1>
                        <p className="text-slate-500 font-medium max-w-[420px] xl:max-w-[500px] text-[15px] xl:text-[18px] leading-relaxed">
                            Salonunuzun temposunu düşürmeden gelirinizi katlayın. Bırakın sistem sizin yerinize düşünsün.
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

            {/* Sağ Taraf: Form Navigasyonu (Dengeli genişlik) */}
            <div className="w-full md:w-[45%] h-full flex items-center justify-center relative z-20">
                {/* Form Konteyneri: Optimal okunabilirlik */}
                <div className="w-full max-w-[420px] xl:max-w-[440px] px-6">
                    <div className="mb-10 text-left">
                        <h2 className="text-3xl xl:text-4xl font-bold text-slate-900 tracking-tight mb-2">Hoş Geldiniz</h2>
                        <p className="text-sm xl:text-[15px] text-slate-500 font-medium">Lütfen paneli görüntülemek için giriş yapın.</p>
                    </div>

                    <form className="space-y-5" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-50 text-red-600 text-[13px] p-4 rounded-2xl font-semibold border border-red-100 flex items-center gap-3 mb-4 animate-in slide-in-from-top-2">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                {/* Dengelenmiş Input Paddings */}
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
                                {/* Dengelenmiş Input Paddings */}
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-5 py-4 xl:py-[18px] bg-slate-50/80 border border-slate-200/60 rounded-[1.25rem] text-slate-900 text-[14px] xl:text-[15px] font-semibold focus:outline-none focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all shadow-sm"
                                    placeholder="Şifre"
                                />
                            </div>

                            <div className="flex justify-between items-center pt-1 px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-600/20" />
                                    <span className="text-[13px] xl:text-[14px] text-slate-500 font-medium group-hover:text-slate-800 transition-colors">Beni Hatırla</span>
                                </label>
                                <a href="#" className="text-[13px] xl:text-[14px] font-bold text-slate-500 hover:text-purple-600 transition-colors">Şifremi Unuttum</a>
                            </div>
                        </div>

                        {/* Dengelenmiş Buton Boyutları */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group/btn relative w-full flex items-center justify-center py-4 xl:py-[20px] px-6 rounded-[1.25rem] overflow-hidden shadow-xl shadow-purple-600/20 text-sm xl:text-[16px] font-bold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 transition-all ${loading ? 'opacity-70 cursor-not-allowed transform-none shadow-none' : 'hover:-translate-y-1 mt-3'}`}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {loading ? 'Giriş Yapılıyor...' : <>Giriş Yap <span className="material-symbols-outlined text-[18px] group-hover/btn:translate-x-1 transition-transform">east</span></>}
                            </span>
                        </button>
                    </form>

                    <div className="mt-10 xl:mt-12 pt-8 flex items-center justify-between border-t border-slate-100">
                        <p className="text-[13px] xl:text-[14px] text-slate-500 font-medium">
                            Hesabınız yok mu?
                        </p>
                        <Link href="/register" className="inline-block text-[13px] xl:text-[14px] font-bold text-slate-800 hover:text-purple-600 transition-colors px-4 py-2.5 bg-slate-50 hover:bg-purple-50 rounded-xl">
                            Hemen Başlayın
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
