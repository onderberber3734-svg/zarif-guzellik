import { getBaseSystemPrompt, AiOutput } from "./_base";

export function buildDailySummaryPrompt(data: any): string {
    return `${getBaseSystemPrompt()}

-- GÖREV: GÜNLÜK YÖNETİCİ ÖZETİ --
Aşağıdaki verilere dayanarak kısa ve aksiyon odaklı bir günlük özet oluştur.
Özette geciken seansları, boş slotları ve tahsilat bekleyen borçları vurucu bir tonla vurgula. Her bullet "problem + aksiyon" içersin.
Çıktındaki "next_best_action" alanını /finans veya /paket-seans gibi kâr odaklı bir aksiyona yönlendir. (Sadece bir adet next_best_action dönebilirsin).
Input'ta outstanding_amount veya overdue_sessions varsa "impact" (Düşük/Orta/Yüksek) ve "metric_context" ekle.

-- VERİ --
${JSON.stringify(data, null, 2)}

ÖNEMLİ: SADECE bu şemada JSON döndür. Başka hiçbir açıklama, markdown veya metin yazma.`;
}

export function dailySummaryFallback(data: any): AiOutput {
    const bullets: string[] = [];

    if (data.today_appointments > 0) {
        bullets.push(`Bugün ${data.today_appointments} randevunuz var, tahmini ciro ₺${data.today_revenue.toLocaleString('tr-TR')}.`);
    } else {
        bullets.push("Bugün için planlanmış randevu bulunmuyor.");
    }

    if (data.overdue_sessions_count > 0) {
        bullets.push(`${data.overdue_sessions_count} gecikmeli seans takibi yapılmalı.`);
    }

    if (data.outstanding_amount > 0) {
        bullets.push(`₺${data.outstanding_amount.toLocaleString('tr-TR')} tahsilat bekliyor.`);
    }

    const title = `Bugün ${data.today_appointments} randevu, tahmini ₺${data.today_revenue.toLocaleString('tr-TR')} ciro.`;

    let next_best_action = { label: "Günlük Görünüme Git", route: "/randevular" };
    if (data.outstanding_amount > 0) {
        next_best_action = { label: "Tahsilatları Gör", route: "/finans" };
    } else if (data.overdue_sessions_count > 0) {
        next_best_action = { label: "Geciken Seanslar", route: "/randevular" };
    }

    return { 
        title, 
        bullets: bullets.slice(0, 3), 
        next_best_action,
        impact: { label: "Orta", estimate_try: data.outstanding_amount || undefined, confidence: "med" }
    };
}
