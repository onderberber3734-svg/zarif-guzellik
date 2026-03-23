"use client";

import { useState, useEffect } from "react";

const ADMIN_USERNAME = "zarifadmin";
const ADMIN_PASSWORD = "Zarif2026!";
const STORAGE_KEY = "superadmin_auth";

function LoginGate({ children }: { children: React.ReactNode }) {
    const [isAuthed, setIsAuthed] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Oturum kontrolü
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored === "true") {
            setIsAuthed(true);
        }
        setIsChecking(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            sessionStorage.setItem(STORAGE_KEY, "true");
            setIsAuthed(true);
        } else {
            setError("Kullanıcı adı veya şifre hatalı.");
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem(STORAGE_KEY);
        setIsAuthed(false);
        setUsername("");
        setPassword("");
    };

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin">
                    <span className="material-symbols-outlined text-4xl text-blue-400">progress_activity</span>
                </div>
            </div>
        );
    }

    if (!isAuthed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 relative overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl"></div>
                </div>

                <div className="relative w-full max-w-md mx-4">
                    {/* Logo / Icon */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center size-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl shadow-2xl shadow-blue-500/30 mb-6">
                            <span className="material-symbols-outlined text-white text-4xl">shield_lock</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">Süper Yönetici</h1>
                        <p className="text-blue-300/60 mt-2 text-sm font-medium">Bu alana yalnızca yetkili personel erişebilir.</p>
                    </div>

                    {/* Login Card */}
                    <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <span className="material-symbols-outlined text-red-400 text-xl shrink-0">error</span>
                                <p className="text-red-300 text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-blue-200/70 uppercase tracking-widest mb-2">Kullanıcı Adı</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">person</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Kullanıcı adınızı girin"
                                        autoComplete="username"
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all text-sm font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-blue-200/70 uppercase tracking-widest mb-2">Şifre</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">lock</span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all text-sm font-medium"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-xl">{showPassword ? "visibility_off" : "visibility"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full mt-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 flex items-center justify-center gap-2 text-sm"
                        >
                            <span className="material-symbols-outlined text-xl">login</span>
                            Giriş Yap
                        </button>
                    </form>

                    <p className="text-center mt-6 text-slate-500 text-xs font-medium">
                        <span className="material-symbols-outlined text-[14px] align-middle mr-1">info</span>
                        Yetkisiz erişim girişimleri kaydedilir.
                    </p>
                </div>
            </div>
        );
    }

    // Authed — paneli göster
    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sol menü */}
            <aside className="w-64 bg-slate-900 text-white min-h-screen p-6 hidden md:block border-r border-slate-800 flex-col">
                <div className="flex items-center gap-3 mb-10">
                    <span className="material-symbols-outlined text-3xl text-blue-400">admin_panel_settings</span>
                    <h1 className="text-xl font-bold tracking-tight">Süper Admin</h1>
                </div>

                <nav className="space-y-2 flex-1">
                    <a href="/superyonetici" className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 text-blue-400 rounded-xl font-semibold transition-colors">
                        <span className="material-symbols-outlined text-[20px]">store</span>
                        İşletmeler
                    </a>
                </nav>

                <div className="mt-auto pt-6 space-y-2 border-t border-slate-800">
                    <a href="/" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl font-semibold transition-colors">
                        <span className="material-symbols-outlined text-[20px]">exit_to_app</span>
                        Uygulamaya Dön
                    </a>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl font-semibold transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Çıkış Yap
                    </button>
                </div>
            </aside>

            {/* İçerik */}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LoginGate>{children}</LoginGate>;
}
