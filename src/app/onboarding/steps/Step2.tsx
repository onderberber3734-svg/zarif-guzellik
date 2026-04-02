export default function Step2({ business, bizDetails, setBizDetails, onNext, onBack, isPending }: any) {
    return (
        <div className="bg-gradient-onboarding min-h-screen flex flex-col items-center justify-center p-6 text-slate-900 relative">
            {/* Top Header matching Step 1 */}
            <div className="fixed top-0 left-0 w-full p-8 flex flex-col items-center">
                <div className="w-full max-w-md flex flex-col items-center gap-3">
                    <div className="flex justify-between w-full items-end">
                        <div className="flex items-center gap-2">
                            <div className="size-8 rounded-full bg-primary flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-lg leading-none">spa</span>
                            </div>
                            <span className="serif-heading text-lg font-bold text-primary">Zarif Güzellik</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-500">Adım 2 / 8</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-2/6 rounded-full transition-all duration-500"></div>
                    </div>
                </div>
            </div>

            <main className="w-full max-w-3xl bg-white rounded-4xl shadow-[0_20px_60px_-15px_rgba(127,32,223,0.1)] border border-white p-10 md:p-14 flex flex-col animate-in fade-in zoom-in-95 duration-700 relative z-10 mt-12">

                {/* Header inside card */}
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="serif-heading text-3xl md:text-4xl font-bold text-slate-900 mb-3">İşletme Bilgileri</h1>
                        <p className="text-slate-500 font-medium text-sm md:text-base">Salonunuzun temel bilgilerini girerek başlayalım.</p>
                    </div>
                    <div className="size-16 bg-purple-100/50 rounded-2xl flex items-center justify-center text-purple-200 shadow-inner">
                        <span className="material-symbols-outlined text-5xl">storefront</span>
                    </div>
                </div>

                {/* Form Elements */}
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Salon Adı */}
                        <div>
                            <label className="block text-sm font-bold text-slate-800 mb-2">Salon Adı</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <span className="material-symbols-outlined text-xl">content_cut</span>
                                </div>
                                <input
                                    type="text"
                                    value={bizDetails?.name || ""}
                                    onChange={e => setBizDetails({ ...bizDetails, name: e.target.value })}
                                    placeholder="Örn: Rose Güzellik Salonu"
                                    className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-800 bg-white shadow-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* İşletme Telefonu */}
                        <div>
                            <label className="block text-sm font-bold text-slate-800 mb-2">İşletme Telefonu</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <span className="material-symbols-outlined text-xl">call</span>
                                </div>
                                <input
                                    type="tel"
                                    value={bizDetails?.phone || ""}
                                    onChange={e => setBizDetails({ ...bizDetails, phone: e.target.value })}
                                    placeholder="0 (5xx) xxx xx xx"
                                    className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-800 bg-white shadow-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Şehir */}
                    <div>
                        <label className="block text-sm font-bold text-slate-800 mb-2">Şehir</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                <span className="material-symbols-outlined text-xl">location_on</span>
                            </div>
                            <select
                                value={bizDetails?.city || ""}
                                onChange={e => setBizDetails({ ...bizDetails, city: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl pl-12 pr-10 py-3.5 text-sm text-slate-800 bg-white shadow-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="" disabled>Şehir Seçiniz</option>
                                <option value="Adana">Adana</option>
                                <option value="Adıyaman">Adıyaman</option>
                                <option value="Afyonkarahisar">Afyonkarahisar</option>
                                <option value="Ağrı">Ağrı</option>
                                <option value="Amasya">Amasya</option>
                                <option value="Ankara">Ankara</option>
                                <option value="Antalya">Antalya</option>
                                <option value="Artvin">Artvin</option>
                                <option value="Aydın">Aydın</option>
                                <option value="Balıkesir">Balıkesir</option>
                                <option value="Bilecik">Bilecik</option>
                                <option value="Bingöl">Bingöl</option>
                                <option value="Bitlis">Bitlis</option>
                                <option value="Bolu">Bolu</option>
                                <option value="Burdur">Burdur</option>
                                <option value="Bursa">Bursa</option>
                                <option value="Çanakkale">Çanakkale</option>
                                <option value="Çankırı">Çankırı</option>
                                <option value="Çorum">Çorum</option>
                                <option value="Denizli">Denizli</option>
                                <option value="Diyarbakır">Diyarbakır</option>
                                <option value="Edirne">Edirne</option>
                                <option value="Elazığ">Elazığ</option>
                                <option value="Erzincan">Erzincan</option>
                                <option value="Erzurum">Erzurum</option>
                                <option value="Eskişehir">Eskişehir</option>
                                <option value="Gaziantep">Gaziantep</option>
                                <option value="Giresun">Giresun</option>
                                <option value="Gümüşhane">Gümüşhane</option>
                                <option value="Hakkari">Hakkari</option>
                                <option value="Hatay">Hatay</option>
                                <option value="Isparta">Isparta</option>
                                <option value="Mersin">Mersin</option>
                                <option value="İstanbul">İstanbul</option>
                                <option value="İzmir">İzmir</option>
                                <option value="Kars">Kars</option>
                                <option value="Kastamonu">Kastamonu</option>
                                <option value="Kayseri">Kayseri</option>
                                <option value="Kırklareli">Kırklareli</option>
                                <option value="Kırşehir">Kırşehir</option>
                                <option value="Kocaeli">Kocaeli</option>
                                <option value="Konya">Konya</option>
                                <option value="Kütahya">Kütahya</option>
                                <option value="Malatya">Malatya</option>
                                <option value="Manisa">Manisa</option>
                                <option value="Kahramanmaraş">Kahramanmaraş</option>
                                <option value="Mardin">Mardin</option>
                                <option value="Muğla">Muğla</option>
                                <option value="Muş">Muş</option>
                                <option value="Nevşehir">Nevşehir</option>
                                <option value="Niğde">Niğde</option>
                                <option value="Ordu">Ordu</option>
                                <option value="Rize">Rize</option>
                                <option value="Sakarya">Sakarya</option>
                                <option value="Samsun">Samsun</option>
                                <option value="Siirt">Siirt</option>
                                <option value="Sinop">Sinop</option>
                                <option value="Sivas">Sivas</option>
                                <option value="Tekirdağ">Tekirdağ</option>
                                <option value="Tokat">Tokat</option>
                                <option value="Trabzon">Trabzon</option>
                                <option value="Tunceli">Tunceli</option>
                                <option value="Şanlıurfa">Şanlıurfa</option>
                                <option value="Uşak">Uşak</option>
                                <option value="Van">Van</option>
                                <option value="Yozgat">Yozgat</option>
                                <option value="Zonguldak">Zonguldak</option>
                                <option value="Aksaray">Aksaray</option>
                                <option value="Bayburt">Bayburt</option>
                                <option value="Karaman">Karaman</option>
                                <option value="Kırıkkale">Kırıkkale</option>
                                <option value="Batman">Batman</option>
                                <option value="Şırnak">Şırnak</option>
                                <option value="Bartın">Bartın</option>
                                <option value="Ardahan">Ardahan</option>
                                <option value="Iğdır">Iğdır</option>
                                <option value="Yalova">Yalova</option>
                                <option value="Karabük">Karabük</option>
                                <option value="Kilis">Kilis</option>
                                <option value="Osmaniye">Osmaniye</option>
                                <option value="Düzce">Düzce</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                                <span className="material-symbols-outlined text-xl">expand_more</span>
                            </div>
                        </div>
                    </div>

                    {/* Adres */}
                    <div>
                        <label className="block text-sm font-bold text-slate-800 mb-2">Adres</label>
                        <div className="relative">
                            <div className="absolute top-4 left-0 pl-4 flex items-start pointer-events-none text-slate-400">
                                <span className="material-symbols-outlined text-xl">map</span>
                            </div>
                            <textarea
                                rows={3}
                                value={bizDetails?.address || ""}
                                onChange={e => setBizDetails({ ...bizDetails, address: e.target.value })}
                                placeholder="Mahalle, Sokak, No..."
                                className="w-full border border-slate-200 rounded-xl pl-12 pr-4 py-3.5 text-sm text-slate-800 bg-white shadow-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none resize-none"
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Bottom Buttons */}
                <div className="flex items-center justify-between mt-10 p-2">
                    <button
                        onClick={onBack}
                        disabled={isPending}
                        className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Geri Dön
                    </button>
                    <button
                        onClick={() => onNext(3)}
                        disabled={isPending}
                        className="group flex items-center justify-center gap-2 bg-primary text-white py-4 px-10 rounded-2xl font-bold text-base shadow-lg shadow-primary/30 hover:bg-primary/90 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 min-w-[160px]"
                    >
                        {isPending ? "Kaydediliyor..." : "Devam Et"}
                        <span className={`material-symbols-outlined text-lg transition-transform ${isPending ? 'animate-spin' : 'group-hover:translate-x-1'}`}>
                            {isPending ? 'progress_activity' : 'arrow_forward'}
                        </span>
                    </button>
                </div>

                {/* Bottom Decorative Icons */}
                <div className="flex justify-center gap-6 mt-12 text-slate-300 pointer-events-none">
                    <span className="material-symbols-outlined text-3xl">face_3</span>
                    <span className="material-symbols-outlined text-3xl">checkroom</span>
                    <span className="material-symbols-outlined text-3xl">self_care</span>
                </div>
            </main>

            <footer className="fixed bottom-8 text-center text-slate-400 text-sm font-medium z-0">
                © 2024 Zarif Güzellik SaaS. Tüm hakları saklıdır.
            </footer>
        </div>
    );
}
