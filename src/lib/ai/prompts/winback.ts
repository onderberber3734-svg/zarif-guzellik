import { getBaseSystemPrompt, AiOutput } from "./_base";

export function buildWinbackPrompt(data: any): string {
    // base_audience'ı prompt'a gönderme (çok büyük, sadece iç işlem için)
    const promptData = { ...data };
    delete promptData.base_audience;
    // at_risk_customers sadece ilk 15'ini gönder (token tasarrufu)
    if (promptData.at_risk_customers?.length > 15) {
        promptData.at_risk_customers = promptData.at_risk_customers.slice(0, 15);
    }

    return `${getBaseSystemPrompt()}

-- GÖREV: UZUN SÜREDİR GELMEYEN MÜŞTERİ GERİ KAZANIM KAMPANYASI --
Aşağıdaki "uzun süredir randevu almayan müşteriler" (at_risk_customers), "risk seviyeleri" ve "işletmenin aktif hizmetleri" (allowed_services) verilerini analiz et.

SENİN AMACINLAR:
• Uzun süredir gelmeyen müşterileri geri kazanacak kampanya önerisi üret.
• Müşterilerin son aldığı hizmetlere göre kişiselleştirilmiş teklif sun.

KESİN KURALLAR:

1. TAM 1 ALTERNATİF ÜRET (campaign_alternatives dizisine 1 kampanya):
   • Bu bir "Sizi Özledik" / geri kazanım kampanyası.
   • Müşterilere sıcak, samimi ve premium bir dille "uzun süredir görüşmedik" mesajı ver.
   • Kampanyaya çekici bir isim ver: "Sizi Özledik Fırsatı", "Geri Dönüş Hediyesi", "[Hizmet] Yeniden Keşif" gibi.
   • offer_type: "percentage_discount" veya "fixed_discount" — geri kazanım için indirim/hediye teklifi sun.

2. HİZMET SEÇİMİ — ÇOK KRİTİK:
   • "service_id" → SADECE allowed_services listesindeki gerçek bir id kullan.
   • "service_name" → Hizmetin tam adını allowed_services listesinden KOPYALA.
   • at_risk_customers'ın en çok aldığı hizmeti veya popüler bir hizmeti seç.
   • ⚠️ MUTLAK YASAK: allowed_services LİSTESİNDE OLMAYAN hiçbir hizmet/ürün adı mesajlarda geçemez!

3. BU KAMPANYA GENEL BİR GERİ KAZANIM KAMPANYASIDIR:
   • Uzun süredir gelmeyen TÜM müşterilere yönelik.
   • Mesajda spesifik tarih/saat belirtme — bu bir slot doldurma kampanyası DEĞİL.
   • Kampanyanın geçerliliği 1 hafta olabilir.

4. MESAJ KALİTESİ (WhatsApp):
   • Sıcak ve samimi ton: "Sizi çok özledik!", "Uzun süredir görüşemedik"
   • Net teklif: "%20 geri dönüş indirimi", "İlk randevunuza özel ₺100 indirim"
   • Net CTA: "Hemen randevu oluşturun!", "Bu fırsatı kaçırmayın!"
   • Örnek: "Merhaba! 💜 Sizi çok özledik! Uzun süredir görüşemedik. Size özel %20 geri dönüş indirimimizle sizi tekrar ağırlamak istiyoruz. Hemen randevunuzu oluşturun! 📞"

5. KİTLE BİLGİSİ:
   • "why_this_audience" → Bu müşterilerin neden risk altında olduğunu 2 maddeyle açıkla.

ÖNEMLİ JSON ŞEMASI:
{
  "title": "Ana başlık — geri kazanım kampanyasını özetleyen kısa cümle",
  "why_this_audience": ["madde1", "madde2"],
  "campaign_alternatives": [
    {
      "concept_name": "Yaratıcı Kampanya Adı",
      "description": "Kampanyanın amacı ve hedef kitlesi hakkında 1-2 cümle",
      "service_id": "allowed_services'daki gerçek UUID",
      "service_name": "Hizmet Adı",
      "offer_type": "percentage_discount | fixed_discount",
      "offer_value": "20",
      "channel": "whatsapp",
      "message_templates": [
        { "tone": "samimi", "content": "Sıcak ve davetkar mesaj" },
        { "tone": "kurumsal", "content": "Profesyonel teklif mesajı" }
      ]
    }
  ]
}

-- VERİ --
${JSON.stringify(promptData, null, 2)}

ÖNEMLİ: SADECE yukarıdaki şemada JSON döndür. Başka hiçbir açıklama yazma.`;
}

export function winbackFallback(data: any): AiOutput {
    const services = data.allowed_services || [];
    const firstService = services[0];

    return {
        title: `${data.total_at_risk || 0} müşteriniz uzun süredir gelmiyor — geri kazanım fırsatı!`,
        why_this_audience: [
            "45+ gündür randevu almamış müşteriler kayıp riski taşır",
            "Geri kazanım indirimi ile müşteri yaşam boyu değerini (LTV) koruyun"
        ],
        campaign_alternatives: [
            {
                concept_name: "Sizi Özledik Fırsatı",
                description: "Uzun süredir gelmeyen müşterilere özel geri dönüş indirimi sunarak tekrar kazanma kampanyası.",
                service_id: firstService?.id || "",
                service_name: firstService?.name || "Genel Bakım",
                offer_type: "percentage_discount",
                offer_value: "20",
                channel: "whatsapp",
                message_templates: [
                    { tone: "samimi", content: "Merhaba! 💜 Sizi çok özledik! Uzun süredir görüşemedik. Size özel %20 geri dönüş indirimimizle sizi tekrar ağırlamak istiyoruz. Hemen randevunuzu oluşturun! 📞" },
                    { tone: "kurumsal", content: "Sayın müşterimiz, sizi yeniden ağırlamak istiyoruz. Size özel %20 indirimle favori bakım hizmetlerinize dönün. Zarif Güzellik" }
                ]
            }
        ]
    };
}
