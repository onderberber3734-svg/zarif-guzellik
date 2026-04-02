export default function RandevuAlPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-pink-50 text-slate-800 font-sans p-4">
            <div className="text-center max-w-lg">
                <span className="material-symbols-outlined text-6xl text-purple-600 mb-4 inline-block">calendar_month</span>
                <h1 className="text-3xl font-bold font-serif mb-4 text-purple-900">Online Randevu</h1>
                <p className="text-lg text-slate-600 mb-8">
                    Self-booking müşteri paneli çok yakında burada olacak. Bu sayfa Admin panelinden tamamen bağımsız çalışacak.
                </p>
                <div className="px-6 py-4 bg-white shadow-lg rounded-2xl border border-purple-100">
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                        Coming Soon
                    </p>
                </div>
            </div>
        </div>
    );
}
