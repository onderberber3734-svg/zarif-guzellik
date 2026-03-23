export default function Step6({ business, servicesCount, salonsCount, completeOnboarding }: any) {
    return (
        <div className="bg-gradient-onboarding min-h-screen flex items-center justify-center p-6 text-slate-900 relative overflow-hidden">
            {/* Background decorations matching the radial gradients in CSS */}
            <div className="absolute top-0 right-0 w-2/3 h-2/3 max-w-xl max-h-xl bg-accent-lilac opacity-50 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2 z-0"></div>
            <div className="absolute bottom-0 left-0 w-2/3 h-2/3 max-w-xl max-h-xl bg-accent-pink opacity-50 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2 z-0"></div>

            <div className="max-w-3xl w-full bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-700 fade-in">
                <div className="absolute top-10 left-10 text-primary opacity-20">
                    <span className="material-symbols-outlined text-4xl">celebration</span>
                </div>
                <div className="absolute bottom-10 right-10 text-primary opacity-20 rotate-12">
                    <span className="material-symbols-outlined text-4xl">auto_awesome</span>
                </div>

                <div className="p-12 flex flex-col items-center text-center">
                    <div className="mb-8 flex items-center gap-2">
                        <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
                        <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
                        <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
                        <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
                        <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
                        <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
                        <div className="h-1.5 w-8 rounded-full bg-primary/20"></div>
                        <div className="h-1.5 w-16 rounded-full bg-primary"></div>
                        <span className="ml-2 text-xs font-bold text-primary uppercase tracking-widest">Adım 8 / 8</span>
                    </div>

                    <div className="relative mb-8">
                        <div className="size-24 bg-primary rounded-full flex items-center justify-center text-white shadow-[0_0_50px_0_rgba(127,32,223,0.2)] relative z-10">
                            <span className="material-symbols-outlined text-5xl font-bold">check</span>
                        </div>
                        <div className="absolute -top-2 -right-2 size-8 bg-accent-pink rounded-full border-4 border-white flex items-center justify-center text-pink-500 z-20">
                            <span className="material-symbols-outlined text-lg fill-1">favorite</span>
                        </div>
                    </div>

                    <h1 className="serif-heading text-4xl font-bold text-slate-900 mb-4">Tebrikler! Paneliniz Hazır.</h1>
                    <p className="text-slate-500 max-w-md mx-auto mb-10">
                        Zarif Güzellik dünyasına hoş geldiniz. İşletmenizi dijitalleştirmek için gerekli tüm temel ayarları başarıyla tamamladınız.
                    </p>

                    <div className="w-full max-w-md bg-white rounded-3xl p-6 border border-slate-100 mb-10">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-sm">assignment_turned_in</span>
                            Kurulum Özeti
                        </h3>

                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                    <span className="text-sm font-semibold">{servicesCount > 0 ? `${servicesCount} Hizmet` : 'Temel Hizmetler'} Eklendi</span>
                                </div>
                                <span className="text-xs text-emerald-500 font-bold">Tamamlandı</span>
                            </div>
                            
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                    <span className="text-sm font-semibold">Çalışma Saatleri</span>
                                </div>
                                <span className="text-xs text-emerald-500 font-bold">Ayarlanıp Kaydedildi</span>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                    <span className="text-sm font-semibold">{salonsCount > 0 ? `${salonsCount} Oda` : 'Temel Odalar'} Tanımlandı</span>
                                </div>
                                <span className="text-xs text-emerald-500 font-bold">Tamamlandı</span>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                    <span className="text-sm font-semibold">Personel Ekibi</span>
                                </div>
                                <span className="text-xs text-emerald-500 font-bold">Eşleştirildi</span>
                            </div>

                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                    <span className="text-sm font-semibold">Müşteri Aktarımı</span>
                                </div>
                                <span className="text-xs text-emerald-500 font-bold">Tamamlandı</span>
                            </div>
                        </div>
                    </div>



                    <button onClick={completeOnboarding} className="group relative w-full max-w-sm py-5 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            Panele Git
                            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>

                    <p className="mt-6 text-xs text-slate-400 font-medium">
                        Dilediğiniz zaman ayarları "İşletme Profili" kısmından güncelleyebilirsiniz.
                    </p>
                </div>
            </div>
        </div>
    );
}
