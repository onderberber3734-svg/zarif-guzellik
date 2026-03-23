export default function Step1({ onNext, isPending }: { onNext: (step: number) => void, isPending: boolean }) {
    return (
        <div className="bg-gradient-onboarding min-h-screen flex flex-col items-center justify-center p-6 text-slate-900 relative">
            <div className="fixed top-0 left-0 w-full p-8 flex flex-col items-center">
                <div className="w-full max-w-md flex flex-col items-center gap-3">
                    <div className="flex justify-between w-full items-end">
                        <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-lg leading-none">spa</span>
                            </div>
                            <span className="serif-heading text-lg font-bold text-primary">Zarif Güzellik</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Adım 1 / 8</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-1/6 rounded-full transition-all duration-500"></div>
                    </div>
                </div>
            </div>

            <main className="w-full max-w-2xl bg-white/70 backdrop-blur-xl border border-white/40 shadow-2xl shadow-purple-200/50 rounded-4xl overflow-hidden p-12 md:p-16 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700">
                <div className="relative mb-12">
                    <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full scale-150"></div>
                    <div className="relative size-48 md:size-56 bg-gradient-to-tr from-accent-pink to-accent-lilac rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-8xl text-primary/40 select-none">auto_awesome</span>
                        <span className="material-symbols-outlined absolute text-6xl text-primary/60 translate-x-4 -translate-y-4">brush</span>
                    </div>
                </div>

                <h1 className="serif-heading text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                    Zarif Güzellik'e <br />
                    <span className="text-primary">Hoş Geldiniz!</span>
                </h1>

                <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-md leading-relaxed font-medium">
                    Sadece 3-5 dakikada salonunuzu dijitalleştirin. Profesyonel yönetimin keyfini çıkarın.
                </p>

                <div className="w-full max-w-sm">
                    <button
                        onClick={() => onNext(2)}
                        disabled={isPending}
                        className="group w-full flex items-center justify-center gap-3 bg-primary text-white py-5 px-8 rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 hover:bg-primary/90 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
                    >
                        {isPending ? "Bekleniyor..." : "Hadi Başlayalım"}
                        <span className={`material-symbols-outlined transition-transform ${isPending ? 'animate-spin' : 'group-hover:translate-x-1'}`}>
                            {isPending ? 'progress_activity' : 'arrow_forward'}
                        </span>
                    </button>
                    <p className="mt-6 text-sm text-slate-400 font-medium">
                        Zaten bir hesabınız var mı? <a className="text-primary hover:underline" href="/">Giriş Yapın</a>
                    </p>
                </div>
            </main>

            <footer className="fixed bottom-8 text-center text-slate-400 text-sm font-medium">
                © 2024 Zarif Güzellik SaaS. Tüm hakları saklıdır.
            </footer>
        </div>
    );
}
