"use client";

import { useState } from "react";
import { createCampaign, updateCampaignStatus, previewCampaignTargets } from "@/app/actions/campaigns";

export default function KampanyalarClient({ initialCampaigns }: { initialCampaigns: any[] }) {
    const [campaigns, setCampaigns] = useState(initialCampaigns);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Stepper State
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<{ count: number; sample: any[] }>({ count: 0, sample: [] });

    // Kaba Form Stateleri
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        type: "winback",
        target_segment: "risk",
        offer_type: "percentage_discount",
        offer_condition: "Tüm Hizmetlerde",
        offer_value: "",
        offer_details: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        estimated_conversion_count: 0,
        expected_revenue_impact: 0,
        channel: ["whatsapp"] // Array formatına alındı
    });

    const resetForm = () => {
        setFormData({
            name: "", description: "", type: "winback", target_segment: "risk", offer_type: "percentage_discount",
            offer_condition: "Tüm Hizmetlerde", offer_value: "", offer_details: "",
            start_date: new Date().toISOString().split("T")[0], end_date: "",
            estimated_conversion_count: 0, expected_revenue_impact: 0, channel: ["whatsapp"]
        });
        setCurrentStep(1);
    };

    const handleNextStep = async () => {
        if (currentStep === 1) {
            if (!formData.name) return alert("Lütfen kampanya adını giriniz.");
            setCurrentStep(2);
        } else if (currentStep === 2) {
            if (!formData.expected_revenue_impact) return alert("Tahmini ciro hedefini girmelisiniz.");

            // Format offer_details gracefully before moving to step 3
            let details = "";
            const cond = formData.offer_condition.trim();
            const val = formData.offer_value.trim();

            if (formData.offer_type === 'free_addon') {
                details = cond ? `${cond} alana ${val} ücretsiz` : `${val} ücretsiz`;
            } else if (formData.offer_type === 'percentage_discount') {
                details = cond ? `${cond} geçerli %${val} indirim` : `%${val} indirim`;
            } else if (formData.offer_type === 'fixed_discount') {
                details = cond ? `${cond} geçerli ₺${val} indirim` : `₺${val} indirim`;
            } else if (formData.offer_type === 'package_upgrade') {
                details = cond ? `${cond} paketinden ${val} paketine yükseltme` : `${val} yükseltme`;
            } else {
                details = cond ? `${cond} için ${val}` : val;
            }

            setFormData(prev => ({ ...prev, offer_details: details }));
            setCurrentStep(3);
        } else if (currentStep === 3) {
            if (formData.channel.length === 0) return alert("Lütfen en az bir gönderim kanalı seçiniz.");

            // Step 4'e geçerken önizleme verisini çek
            setIsPreviewLoading(true);
            setCurrentStep(4);
            try {
                const res = await previewCampaignTargets(formData.target_segment);
                setPreviewData(res);
            } catch (err) {
                console.error("Önizleme çekilemedi", err);
            } finally {
                setIsPreviewLoading(false);
            }
        }
    };

    const handlePrevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleCreate = async () => {
        setIsSubmitting(true);
        try {
            const res = await createCampaign(formData);
            if (res.success && res.data) {
                const newCamp = { ...res.data, estimated_audience_count: res.audienceCount };
                setCampaigns([newCamp, ...campaigns]);
                setIsModalOpen(false);
                resetForm();
            } else {
                alert("Hata: " + res.error);
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'draft' ? 'active' : (currentStatus === 'active' ? 'paused' : 'active');
        const res = await updateCampaignStatus(id, newStatus);
        if (res.success) {
            setCampaigns(campaigns.map(c => c.id === id ? { ...c, status: newStatus } : c));
        }
    };

    // Metrikler
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const totalExpectedRevenue = campaigns.reduce((sum, c) => sum + Number(c.expected_revenue_impact || 0), 0);
    const totalActualRevenue = campaigns.reduce((sum, c) => sum + Number(c.actual_revenue_impact || 0), 0);

    // Yardımcı map objeleri
    const segmentMap: Record<string, string> = {
        risk: "Riskli (90+ Günlük Kayıp)", new: "Yeni (1 Ziyaret)", loyal: "Sadık (3+ Ziyaret)", vip: "VIP Müşteriler", all: "Tüm Data"
    };
    const channelMap: Record<string, string> = {
        whatsapp: "WhatsApp", sms: "SMS", email: "E-Posta", push: "Anlık Bildirim", manual: "Manuel Liste (Çağrı)"
    };
    const offerMap: Record<string, string> = {
        percentage_discount: "Yüzde İndirim", fixed_discount: "Sabit İndirim", bundle_offer: "Paket Fırsatı", free_addon: "Hediye Ek Hizmet", package_upgrade: "Paket Yükseltme"
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Üst Kısım: Başlık ve Butonlar */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Kampanyalar & Pazarlama</h2>
                    <p className="text-slate-500 mt-2 text-lg">AI Destekli Büyüme ve Hedef Kitle Motoru</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-[var(--color-primary)] text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-[var(--color-primary)]/20 hover:opacity-90 transition-all text-sm"
                >
                    <span className="material-symbols-outlined">campaign</span>
                    Yeni Kampanya
                </button>
            </div>

            {/* Metrik Kartları Bölümü */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <span className="material-symbols-outlined text-[18px] text-[var(--color-primary)]">list_alt</span>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">TÜM KAMPANYALAR</p>
                    </div>
                    <span className="text-3xl font-black text-slate-900 mt-2">{totalCampaigns}</span>
                </div>
                <div className="bg-white p-5 border border-emerald-100 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <span className="material-symbols-outlined text-[18px] text-emerald-500">play_circle</span>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">YAYINDA OLANLAR</p>
                    </div>
                    <span className="text-3xl font-black text-emerald-600 mt-2">{activeCampaigns}</span>
                </div>
                <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <span className="material-symbols-outlined text-[18px] text-blue-500">monitoring</span>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">TAHMİN EDİLEN CİRO</p>
                    </div>
                    <span className="text-3xl font-black text-slate-900 mt-2">₺{totalExpectedRevenue.toLocaleString('tr-TR')}</span>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-3xl shadow-md flex flex-col justify-between relative overflow-hidden text-white mt-1 md:mt-0 md:-translate-y-1">
                    <div className="absolute right-0 top-0 p-4 opacity-10">
                        <span className="material-symbols-outlined text-6xl">account_balance_wallet</span>
                    </div>
                    <div className="flex items-center gap-3 mb-2 relative z-10 text-white/80">
                        <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
                        <p className="text-[11px] font-bold uppercase tracking-widest">GERÇEKLEŞEN (KAZANÇ)</p>
                    </div>
                    <span className="text-3xl font-black mt-2 relative z-10">₺{totalActualRevenue.toLocaleString('tr-TR')}</span>
                </div>
            </div>

            {/* AI Asistan Odak Noktası */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] p-8 shadow-xl relative overflow-hidden text-white flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex-1 space-y-3 relative z-10">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-widest text-[10px]">
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        AI ANALİZİ BEKLİYOR
                    </div>
                    <h3 className="text-2xl text-white font-extrabold tracking-tight">Akıllı İçgörüler Devreye Girecek</h3>
                    <p className="text-white/70 text-[14px] leading-relaxed max-w-2xl font-medium">
                        Bu alanda Gemini AI, geçmiş satışlarınızı ve müşteri davranışlarınızı inceleyerek size otomatik kampanya önerileri sunacaktır. "Bugün öğleden sonra Riskli gruba ₺50 indirim SMS'i atmak cironuzu x artırabilir" gibi hedefler üretilecek.
                    </p>
                </div>
                <div className="shrink-0 relative z-10 flex">
                    <button className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">settings_suggest</span>
                        AI Motorunu Yapılandır
                    </button>
                </div>
                <span className="material-symbols-outlined absolute -right-10 -bottom-10 text-[180px] text-white/5 z-0">psychology</span>
            </div>

            {/* Kampanyalar Grid */}
            <h3 className="text-xl font-extrabold text-slate-900 mt-10 mb-4 tracking-tight">Tüm Kampanyalar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {campaigns.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white border border-slate-200 rounded-3xl text-slate-500">
                        <span className="material-symbols-outlined text-4xl mb-3 text-slate-300">campaign</span>
                        <p className="font-bold">Henüz hiç kampanya oluşturmadınız.</p>
                        <p className="text-sm mt-1">İlk hedefinizi oluşturmak için Yeni Kampanya butonunu kullanın.</p>
                    </div>
                ) : (
                    campaigns.map(camp => {
                        let statusColor = "bg-slate-100 text-slate-600";
                        let statusText = "Taslak";
                        if (camp.status === 'active') { statusColor = "bg-emerald-100 text-emerald-700"; statusText = "Yayında"; }
                        if (camp.status === 'paused') { statusColor = "bg-amber-100 text-amber-700"; statusText = "Durduruldu"; }

                        // Send Status colors & text
                        let sendStatusUI = { icon: "hourglass_empty", text: "Bekliyor", color: "text-slate-400" };
                        if (camp.send_status === 'integration_pending') sendStatusUI = { icon: "sync_problem", text: "Entegrasyon Bekliyor", color: "text-amber-500" };
                        else if (camp.send_status === 'ready') sendStatusUI = { icon: "checklist", text: "Liste Hazır", color: "text-blue-500" };
                        else if (camp.send_status === 'sent' || camp.send_status === 'completed') sendStatusUI = { icon: "done_all", text: "Gönderildi", color: "text-emerald-500" };

                        return (
                            <div key={camp.id} className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm hover:shadow-lg transition-all flex flex-col relative group">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] uppercase font-extrabold tracking-widest ${statusColor}`}>
                                        {statusText}
                                    </span>
                                    {camp.status !== 'completed' && (
                                        <button onClick={() => handleStatusToggle(camp.id, camp.status)} className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-purple-50 rounded-lg transition-colors" title={camp.status === 'active' ? "Durdur" : "Başlat"}>
                                            <span className="material-symbols-outlined text-[18px]">
                                                {camp.status === 'active' ? 'pause' : 'play_arrow'}
                                            </span>
                                        </button>
                                    )}
                                </div>

                                <h4 className="text-[17px] font-extrabold text-slate-900 tracking-tight leading-tight">{camp.name}</h4>
                                <p className="text-[13px] text-slate-500 mt-1 line-clamp-2">{camp.description || "Açıklama girilmedi."}</p>

                                <div className="mt-4 flex flex-wrap gap-1">
                                    <span className="inline-flex items-center gap-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-1 rounded text-[10px] font-bold border border-[var(--color-primary)]/20">
                                        <span className="material-symbols-outlined text-[12px]">local_offer</span>
                                        {offerMap[camp.offer_type]} {camp.offer_details ? `(${camp.offer_details})` : ""}
                                    </span>
                                    {Array.isArray(camp.channel) && camp.channel.map((ch: string) => (
                                        <span key={ch} className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">
                                            <span className="material-symbols-outlined text-[12px]">
                                                {ch === 'whatsapp' ? 'forum' : ch === 'sms' ? 'sms' : ch === 'email' ? 'mail' : ch === 'push' ? 'notifications' : 'list_alt'}
                                            </span>
                                            {channelMap[ch] || ch}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-5 space-y-3">
                                    <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700">
                                        <span className="material-symbols-outlined text-[16px] text-rose-500">group_add</span>
                                        Hedef Kitle: <span className="text-[var(--color-primary)] bg-purple-50 px-2 py-0.5 rounded ml-auto">{camp.estimated_audience_count} Kişi</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 border-b border-slate-100 pb-3">
                                        <span className="material-symbols-outlined text-[16px] opacity-70">filter_alt</span>
                                        <span className="truncate">{segmentMap[camp.target_segment] || camp.target_segment}</span>
                                    </div>

                                    {/* Adım Adım Kampanya Süreci */}
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">
                                        <div className="flex items-center gap-1 text-[var(--color-primary)]">
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span> Kitle
                                        </div>
                                        <div className="h-px bg-slate-200 flex-1 mx-2"></div>
                                        <div className="flex items-center gap-1 text-[var(--color-primary)]">
                                            <span className="material-symbols-outlined text-[14px]">check_circle</span> Teklif
                                        </div>
                                        <div className="h-px bg-slate-200 flex-1 mx-2"></div>
                                        <div className={`flex items-center gap-1 ${sendStatusUI.color}`}>
                                            <span className="material-symbols-outlined text-[14px]">{sendStatusUI.icon}</span>
                                            <span className="truncate max-w-[80px]">{sendStatusUI.text}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Hedef Ciro</span>
                                            <span className="text-[14px] font-black text-slate-800">₺{Number(camp.expected_revenue_impact).toLocaleString('tr-TR')}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500">Kazanılan</span>
                                            <span className="text-[15px] font-black text-emerald-600">₺{Number(camp.actual_revenue_impact).toLocaleString('tr-TR')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Yeni Kampanya Modal (Step-by-Step UI) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-[32px] w-full max-w-3xl shadow-2xl overflow-hidden my-8 scale-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Header & Stepper */}
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-xl font-extrabold text-slate-900">Hedef Kitle & Kampanya Sihirbazı</h3>
                                    <p className="text-xs text-slate-500 font-bold mt-1">Geri Kazanım, Upsell ve Pazarlama Yönetimi</p>
                                </div>
                                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Stepper UI */}
                            <div className="flex items-center justify-between relative z-0">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 -z-10 rounded-full"></div>
                                {[1, 2, 3, 4].map(stepNum => {
                                    const isCompleted = currentStep > stepNum;
                                    const isActive = currentStep === stepNum;
                                    return (
                                        <div key={stepNum} className="flex flex-col items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${isActive ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-purple-500/30' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-400'}`}>
                                                {isCompleted ? <span className="material-symbols-outlined text-[16px]">check</span> : stepNum}
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-[var(--color-primary)]' : 'text-slate-400'}`}>
                                                {stepNum === 1 ? 'Amaç & Hedef' : stepNum === 2 ? 'Teklif' : stepNum === 3 ? 'Kanal' : 'Önizleme'}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Scrollable Form Content */}
                        <div className="p-8 overflow-y-auto flex-1 bg-white">

                            {/* STEP 1: AMAÇ VE HEDEF KİTLE */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[var(--color-primary)]">flag</span>
                                        1. Kampanyanın Amacı ve Kitlesi
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium">Önce genel hedefimizi ve kimlere ulaşacağımızı(Kural Motoru) belirliyoruz.</p>

                                    <div>
                                        <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-widest mb-2">KAMPANYA ADI</label>
                                        <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-bold" placeholder="Örn: 90 Günlük Kayıp Müşterileri Geri Döndür" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">KAMPANYA TİPİ</label>
                                            <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-bold">
                                                <option value="winback">Geri Kazanım (Winback)</option>
                                                <option value="vip_offer">VIP Özel Teklif</option>
                                                <option value="repeat_visit">Tekrar Ziyaret (Retention)</option>
                                                <option value="loyalty_upgrade">Paket Yükseltme Oluşturma</option>
                                                <option value="custom">Özel Kampanya</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">HEDEF KİTLE SEÇİMİ</label>
                                            <select value={formData.target_segment} onChange={e => setFormData({ ...formData, target_segment: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-bold">
                                                <option value="risk">Riskli Müşteriler (90 Gündür Gelmeyenler)</option>
                                                <option value="new">Yeni Müşteriler (Sadece 1 Kere Gelenler)</option>
                                                <option value="loyal">Sadık Müşteriler (En Az 3 Kere Gelenler)</option>
                                                <option value="vip">Sadece VIP Müşteriler</option>
                                                <option value="all">Sistemdeki Tüm Müşteriler</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-widest mb-2">TANIM / NOTLAR (OPSİYONEL)</label>
                                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-medium min-h-[80px]" placeholder="Kampanya stratejisini buraya yazabilirsiniz..." />
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: TEKLİF İÇERİĞİ */}
                            {currentStep === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[var(--color-primary)]">local_offer</span>
                                        2. Teklif ve Ciro Hedefleri
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium">Müşteriye ne sunacağımızı ve bu kampanyadan tahmini ne kadar gelir beklediğimizi girin.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">TEKLİF TÜRÜ</label>
                                            <select value={formData.offer_type} onChange={e => setFormData({ ...formData, offer_type: e.target.value, offer_condition: e.target.value === 'free_addon' ? '' : 'Tüm Hizmetlerde', offer_value: '' })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-bold">
                                                <option value="percentage_discount">Yüzde İndirim (%15 vb.)</option>
                                                <option value="fixed_discount">Sabit İndirim (₺150 vb.)</option>
                                                <option value="free_addon">Ücretsiz Ek Hizmet "X alana Y bedava"</option>
                                                <option value="bundle_offer">Çoklu Paket Fırsatı</option>
                                                <option value="package_upgrade">Üst Pakete Geçiş İndirimi</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* DINAMIK İKİLİ (ŞART VE SONUÇ) TEKLİF YARATICI */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                                        <div className="space-y-1.5">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">conditions</span>
                                                {formData.offer_type === 'free_addon' ? 'HANGİ HİZMETİ ALANA?' : formData.offer_type === 'package_upgrade' ? 'MEVCUT PAKETİ (ŞU ANKİ)' : 'HANGİ HİZMETLERDE GEÇERLİ?'}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.offer_condition}
                                                onChange={e => setFormData({ ...formData, offer_condition: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-bold text-slate-700"
                                                placeholder={formData.offer_type === 'free_addon' ? 'Örn: Lazer Epilasyon' : 'Örn: Tüm Hizmetlerde'}
                                            />
                                        </div>

                                        <div className="space-y-1.5 relative">
                                            <label className="block text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">redeem</span>
                                                {formData.offer_type === 'free_addon' ? 'NE ÜCRETSİZ/HEDİYE VERİLECEK?' : formData.offer_type === 'package_upgrade' ? 'HANGİ PAKETE YÜKSELTİLECEK?' : 'İNDİRİM VEYA TEKLİF MİKTARI'}
                                            </label>
                                            <div className="relative">
                                                {formData.offer_type === 'percentage_discount' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-primary)] font-bold">%</span>}
                                                {formData.offer_type === 'fixed_discount' && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-primary)] font-bold">₺</span>}
                                                <input
                                                    type={formData.offer_type.includes('discount') ? "number" : "text"}
                                                    value={formData.offer_value}
                                                    onChange={e => setFormData({ ...formData, offer_value: e.target.value })}
                                                    className={`w-full ${formData.offer_type.includes('discount') ? 'pl-8' : 'px-4'} py-3 bg-white border border-[var(--color-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] border-[var(--color-primary)] transition-all text-sm font-bold text-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/5`}
                                                    placeholder={
                                                        formData.offer_type === 'percentage_discount' ? 'Örn: 20' :
                                                            formData.offer_type === 'fixed_discount' ? 'Örn: 250' :
                                                                formData.offer_type === 'free_addon' ? 'Örn: Kaş Alımı' : 'Paket veya Teklif adı yazın'
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">KAMANYA BAŞLANGIÇ</label>
                                            <input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">KAMPANYA BİTİŞ</label>
                                            <input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--color-primary)]/5 p-5 border border-[var(--color-primary)]/10 rounded-2xl">
                                        <div>
                                            <label className="block text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-widest mb-2">HEDEFLENEN TOPLAM CİRO TAHMİNİ</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-primary)] font-extrabold">₺</span>
                                                <input type="number" value={formData.expected_revenue_impact || ""} onChange={e => setFormData({ ...formData, expected_revenue_impact: parseInt(e.target.value) || 0 })} className="w-full pl-9 pr-4 py-3 bg-white border border-[var(--color-primary)]/20 rounded-xl focus:ring-[var(--color-primary)] font-bold text-[var(--color-primary)]" placeholder="15000" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-widest mb-2">BEKLENEN TOPLAM DÖNÜŞÜM</label>
                                            <div className="relative">
                                                <input type="number" value={formData.estimated_conversion_count || ""} onChange={e => setFormData({ ...formData, estimated_conversion_count: parseInt(e.target.value) || 0 })} className="w-full pl-4 pr-10 py-3 bg-white border border-[var(--color-primary)]/20 rounded-xl focus:ring-[var(--color-primary)] font-bold text-[var(--color-primary)]" placeholder="10" />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-primary)] font-medium text-sm">Kişi</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: GÖNDERİM KANALI */}
                            {currentStep === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[var(--color-primary)]">send</span>
                                        3. Gönderim Kanalı
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium">Hazırladığımız bu teklifi kitlenize hangi kanallardan iletmek istediğinizi seçin (Birden fazla seçilebilir).</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(channelMap).map(([key, label]) => {
                                            const isSelected = formData.channel.includes(key);
                                            return (
                                                <button
                                                    key={key} type="button"
                                                    onClick={() => {
                                                        const newChannels = isSelected
                                                            ? formData.channel.filter(ch => ch !== key)
                                                            : [...formData.channel, key];
                                                        setFormData({ ...formData, channel: newChannels });
                                                    }}
                                                    className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-3 relative overflow-hidden ${isSelected ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[var(--color-primary)]/10 ring-2 ring-[var(--color-primary)]/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                                                >
                                                    {isSelected && <div className="absolute top-2 right-2 text-[var(--color-primary)] bg-purple-100 rounded-full w-5 h-5 flex items-center justify-center"><span className="material-symbols-outlined text-[12px] font-bold">check</span></div>}
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        <span className="material-symbols-outlined">
                                                            {key === 'whatsapp' ? 'forum' : key === 'sms' ? 'sms' : key === 'email' ? 'mail' : key === 'push' ? 'notifications' : 'list_alt'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h5 className={`font-bold ${isSelected ? 'text-[var(--color-primary)]' : 'text-slate-700'}`}>{label}</h5>
                                                        <p className="text-[11px] text-slate-400 mt-0.5 tracking-wide">
                                                            {key === 'manual' ? 'Asistanlar listeyi arayacak' : 'Otomatik API Gönderimi'}
                                                        </p>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {formData.channel.some(ch => ['whatsapp', 'sms', 'email', 'push'].includes(ch)) && (
                                        <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl flex gap-4 items-start">
                                            <span className="material-symbols-outlined text-amber-500 text-2xl mt-0.5">info</span>
                                            <div>
                                                <h5 className="font-bold text-amber-800 text-[15px]">Entegrasyon Önümüzdeki Fazda Aktifleşecektir</h5>
                                                <p className="text-sm text-amber-700/80 mt-1 leading-relaxed">
                                                    Şu an için seçtiğiniz dijital kanalların entegrasyonu sistemde kilitlidir. Kampanyayı onayladığınızda hedef müşteri listeniz sistemde hazırlanıp kilitlenecek ve <strong>"Entegrasyon Bekliyor"</strong> durumuna geçecektir.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {formData.channel.includes('manual') && (
                                        <div className="mt-8 p-5 bg-blue-50 border border-blue-200 rounded-2xl flex gap-4 items-start">
                                            <span className="material-symbols-outlined text-blue-500 text-2xl mt-0.5">task_alt</span>
                                            <div>
                                                <h5 className="font-bold text-blue-800 text-[15px]">Manuel Liste / Arama Kampanyası Başlıyor</h5>
                                                <p className="text-sm text-blue-700/80 mt-1 leading-relaxed">
                                                    Kampanya oluşturulduğunda sistem anında size bir arama listesi çıkarır. Gönderim durumu <strong>"Liste Hazır"</strong> olarak ayarlanır ve dilerseniz müşterileri kendiniz arayarak dönüşüm girebilirsiniz.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* STEP 4: ÖNİZLEME VE ONAY */}
                            {currentStep === 4 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-emerald-500">task_alt</span>
                                        4. Önizleme ve Doğrulama
                                    </h4>

                                    {isPreviewLoading ? (
                                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-4">
                                            <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[var(--color-primary)] animate-spin"></div>
                                            <p className="font-bold text-sm tracking-wide">Kural motoru veritabanını tarıyor...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Gerçek zamanlı müşteri sayımı */}
                                            <div className="bg-emerald-500 rounded-2xl p-6 text-white text-center shadow-lg shadow-emerald-500/20">
                                                <p className="text-emerald-100 font-bold tracking-widest text-[11px] mb-1">KURAL MOTORU BULGULAMASI (SNAPSHOT)</p>
                                                <h2 className="text-5xl font-black mb-1">{previewData.count} <span className="text-lg font-bold opacity-80">Müşteri</span></h2>
                                                <p className="text-emerald-100 text-sm">hedef kitle filtresiyle eşleşti ve kampanya listesine eklenecek.</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">KAMPANYA</p>
                                                    <p className="font-bold text-slate-800">{formData.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HEDEF SEGMENT</p>
                                                    <p className="font-bold text-[var(--color-primary)]">{segmentMap[formData.target_segment]}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TEKLİF ÖZETİ</p>
                                                    <p className="font-bold text-slate-800 text-lg flex items-center gap-2 mt-1">
                                                        <span className="material-symbols-outlined text-[var(--color-primary)]">sell</span>
                                                        {formData.offer_details}
                                                    </p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">GÖNDERİM KANALLARI</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {formData.channel.map(ch => (
                                                            <span key={ch} className="font-bold text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded textxs">
                                                                <span className="material-symbols-outlined text-[14px]">
                                                                    {ch === 'whatsapp' ? 'forum' : ch === 'sms' ? 'sms' : ch === 'email' ? 'mail' : ch === 'push' ? 'notifications' : 'list_alt'}
                                                                </span>
                                                                {channelMap[ch]}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="col-span-2 mt-2 pt-4 border-t border-slate-200">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HEDEFLENEN CİRO ETKİSİ</p>
                                                    <p className="text-xl font-black text-emerald-600">₺{formData.expected_revenue_impact.toLocaleString("tr-TR")}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Footer (Navigation) */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 flex items-center justify-between">
                            {currentStep > 1 ? (
                                <button type="button" onClick={handlePrevStep} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">arrow_back</span> Geri
                                </button>
                            ) : (
                                <div></div>
                            )}

                            {currentStep < 4 ? (
                                <button type="button" onClick={handleNextStep} className="px-8 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 transition-all text-sm flex items-center gap-2">
                                    Devam Et <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            ) : (
                                <button type="button" onClick={handleCreate} disabled={isSubmitting || isPreviewLoading} className="px-8 py-2.5 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:opacity-90 active:scale-95 transition-all text-sm flex items-center gap-2">
                                    {isSubmitting ? "Kampanya Onaylanıyor..." : "Onayla ve Kampanyayı Başlat"}
                                    {!isSubmitting && <span className="material-symbols-outlined text-[18px]">rocket_launch</span>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
