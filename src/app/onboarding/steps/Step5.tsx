export default function Step5({ handleDemoData, onNext, onBack, isPending }: any) {
    return (
        <div className="bg-background-light min-h-screen flex flex-col items-center justify-center p-6 text-slate-900 relative">
            <header className="fixed top-0 left-0 w-full p-8 flex justify-center z-50">
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-2xl">spa</span>
                    </div>
                    <h1 className="serif-heading text-2xl font-bold text-primary">Zarif Güzellik</h1>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center w-full z-10 mt-20">
                <div className="max-w-2xl w-full bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-10 md:p-14 animate-in fade-in zoom-in-95 duration-700">
                    <div className="mb-10">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold uppercase tracking-widest text-primary">Adım 7 / 8</span>
                            <span className="text-xs font-semibold text-slate-400">Müşteri Aktarımı</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-5/6 bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"></div>
                        </div>
                    </div>

                    <div className="text-center mb-10">
                        <h2 className="serif-heading text-3xl font-bold mb-4">Müşterilerinizi Taşıyın</h2>
                        <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                            Eski sisteminizdeki müşteri listenizi saniyeler içinde içeri aktarın. Zarif Güzellik verilerinizi sizin için düzenler.
                        </p>
                    </div>

                    <div className="mb-8">
                        <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer group hover:border-primary hover:bg-primary/5">
                            <div className="size-16 rounded-2xl bg-accent-lilac flex items-center justify-center text-primary mb-4 transition-transform group-hover:scale-110">
                                <span className="material-symbols-outlined text-3xl">upload_file</span>
                            </div>
                            <h3 className="font-bold text-lg mb-1">CSV veya Excel Dosyası Yükleyin</h3>
                            <p className="text-xs text-slate-400">Dosyayı buraya sürükleyin veya göz atmak için tıklayın</p>
                            <p className="mt-4 text-[10px] text-slate-300 uppercase tracking-widest font-bold">Maksimum dosya boyutu: 10MB</p>
                        </div>
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={handleDemoData}
                                disabled={isPending}
                                className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline group disabled:opacity-50 disabled:no-underline"
                            >
                                <span className={`material-symbols-outlined text-lg ${isPending ? 'animate-spin' : ''}`}>
                                    {isPending ? 'progress_activity' : 'database'}
                                </span>
                                {isPending ? 'Veriler Yükleniyor, lütfen bekleyin...' : 'Örnek Demo Verisi Yükle (Sistemi Doldur)'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-10 py-6 border-y border-slate-50">
                        <div className="flex flex-col items-center text-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-xl">security</span>
                            <span className="text-[11px] font-medium text-slate-500 leading-tight">Güvenli Veri Aktarımı</span>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-xl">auto_fix_high</span>
                            <span className="text-[11px] font-medium text-slate-500 leading-tight">Otomatik Formatlama</span>
                        </div>
                        <div className="flex flex-col items-center text-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-xl">group_add</span>
                            <span className="text-[11px] font-medium text-slate-500 leading-tight">Sınırsız Kayıt</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button onClick={() => onNext(8)} disabled={isPending} className="w-full sm:w-1/3 py-4 text-slate-500 font-bold hover:text-slate-800 transition-colors text-sm disabled:opacity-50">
                            Atla
                        </button>
                        <button onClick={() => onNext(8)} disabled={isPending} className="w-full sm:w-2/3 py-4 px-8 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:-translate-y-0.5">
                            Yükle ve Devam Et
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </button>
                    </div>

                    <p className="mt-8 text-center text-[11px] text-slate-400 italic">
                        * Müşterilerinizi daha sonra "Müşteriler" sekmesinden de ekleyebilirsiniz.
                    </p>
                </div>
            </main>

            {/* Background floating icons matching Step 5 design's footer */}
            <footer className="fixed bottom-0 left-0 w-full p-8 opacity-20 pointer-events-none overflow-hidden h-32 z-0">
                <div className="absolute inset-0 flex items-center justify-center gap-12">
                    <span className="material-symbols-outlined text-8xl text-slate-300">content_cut</span>
                    <span className="material-symbols-outlined text-8xl text-slate-300">face</span>
                    <span className="material-symbols-outlined text-8xl text-slate-300">brush</span>
                    <span className="material-symbols-outlined text-8xl text-slate-300">self_care</span>
                    <span className="material-symbols-outlined text-8xl text-slate-300">dry_cleaning</span>
                </div>
            </footer>
        </div>
    );
}
