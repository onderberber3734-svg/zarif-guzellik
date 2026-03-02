export default function AyarlarPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold">Sistem Ayarları</h2>
                    <p className="text-slate-500 mt-2">Merkez bilgilerinizi, yetkilendirmeleri ve tercihleri yönetin.</p>
                </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">settings_applications</span>
                <p>Sistem konfigürasyonları, entegrasyonlar ve profil ayarları.</p>
            </div>
        </div>
    );
}
