"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

type SupportItem = {
    title: string;
    content: string;
    steps?: string[];
    tip?: string;
    warning?: string;
    tag?: string;
};

type SupportCategory = {
    id: string;
    title: string;
    icon: string;
    items: SupportItem[];
};

const supportCategories: SupportCategory[] = [
    {
        id: "baslarken",
        title: "Başlarken",
        icon: "rocket_launch",
        items: [
            {
                title: "İlk Kurulum: İşletme bilgileri nasıl girilir?",
                content: "Sistemi kullanmaya başlamadan önce salonunuzun temel ayarlarını yapmalısınız. İşletme adı, adres ve telefon bilgilerini sisteme girerek başlayın.",
                steps: [
                    "Sağ üstteki profil menüsüne tıklayın ve 'İşletme Ayarları' veya 'Ayarlar' yolunu izleyin.",
                    "İlgili formda isim ve adres bilgilerinizi eksiksiz doldurun.",
                    "'Kaydet' butonuna basarak kurulumu tamamlayın."
                ],
                tip: "Çalışma saatlerini eksiksiz girmek, AI asistanınızın size doğru saat önerilerinde bulunmasını sağlar."
            },
            {
                title: "Hizmet ekleme nasıl yapılır?",
                content: "Danışanlarınıza/Müşterilerinize sunduğunuz tüm işlemleri (Saç Kesimi, Cilt Bakımı vb.) Hizmetler menüsünden eklemeniz gerekir.",
                steps: [
                    "Sol menüden 'Hizmetler' sekmesine girin.",
                    "Sağ üstteki 'Yeni Hizmet Ekle' butonuna tıklayın.",
                    "Hizmet adı, süresi ve fiyatını girip kaydedin."
                ]
            },
            {
                title: "Salon/Oda ekleme ve hizmet eşleştirme",
                content: "Oluşturduğunuz hizmetlerin hangi odalarda veya alanlarda uygulanabileceğini sisteme tanıtmalısınız. Bu, randevu çakışmalarını önler.",
                steps: [
                    "Sol menüden 'Salonlar' sayfasına gidin.",
                    "'Yeni Oda Ekle' butonuna tıklayın ve odaya bir isim verin (Örn: VIP Cilt Bakım Odası).",
                    "Bu odada verilecek olan hizmetleri seçin ve kaydedin."
                ],
                warning: "Hiçbir odaya atanmamış hizmetler, randevu takviminde seçilemez! Lütfen her hizmeti en az bir odayla eşleştirin."
            }
        ]
    },
    {
        id: "randevular",
        title: "Randevular",
        icon: "calendar_month",
        items: [
            {
                title: "Yeni randevu oluşturma",
                content: "Dakikalar içinde yeni bir randevu oluşturun ve çakışmaları sistem sizin yerinize kontrol etsin.",
                steps: [
                    "Sol menüden 'Randevu Oluştur' sayfasına gidin veya sağ üstten Hızlı Aksiyonlar altından Yeni Randevu'ya tıklayın.",
                    "Müşteriyi seçin, ardından hizmeti ve uygulanacağı odayı belirleyin.",
                    "Tarih ve başlangıç saatini seçtiğinizde, bitiş saati hizmet süresine göre otomatik hesaplanır."
                ]
            },
            {
                title: "Saat seçimi ve çakışma mantığı",
                content: "Sistem, seçtiğiniz odaya ve saate göre diğer randevularla çakışma olup olmadığını kontrol eder. Eğer seçilen saatte oda doluysa sistem sizi uyarır."
            },
            {
                title: "Randevu Durumları (Check-in, Tamamlandı, Gelmedi)",
                content: "Müşterilerin randevu durumlarını güncelleyerek gelirinizi ve istatistiklerinizi doğru ölçün.",
                steps: [
                    "Bekliyor: Randevu tarihi gelecekte olanlar.",
                    "Check-in: Müşteri salona geldiğinde check-in yapın.",
                    "Tamamlandı: İşlem bittiğinde ve ödeme alındığında randevuyu sonlandırın.",
                    "İptal / Gelmedi (No Show): Gelmeyen müşterileri mutlaka sistemde işaretleyin. AI bu verileri kullanarak risk analizi yapar."
                ]
            }
        ]
    },
    {
        id: "musteriler",
        title: "Müşteriler",
        icon: "group",
        items: [
            {
                title: "Yeni müşteri ekleme",
                content: "Hızlıca yeni müşteri ekleyerek randevu ve kampanya süreçlerine dahil edebilirsiniz.",
                steps: [
                    "Sağ üst menüden Hızlı Aksiyonlar > 'Yeni Müşteri' butonuna veya Müşteriler sayfasındaki ekle butonuna tıklayın.",
                    "Zorunlu olan İsim, Soyisim ve Telefon numarası alanlarını doldurun.",
                ]
            },
            {
                title: "VIP ve Standart üyelik ayrımı",
                content: "Müşterilerinizi VIP olarak işaretleyerek listelerde öne çıkmasını sağlayabilir ve özel kampanyalar için filtreleyebilirsiniz.",
                tip: "En sadık veya yüksek harcama yapan müşterilerinizi VIP kategorisine alın."
            },
            {
                title: "Riskli Müşteri nedir? (60/90 gün kuralı)",
                content: "Sistem, müşterilerinizin ziyaret sıklığını analiz eder. Ortalama 60 veya 90 gündür salonunuza uğramayan müşteriler 'Riskli' veya 'Geri Kazanılabilir' olarak işaretlenir.",
                tip: "Bu listeye Profil Menüsü > Gelir Kısayolları > Riskli Müşteriler adımlarından tek tıkla ulaşabilirsiniz."
            }
        ]
    },
    {
        id: "kampanyalar",
        title: "Kampanyalar",
        icon: "campaign",
        items: [
            {
                title: "3 adımda kampanya oluşturma",
                content: "Yeni bir kampanya oluşturmak sadece birkaç dakikanızı alır.",
                steps: [
                    "Teklif: Kampanyanın adını, indirim türünü (Yüzde/Tutar) ve bitiş tarihini belirleyin.",
                    "Hedef Kitle: Kampanyanın kimlere gideceğini seçin (Tüm Müşteriler, VIP'ler, Riskli Müşteriler).",
                    "Kanal: SMS mi yoksa WhatsApp üzerinden mi gideceğine karar verin ve taslağınızı oluşturun."
                ]
            },
            {
                title: "Kampanya sonuçları nasıl ölçülür? (30 gün kuralı)",
                content: "Bir kampanya gönderildikten sonra, mesajı alan müşteri 30 gün içerisinde bir randevu alır ve tamamlarsa, o randevunun geliri kampanyanın başarısı (ROI) olarak sayılır."
            }
        ]
    },
    {
        id: "ai_asistan",
        title: "AI Asistan (Yakında)",
        icon: "auto_awesome",
        items: [
            {
                title: "AI-ready (Yapay Zeka Uyumlu) yapı nedir?",
                content: "Zarif Güzellik, verilerinizi temiz ve anlamlı bir şekilde işleyerek yapay zekanın anlayabileceği 'AI-ready' bir formatta saklar. Randevu çakışmaları, iptal oranları, hizmet tercihleri doğrudan AI'a beslenir."
            },
            {
                title: "AI önerileri neleri kapsar? (Yakında)",
                content: "Asistanımız gelir artırıcı, boş saatleri doldurucu ve müşteri geri kazanımına yönelik nokta atışı öneriler sunar.",
                steps: [
                    "\"Cuma günü 14:00-17:00 arası vip odanız boş, geçen ay cilt bakımı yaptıranlara indirim SMS'i atalım mı?\"",
                    "\"Ayşe Yılmaz son 3 randevusuna gecikti veya gelmedi, listelerde uyaralım mı?\""
                ],
                tag: "Yakında"
            }
        ]
    },
    {
        id: "yakinda",
        title: "Yakında Eklenecek Özellikler",
        icon: "hourglass_empty",
        items: [
            {
                title: "WhatsApp & SMS Entegrasyonu",
                content: "Tasarladığınız kampanyaları tek tıkla müşterilerinize resmi Meta API veya SMS sağlayıcıları üzerinden otomatik gönderin.",
                tag: "Yakında"
            },
            {
                title: "Otomatik Randevu Hatırlatıcıları",
                content: "Müşterilerinize randevudan 1 gün veya 2 saat önce otomatik hatırlatma mesajları gidecek, 'iptal et/onayla' butonlarıyla no-show oranı sıfıra inecek.",
                tag: "Yakında"
            },
            {
                title: "Gemini / Gelişmiş AI Analizi",
                content: "Sektörel trendleri ve işletme verinizi harmanlayarak bir pazarlama danışmanı gibi sizinle sohbet edebilecek bir asistan motoru devreye alınacak.",
                tag: "Yakında"
            }
        ]
    }
];

export default function DestekMerkeziPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("baslarken");
    const [expandedItem, setExpandedItem] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<string>("");

    // Destek numarası çevre değişkenlerinden alınır, yoksa boş
    const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || "";

    useEffect(() => {
        const fetchUserData = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            const deviceInfo = navigator.userAgent.substring(0, 50) + "...";
            const uid = user ? user.id.split('-')[0] : "misafir";
            setUserInfo(`User: ${uid} | Device: ${deviceInfo}`);
        };
        fetchUserData();
    }, []);

    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return supportCategories;

        const lowerQuery = searchQuery.toLowerCase();
        return supportCategories.map(cat => {
            const matchedItems = cat.items.filter(item =>
                item.title.toLowerCase().includes(lowerQuery) ||
                item.content.toLowerCase().includes(lowerQuery)
            );
            return {
                ...cat,
                items: matchedItems
            };
        }).filter(cat => cat.items.length > 0);
    }, [searchQuery]);

    // Arama yapıldığında ilk bulduğu kategoriyi aktif yap
    useEffect(() => {
        if (searchQuery && filteredData.length > 0) {
            setActiveCategory(filteredData[0].id);
        }
    }, [searchQuery, filteredData]);


    const handleCopyInfo = () => {
        navigator.clipboard.writeText(userInfo);
        alert("Cihaz bilgisini destek ekibi için kopyaladınız: " + userInfo);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">

            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-bl-full pointer-events-none" />

                <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="size-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-2xl">support_agent</span>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Destek Merkezi</h2>
                    </div>
                    <p className="text-slate-500 font-medium max-w-lg">
                        Zarif Güzellik'i en verimli şekilde kullanmanız için hazırladığımız adım adım rehbere hoş geldiniz.
                    </p>
                </div>

                <div className="relative z-10 flex flex-col items-center sm:items-end gap-3 w-full sm:w-auto">
                    {supportPhone ? (
                        <a
                            href={`tel:${supportPhone}`}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
                        >
                            <span className="material-symbols-outlined text-[20px]">call</span>
                            Canlı Desteğe Bağlan
                        </a>
                    ) : (
                        <button
                            disabled
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-100 text-slate-400 cursor-not-allowed px-6 py-3.5 rounded-2xl font-bold border border-slate-200"
                        >
                            <span className="material-symbols-outlined text-[20px]">call_off</span>
                            Destek Hatları Yakında
                        </button>
                    )}

                    <button
                        onClick={handleCopyInfo}
                        className="text-[11px] font-bold text-slate-400 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-wider"
                    >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                        Sistem Bilgimi Kopyala
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Left Sidebar Menu */}
                <div className="w-full lg:w-72 shrink-0 space-y-6">
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Bir özellik veya konu ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium shadow-sm outline-none"
                        />
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-100 p-2 shadow-sm flex flex-col gap-1 overflow-x-auto lg:overflow-visible flex-row lg:flex-col snap-x scrollbar-hide py-3 lg:py-2">
                        {filteredData.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left min-w-[max-content] lg:min-w-0 snap-start
                                    ${activeCategory === cat.id
                                        ? "bg-primary text-white font-bold shadow-md shadow-primary/20"
                                        : "text-slate-600 font-medium hover:bg-slate-50"
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                                <span className="text-sm">{cat.title}</span>
                            </button>
                        ))}
                        {filteredData.length === 0 && (
                            <div className="p-4 text-center text-sm text-slate-400 font-medium">Kategori bulunamadı.</div>
                        )}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 min-w-0">
                    {filteredData.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border border-slate-100 p-12 text-center flex flex-col items-center justify-center text-slate-400 h-full min-h-[400px]">
                            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">search_off</span>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Sonuç Bulunamadı</h3>
                            <p className="max-w-md mx-auto">"{searchQuery}" aramasına uygun bir yardım dökümanı bulamadık. Lütfen farklı anahtar kelimeler ile tekrar deneyin.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 sm:p-10 shadow-sm space-y-8">
                            {filteredData.filter(cat => cat.id === activeCategory).map(category => (
                                <div key={category.id} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                                        <div className={`size-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${category.id === 'yakinda' ? 'bg-amber-500 shadow-amber-500/20' : category.id === 'ai_asistan' ? 'bg-purple-500 shadow-purple-500/20' : 'bg-slate-900 shadow-slate-900/20'}`}>
                                            <span className="material-symbols-outlined text-2xl">{category.icon}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-900">{category.title}</h3>
                                            <p className="text-sm font-medium text-slate-500 mt-1">İlgili yardım başlıkları aşağıda listelenmiştir.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {category.items.map((item, idx) => {
                                            const isExpanded = expandedItem === `${category.id}-${idx}`;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`border rounded-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-primary/30 bg-primary/5 shadow-md shadow-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                                >
                                                    <button
                                                        onClick={() => setExpandedItem(isExpanded ? null : `${category.id}-${idx}`)}
                                                        className="w-full flex items-center justify-between p-5 text-left"
                                                    >
                                                        <div className="flex items-center gap-3 pr-4">
                                                            <h4 className={`text-base font-bold transition-colors ${isExpanded ? 'text-primary' : 'text-slate-800'}`}>
                                                                {item.title}
                                                            </h4>
                                                            {item.tag && (
                                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 whitespace-nowrap">
                                                                    {item.tag}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className={`size-8 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0 ${isExpanded ? 'bg-primary text-white rotate-180' : 'bg-slate-100 text-slate-500'}`}>
                                                            <span className="material-symbols-outlined text-lg">expand_more</span>
                                                        </div>
                                                    </button>

                                                    <div
                                                        className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}
                                                    >
                                                        <div className="p-5 pt-0 text-slate-600 text-[15px] space-y-6">
                                                            <p className="leading-relaxed border-t border-slate-200/60 pt-4 font-medium text-slate-700">
                                                                {item.content}
                                                            </p>

                                                            {item.steps && (
                                                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                                                                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                                        <span className="material-symbols-outlined text-[16px] text-primary">list_alt</span>
                                                                        Adım Adım
                                                                    </p>
                                                                    <ul className="space-y-4">
                                                                        {item.steps.map((step, sIdx) => (
                                                                            <li key={sIdx} className="flex gap-4">
                                                                                <div className="size-6 shrink-0 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center mt-0.5">
                                                                                    {sIdx + 1}
                                                                                </div>
                                                                                <span className="leading-relaxed">{step}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}

                                                            {item.tip && (
                                                                <div className="flex items-start gap-4 p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-100">
                                                                    <span className="material-symbols-outlined text-emerald-500 mt-0.5">lightbulb</span>
                                                                    <p className="text-sm font-medium leading-relaxed">
                                                                        <strong className="block mb-1 text-emerald-900">İpucu</strong>
                                                                        {item.tip}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {item.warning && (
                                                                <div className="flex items-start gap-4 p-4 rounded-xl bg-orange-50 text-orange-800 border border-orange-100">
                                                                    <span className="material-symbols-outlined text-orange-500 mt-0.5">warning</span>
                                                                    <p className="text-sm font-medium leading-relaxed">
                                                                        <strong className="block mb-1 text-orange-900">Önemli Hata / Uyarı</strong>
                                                                        {item.warning}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
