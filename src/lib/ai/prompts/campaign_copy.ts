import { getBaseSystemPrompt, AiOutput } from "./_base";

export function buildCampaignCopyPrompt(data: any): string {
    return `${getBaseSystemPrompt()}

-- GÖREV: KAMPANYA METNİ OLUŞTURMA --
Aşağıdaki kampanya bilgilerine göre hedeflenen kanal için 2 farklı varyasyon üretip "message_templates" içine koy (Biri samimi, diğeri daha kurumsal/acil hissiyatlı).
"bullets" kısmında bu pazarlama metinlerinin hangi müşteri kitlesinde daha etkili olabileceğine dair enfes 2 yönlendirme ver.

-- VERİ --
${JSON.stringify(data, null, 2)}

ÖNEMLİ: SADECE bu şemada JSON döndür. Başka hiçbir açıklama, markdown veya metin yazma.`;
}

export function campaignCopyFallback(data: any): AiOutput {
    const discount = data.discount_percent ? `%${data.discount_percent} indirim` : "özel fırsat";
    return {
        title: `${data.campaign_name} kampanyası için varyasyonlar hazırlandı.`,
        bullets: [
            "Birinci senaryoyu VIP müşteri grubunuza, diğerini yeni müşterilerinize test edebilirsiniz.",
            "Kâr marjını artırmak için cross-sell yapabileceğiniz tamamlayıcı ürünler önermeyi unutmayın."
        ],
        next_best_action: { label: "Hemen Yayınla", route: "/kampanyalar" },
        message_templates: [
            {
                platform: "whatsapp",
                content: `${data.campaign_name} heyecanı başladı! ${data.service_name} hizmetinde size özel ${discount}. Zarif bir dokunuş için yerinizi alın! 💜`
            },
            {
                platform: "sms",
                content: `Sınırlı Kontenjan: Yaza özel ${data.service_name} fırsatıyla ${discount}. Randevu almak için hemen tıklayın.`
            }
        ]
    };
}
