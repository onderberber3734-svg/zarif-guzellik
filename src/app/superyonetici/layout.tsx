export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Basit bir sol menü */}
            <aside className="w-64 bg-slate-900 text-white min-h-screen p-6 hidden md:block border-r border-slate-800">
                <div className="flex items-center gap-3 mb-10">
                    <span className="material-symbols-outlined text-3xl text-blue-400">admin_panel_settings</span>
                    <h1 className="text-xl font-bold tracking-tight">Süper Admin</h1>
                </div>

                <nav className="space-y-2">
                    <a href="/superyonetici" className="flex items-center gap-3 px-4 py-3 bg-blue-500/10 text-blue-400 rounded-xl font-semibold transition-colors">
                        <span className="material-symbols-outlined text-[20px]">store</span>
                        İşletmeler
                    </a>
                    <a href="/" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl font-semibold transition-colors mt-auto">
                        <span className="material-symbols-outlined text-[20px]">exit_to_app</span>
                        Asıl Uygulamaya Dön
                    </a>
                </nav>
            </aside>

            {/* İçerik */}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
