"use client";

import { useState } from "react";
import { signUp, signIn } from "@/app/actions/auth";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [businessName, setBusinessName] = useState("");

    // Yükleniyor ve hata yönetimi state'leri
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMessage("");
        setLoading(true);

        const result = await signUp({ email, password, businessName });

        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            // Başarılı olursa kullanıcıya bilgi ver ya da Dashboard'a yönlendir
            setSuccessMessage("Kullanıcı ve İşletme başarıyla oluşturuldu! Yönlendiriliyorsunuz...");
            setTimeout(() => {
                window.location.href = "/";
            }, 2000);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Kayıt Ol</h2>
                <p className="mt-3 text-sm text-slate-500 font-medium">Salonunuzun AI asistanı ile tanışın.</p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-8 shadow-2xl shadow-purple-500/10 sm:rounded-3xl border border-slate-100">
                    <form className="space-y-6" onSubmit={handleRegister}>
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl font-medium border border-red-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                {error}
                            </div>
                        )}
                        {successMessage && (
                            <div className="bg-green-50 text-green-600 text-sm p-4 rounded-xl font-medium border border-green-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                {successMessage}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">İşletme Adı *</label>
                            <input
                                type="text"
                                required
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/30 text-sm font-medium transition-all"
                                placeholder="Örn: Zarif Güzellik Nişantaşı"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-posta Adresi *</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/30 text-sm font-medium transition-all"
                                placeholder="info@zarifguzellik.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Şifre *</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/30 text-sm font-medium transition-all"
                                placeholder="En az 6 karakter"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-purple-500/20 text-sm font-bold text-white bg-[var(--color-primary)] hover:opacity-90 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol ve Başla'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500">
                            Zaten hesabınız var mı? <a href="/login" className="font-bold text-[var(--color-primary)] hover:opacity-80 transition-colors">Giriş Yapın</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
