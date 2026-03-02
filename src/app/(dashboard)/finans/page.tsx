export default function FinansPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold">Gelir ve Finans Yönetimi</h2>
                    <p className="text-slate-500 mt-2">İşletmenizin karlılığını ve büyümesini analiz edin.</p>
                </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 p-20 text-center text-slate-400">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-50">account_balance</span>
                <p>Gelir tabloları ve performans grafikleri burada olacak.</p>
            </div>
        </div>
    );
}
