import { getBaseSystemPrompt, AiOutput } from "./_base";

export function buildFillEmptySlotsPrompt(data: any): string {
    return `${getBaseSystemPrompt()}

-- GÖREV: BOŞ SLOT DOLDURMA KAMPANYASI --
Aşağıdaki "takvimdeki boş saatler" (empty_slots), "işletmenin aktif hizmetleri" (allowed_services), "son 30 günün popüler hizmetleri" (top_services) ve "gecikmiş seans bilgileri" (overdue_sessions) verilerini analiz et.

SENİN AMACINLAR:
• Boş kalan saat dilimlerini dolduracak hedefli kampanya önerileri üretmek.
• Her kampanya belirli bir boş saati/günü hedeflemeli ve o tarihi/saati iletişim mesajına yansıtmalı.
• İşletmenin TÜM hizmet çeşitliliğini kullanarak yaratıcı, çekici ve farklı kampanyalar üretmek.

KESİN KURALLAR:

1. TAM 3 ALTERNATİF ÜRET:
   - ALTERNATİF 1 (ZORUNLU): "Gecikmiş Seans Hatırlatması" — overdue_sessions verisindeki GERÇEK gecikmiş müşterileri hedefle.
     • service_id: overdue_sessions'daki en çok geciken hizmetin service_id'sini kullan.
     • Bu bir hatırlatma kampanyasıdır. Müşterilerin seanslarının geciktiğini nazikçe hatırlat.
     • offer_type: "reminder" olmalı.
     • Eğer overdue_sessions boşsa, bu alternatifi "Seans Paketi Tanıtımı" olarak kur ve paket hizmeti öner.
   
   - ALTERNATİF 2: Popüler hizmetlerden birini kullanarak indirim/fırsat kampanyası.
     • top_services veya allowed_services listesinden seç.
     • offer_type: "percentage_discount" veya "fixed_discount"
     • Yaratıcı bir konsept adı ver (ör: "Lazer Bahar Festivali", "Hydrafacial Glow Günü", "Cilt Yenileme Maratonu").
   
   - ALTERNATİF 3: Daha az talep gören veya niş bir hizmeti öne çıkaran keşif kampanyası.
     • top_services'da OLMAYAN bir hizmeti allowed_services'dan seç.
     • Müşteriye yeni bir deneyim sun (ör: bundle teklifi, ilk deneme indirimi).
     • offer_type: "percentage_discount", "fixed_discount", "bundle" veya "free_addon"

2. HİZMET SEÇİMİ — ÇOK KRİTİK:
   • "service_id" → SADECE allowed_services listesindeki gerçek bir id kullan. Kesinlikle uydurma id KULLANMA.
   • "service_name" → Hizmetin tam adını allowed_services listesinden KOPYALA. Kelimesi kelimesine aynı olmalı.
   • Her alternatif FARKLI bir hizmet sunmalı. Aynı hizmeti 2 kez önerme.
   • ⚠️ MUTLAK YASAK: Mesaj metinlerinde, açıklamalarda veya konsept adlarında allowed_services LİSTESİNDE OLMAYAN hiçbir hizmet/ürün adı geçemez!
   • "Bundle" veya "free_addon" teklifi veriyorsan, bahsettiğin HER hizmet/ürün allowed_services listesinde OLMAK ZORUNDA. "Detoks paketi", "hediye maske", "ücretsiz X" gibi listede olmayan ürünleri UYDURMA.
   • Eğer bundle yapacaksan, allowed_services listesinden 2 GERÇEK hizmeti birleştir.

3. KAMPANYA KISA SÜRELİDİR — ACİLİYET VURGUSU ZORUNLU:
   • Bu kampanyalar UZUN SÜRELİ DEĞİL. Amaç belirli bir gündeki boş slotları doldurmak.
   • Her kampanya SADECE 1 GÜN GEÇERLİDİR (empty_slots'taki tarih).
   • Mesajlarda "SADECE YARIN", "YALNIZCA [tarih] günü geçerli", "Tek günlük özel fırsat" gibi aciliyet vurgusu ZORUNLU.
   • "valid_dates" → empty_slots'taki gerçek tarih ve saatleri koy, uydurma saat YAZMA.
   • Kampanya adlarında da kısa süre vurgusu olsun: "Yarına Özel Hydrafacial Fırsatı", "24 Mart'a Özel Lazer Günü" gibi.

4. MESAJ KALİTESİ (WhatsApp):
   • NET TARİH + ACİLİYET: "SADECE yarın 24 Mart Pazartesi geçerli!"
   • NET SAAT: "09:00-14:00 arası"
   • NET TEKLİF: "%15 indirim" veya "₺200 indirim"
   • NET CTA: "Hemen randevu alın!", "Yerinizi ayırtın!"
   • KISA SÜRE VURGUSU: "Bu fırsat sadece yarın geçerli, kontenjan sınırlı!"
   • ASLA "süresiz", "her zaman geçerli" gibi ifadeler kullanma.
   • Örnek: "🌟 SADECE YARIN! 24 Mart Pazartesi 09:00-14:00 arası Hydrafacial'da %15 indirim. Kontenjan sınırlı, hemen randevunuzu oluşturun! 📞"

5. KİTLE UYUMU:
   • "why_this_audience" → Bu kampanyanın neden bu müşterilere uygun olduğunu 2 maddeyle açıkla.

ÖNEMLİ JSON ŞEMASI:
{
  "title": "Ana başlık — tüm kampanyaları özetleyen kısa cümle",
  "recommended_day_label": "Yarın / Pazartesi / 24 Mart vb.",
  "slots": [ {"date": "2026-03-24", "time": "09:00"} ],
  "why_this_audience": ["madde1", "madde2"],
  "campaign_alternatives": [
    {
      "concept_name": "Yaratıcı ve Vurucu Kampanya Adı",
      "description": "Kampanyanın amacı ve hedef kitlesi hakkında 1-2 cümle",
      "service_id": "allowed_services'daki gerçek UUID",
      "service_name": "Hizmet Adı",
      "offer_type": "percentage_discount | fixed_discount | bundle | reminder | free_addon",
      "offer_value": "15 (veya reminder ise boş)",
      "valid_dates": [{"date": "2026-03-24", "time": "09:00"}, {"date": "2026-03-24", "time": "11:00"}],
      "channel": "whatsapp",
      "message_templates": [
        { "tone": "samimi", "content": "Tarih ve saat içeren, sıcak ve davetkar mesaj" },
        { "tone": "kurumsal", "content": "Profesyonel ve net teklif mesajı" }
      ]
    }
  ]
}

-- VERİ --
${JSON.stringify(data, null, 2)}

ÖNEMLİ: SADECE yukarıdaki şemada JSON döndür. Başka hiçbir açıklama yazma.`;
}

export function fillEmptySlotsFallback(data: any): AiOutput {
    const overdueService = data.overdue_sessions?.[0];
    const firstSlot = data.empty_slots?.[0];
    const services = data.allowed_services || [];
    
    return {
        title: `Takviminizde boş saatler için fırsat var.`,
        recommended_day_label: firstSlot?.date || "Yakın Zamanlı",
        slots: data.empty_slots || [],
        why_this_audience: ["Geçmiş randevu davranışına göre bu saatlere uygun müşteriler", "Aktif veya gecikmiş seans planı olan müşteriler"],
        campaign_alternatives: [
            {
                concept_name: "Gecikmiş Seans Hatırlatması",
                description: "Aktif paketi olan ve seansı gecikmiş müşterileri nazikçe bilgilendirerek LTV'yi koruma.",
                service_id: overdueService?.service_id || services[0]?.id || "",
                service_name: overdueService?.service_name || services[0]?.name || "Genel Bakım",
                offer_type: "reminder",
                offer_value: "",
                valid_dates: data.empty_slots?.slice(0, 2) || [],
                channel: "whatsapp",
                message_templates: [
                    { tone: "samimi", content: `Merhaba! Zarif Güzellik'ten hatırlatma. Seans süreniz geldi, sizi bekliyoruz 💜` },
                    { tone: "kurumsal", content: `Sayın müşterimiz, seans planınızdaki bir sonraki seansınız için randevu almanızı hatırlatmak isteriz.` }
                ]
            },
            {
                concept_name: "Özel İndirim Fırsatı",
                description: "Popüler hizmetlerde özel indirim ile boş saatleri doldurun.",
                service_id: services[1]?.id || services[0]?.id || "",
                service_name: services[1]?.name || services[0]?.name || "Bakım",
                offer_type: "percentage_discount",
                offer_value: "15",
                valid_dates: data.empty_slots?.slice(0, 2) || [],
                channel: "whatsapp",
                message_templates: [
                    { tone: "samimi", content: `Bugüne özel indirimimizi kaçırmayın canlar 💜` },
                    { tone: "kurumsal", content: `Zarif Güzellik olarak size özel %15 randevu indirimi sunuyoruz.` }
                ]
            }
        ]
    };
}
