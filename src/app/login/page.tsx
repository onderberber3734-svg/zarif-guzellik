"use client";

import { useState } from "react";
import { signIn } from "@/app/actions/auth";

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
            window.location.href = "/"; // Dashboard'a Yönledir
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="flex justify-center mb-4">
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-5xl">auto_awesome</span>
                </div>
                <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Tekrar Hoş Geldiniz</h2>
                <p className="mt-3 text-sm text-slate-500 font-medium">Salonunuzun durumu bugün harika görünüyor.</p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-10 px-8 shadow-2xl shadow-purple-500/10 sm:rounded-3xl border border-slate-100">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl font-medium border border-red-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">error</span>
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">E-posta Adresi</label>
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
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Şifre</label>
                                <a href="#" className="text-xs font-bold text-[var(--color-primary)] hover:opacity-80 transition-colors">Şifremi Unuttum</a>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]/30 text-sm font-medium transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-purple-500/20 text-sm font-bold text-white bg-[var(--color-primary)] hover:opacity-90 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500">
                            Salonunuz henüz kayıtlı değil mi? <a href="/register" className="font-bold text-[var(--color-primary)] hover:opacity-80 transition-colors">Hemen Başlayın</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
