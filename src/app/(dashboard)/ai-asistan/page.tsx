export default function AiAsistanPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--color-primary)]">AI İşletme Asistanı</h2>
                    <p className="text-slate-500 mt-2">Tüm raporlarınızı, risklerinizi ve hedef kitlenizi analiz eden sanal yöneticiniz.</p>
                </div>
            </div>
            <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-indigo-800/10 rounded-3xl border border-[var(--color-primary)]/20 p-20 text-center text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-6xl mb-4 opacity-70">psychology</span>
                <h3 className="text-xl font-bold mb-2">Gemini AI Sentezleniyor...</h3>
                <p className="max-w-md mx-auto opacity-80">
                    Bu sayfada Gemini entegrasyonu tamamlandığında; verilerinizi yazılı olarak yorumlayan, haftalık brifingler sunan proaktif bir sohbet arayüzü yer alacaktır.
                </p>
            </div>
        </div>
    );
}
