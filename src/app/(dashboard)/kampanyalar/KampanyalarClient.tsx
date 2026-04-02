"use client";

import { useState, useEffect } from "react";
import { createCampaign, updateCampaignStatus, previewCampaignTargets, deleteCampaign, updateCampaignDetails, getConvertedTargets } from "@/app/actions/campaigns";
import { refreshAiInsight } from "@/app/actions/ai";
import { sendCampaignViaWhatsApp } from "@/app/actions/whatsapp";
import CustomerLink from "@/components/CustomerLink";

export default function KampanyalarClient({ initialCampaigns, initialSegment, initialParams, initialDraft }: { initialCampaigns: any[], initialSegment?: any, initialParams?: any, initialDraft?: any }) {
    const [campaigns, setCampaigns] = useState(initialCampaigns);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

    // Stepper State
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<{ count: number; sample: any[] }>({ count: 0, sample: [] });
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Report Modal State
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [currentReportCampaign, setCurrentReportCampaign] = useState<any>(null);
    const [reportData, setReportData] = useState<any[]>([]);
    const [isReportLoading, setIsReportLoading] = useState(false);

    // Kitle Önizleme Modal State
    const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);
    const [audienceModalData, setAudienceModalData] = useState<any[]>([]);
    const [isAudienceLoading, setIsAudienceLoading] = useState(false);
    const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
    const [audienceModalCampaign, setAudienceModalCampaign] = useState<any>(null);
    const [audiencePage, setAudiencePage] = useState(1);
    const AUDIENCE_PER_PAGE = 7; // Sayfa başına 7 kişi gösterilecek

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
        channel: ["whatsapp"], // Array formatına alındı
        message_content: ""
    });

    const resetForm = () => {
        setFormData({
            name: "", description: "", type: "custom", target_segment: "risk", offer_type: "percentage_discount",
            offer_condition: "", offer_value: "", offer_details: "",
            start_date: new Date().toISOString().split("T")[0], end_date: "",
            estimated_conversion_count: 0, expected_revenue_impact: 0, channel: ["whatsapp"], message_content: ""
        });
        setCurrentStep(1);
        setEditingCampaignId(null);
    };

    useEffect(() => {
        if (initialDraft) {
            const offerDetails = initialDraft.offer_details || {};
            setFormData(prev => ({
                ...prev,
                name: initialDraft.name || "",
                description: initialDraft.description || "",
                type: initialDraft.type || "custom",
                target_segment: initialDraft.target_segment || "risk",
                offer_type: initialDraft.offer_type || prev.offer_type,
                offer_condition: offerDetails.service_name || prev.offer_condition,
                offer_value: offerDetails.offer_value ? String(offerDetails.offer_value) : prev.offer_value,
                offer_details: initialDraft.offer_details || "",
                start_date: initialDraft.start_date ? String(initialDraft.start_date).split("T")[0] : prev.start_date,
                end_date: initialDraft.end_date ? String(initialDraft.end_date).split("T")[0] : "",
                estimated_conversion_count: initialDraft.estimated_conversion_count || 0,
                expected_revenue_impact: initialDraft.expected_revenue_impact || 0,
                channel: Array.isArray(initialDraft.channel) && initialDraft.channel.length > 0 ? initialDraft.channel : ["whatsapp"],
                message_content: offerDetails.message || ""
            }));
            setEditingCampaignId(initialDraft.id);
            setIsModalOpen(true);
            setCurrentStep(1);

            if (initialDraft.target_segment) {
                previewCampaignTargets(initialDraft.target_segment)
                    .then(res => setPreviewData(res))
                    .catch(err => console.error("Taslak kitle önizlemesi yüklenemedi:", err));
            }
            return;
        }

        const hasParams = initialParams && Object.keys(initialParams).length > 0;
        if (initialSegment || hasParams) {
            const targetSeg = initialSegment?.id || initialParams?.segment_id || "risk";
            setFormData(prev => ({
                ...prev,
                name: initialParams?.concept_name || initialSegment?.name || "Özel Kampanya",
                target_segment: targetSeg,
                offer_type: initialParams?.offer_type || prev.offer_type,
                offer_value: initialParams?.offer_value || prev.offer_value,
                offer_condition: initialParams?.service_name || prev.offer_condition,
                message_content: initialParams?.message_content || prev.message_content
            }));
            
            if (initialSegment) {
                setPreviewData({
                    count: initialSegment.count,
                    sample: initialSegment.sample
                });
            } else if (targetSeg) {
                previewCampaignTargets(targetSeg)
                    .then(res => setPreviewData(res))
                    .catch(err => console.error("Preview yüklenemedi:", err));
            }
            setIsModalOpen(true);
            setCurrentStep(1);
        }
    }, [initialDraft, initialSegment, initialParams]);

    const handleNextStep = async () => {
        if (currentStep === 1) {
            if (!formData.name) return alert("Lütfen kampanya adını giriniz.");
            if (!formData.offer_type) return alert("Lütfen teklif türünü seçiniz.");

            // Format offer_details gracefully
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
            } else if (formData.offer_type === 'bogo') {
                details = cond ? `${cond} alana ${val} bedava` : `1 Alana 1 Bedava`;
            } else {
                details = cond ? `${cond} için ${val}` : val;
            }

            setFormData(prev => ({ ...prev, offer_details: details, type: 'custom' })); // Auto-set type

            setCurrentStep(2);
        } else if (currentStep === 2) {
            setIsPreviewLoading(true);
            setCurrentStep(3);
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

    const handleCreateOrUpdate = async () => {
        if (formData.channel.length === 0) return alert("Lütfen en az bir gönderim kanalı seçiniz.");
        setIsSubmitting(true);
        try {
            if (editingCampaignId) {
                const res = await updateCampaignDetails(editingCampaignId, formData);
                if (res.success && res.data) {
                    setCampaigns(campaigns.map(c => c.id === editingCampaignId ? { ...c, ...res.data } : c));
                    setIsModalOpen(false);
                    resetForm();
                } else {
                    alert("Hata: " + res.error);
                }
            } else {
                const res = await createCampaign(formData);
                if (res.success && res.data) {
                    const newCamp = { ...res.data, estimated_audience_count: res.audienceCount };
                    setCampaigns([newCamp, ...campaigns]);
                    setIsModalOpen(false);
                    resetForm();
                } else {
                    alert("Hata: " + res.error);
                }
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

    const handleDelete = async (id: string) => {
        if (!confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) return;
        const res = await deleteCampaign(id);
        if (res.success) {
            setCampaigns(campaigns.filter(c => c.id !== id));
            setOpenDropdownId(null);
        } else {
            alert("Silinirken bir hata oluştu: " + res.error);
        }
    };

    const handleEdit = (campaign: any) => {
        setFormData({
            ...campaign,
            channel: Array.isArray(campaign.channel) ? campaign.channel : ["whatsapp"]
        });
        setEditingCampaignId(campaign.id);
        setOpenDropdownId(null);
        setIsModalOpen(true);
        setCurrentStep(1);
    };

    const handleOpenReport = async (campaign: any) => {
        setCurrentReportCampaign(campaign);
        setIsReportOpen(true);
        setIsReportLoading(true);
        try {
            const data = await getConvertedTargets(campaign.id);
            setReportData(data);
        } catch (err) {
            console.error("Rapor alınamadı", err);
        } finally {
            setIsReportLoading(false);
        }
    };

    const handleWhatsAppSend = async (campaignId: string) => {
        if (!confirm("Bu kampanyayı WhatsApp üzerinden tüm hedef kitlenize göndermek istediğinize emin misiniz?")) return;
        setSendingCampaignId(campaignId);
        try {
            const res = await sendCampaignViaWhatsApp(campaignId);
            if (res.success && res.result) {
                alert(`WhatsApp gönderimi tamamlandı!\n✅ Gönderildi: ${res.result.sent}\n❌ Başarısız: ${res.result.failed}`);
                setCampaigns(campaigns.map(c => c.id === campaignId ? { ...c, status: 'active', send_status: res.result!.failed === 0 ? 'sent' : 'partially_sent' } : c));
            } else {
                alert("Hata: " + (res.error || "Gönderim başarısız."));
            }
        } catch (err: any) {
            alert("Gönderim hatası: " + err.message);
        } finally {
            setSendingCampaignId(null);
        }
    };

    const handleOpenAudiencePreview = async (campaign: any) => {
        setAudienceModalCampaign(campaign);
        setIsAudienceModalOpen(true);
        setIsAudienceLoading(true);
        setAudiencePage(1); // Modalı açarken ilk sayfaya sıfırla
        try {
            const res = await previewCampaignTargets(campaign.target_segment);
            setAudienceModalData(res.sample || []);
            setAudienceModalCampaign({...campaign, segment_real_name: res.name || segmentMap[campaign.target_segment] || (campaign.target_segment.includes('-') ? 'Yapay Zeka Hedef Kitlesi' : campaign.target_segment)});
        } catch (err) {
            console.error("Kitle okunamadı", err);
        } finally {
            setIsAudienceLoading(false);
        }
    };

    // AI Message Generation State
    const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
    const [aiMessageVariants, setAiMessageVariants] = useState<any[]>([]);

    const handleGenerateMessage = async () => {
        setIsGeneratingMessage(true);
        try {
            const result = await refreshAiInsight("campaign_copy", {
                campaign_name: formData.name,
                segment: segmentMap[formData.target_segment] || formData.target_segment,
                channel: formData.channel[0] || 'whatsapp',
                service_name: formData.offer_condition || "Hizmetlerimiz",
                discount_percent: formData.offer_type === 'percentage_discount' ? parseInt(formData.offer_value) : undefined
            });

            if (result.success && result.data?.texts) {
                setAiMessageVariants(result.data.texts);
            } else {
                alert("AI metni üretilemedi: " + (result.error || "Bilinmeyen hata"));
            }
        } catch (error) {
            console.error(error);
            alert("AI hatası.");
        } finally {
            setIsGeneratingMessage(false);
        }
    };

    const handleSelectVariant = (text: string) => {
        setFormData(prev => ({ ...prev, message_content: text }));
        setAiMessageVariants([]);
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
    if (initialSegment) {
        segmentMap[initialSegment.id] = `Özel Segment: ${initialSegment.name}`;
    }
    const channelMap: Record<string, string> = {
        whatsapp: "WhatsApp", sms: "SMS", email: "E-Posta", push: "Anlık Bildirim", manual: "Manuel Liste"
    };
    const offerMap: Record<string, string> = {
        percentage_discount: "Yüzde İndirim", fixed_discount: "Sabit İndirim", bundle_offer: "Paket Fırsatı", free_addon: "Hediye Ek Hizmet", package_upgrade: "Paket Yükseltme", bogo: "1 Alana 1 Bedava"
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
                                    <div className="flex items-center gap-2">
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
                                    <div className="relative">
                                        <button onClick={() => setOpenDropdownId(openDropdownId === camp.id ? null : camp.id)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                        </button>
                                        {openDropdownId === camp.id && (
                                            <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-100 z-10 overflow-hidden text-sm">
                                                <button onClick={() => handleEdit(camp)} className="w-full text-left px-4 py-2.5 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]">edit</span> Düzenle
                                                </button>
                                                <div className="h-px bg-slate-100 w-full"></div>
                                                <button onClick={() => handleDelete(camp.id)} className="w-full text-left px-4 py-2.5 text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-[16px]">delete</span> Sil
                                                </button>
                                            </div>
                                        )}
                                    </div>
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
                                        Hedef Kitle: 
                                        <button onClick={() => handleOpenAudiencePreview(camp)} className="text-[var(--color-primary)] bg-purple-50 hover:bg-purple-100 transition-colors px-2 py-0.5 rounded ml-auto border border-purple-200/50 cursor-pointer shadow-sm active:scale-95 flex items-center gap-1">
                                            {camp.estimated_audience_count} Kişi
                                            <span className="material-symbols-outlined text-[12px]">visibility</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500 border-b border-slate-100 pb-3">
                                        <span className="material-symbols-outlined text-[16px] opacity-70">filter_alt</span>
                                        <span className="truncate">{segmentMap[camp.target_segment] || camp.target_segment}</span>
                                    </div>

                                    {/* Adım Adım Kampanya Süreci & Rapor */}
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

                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Dönüşüm / Hedef</span>
                                            <span className="text-[12px] font-black text-slate-800">{camp.actual_conversion_count || 0} / {camp.estimated_audience_count || 0} Kişi</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Dönüşüm Oranı</span>
                                            <span className="text-[12px] font-black text-[var(--color-primary)]">
                                                {camp.estimated_audience_count > 0 ? (((camp.actual_conversion_count || 0) / camp.estimated_audience_count) * 100).toFixed(1) : 0}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-600">Gerçekleşen Ciro</span>
                                            <span className="text-[14px] font-black text-emerald-600">₺{Number(camp.actual_revenue_impact || 0).toLocaleString('tr-TR')}</span>
                                        </div>
                                    </div>

                                    {/* WhatsApp Gönderim Butonu */}
                                    {camp.status === 'draft' && Array.isArray(camp.channel) && camp.channel.includes('whatsapp') && (
                                        <button
                                            onClick={() => handleWhatsAppSend(camp.id)}
                                            disabled={sendingCampaignId === camp.id}
                                            className="mt-2 w-full py-2.5 bg-green-500 text-white rounded-xl text-xs font-bold hover:bg-green-600 transition-all flex items-center justify-center gap-2 shadow-sm shadow-green-200 disabled:opacity-50"
                                        >
                                            {sendingCampaignId === camp.id ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Gönderiliyor...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-[16px]">send</span>
                                                    WhatsApp ile Gönder
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {(camp.actual_conversion_count > 0 || camp.status === 'completed') && (
                                        <button onClick={() => handleOpenReport(camp)} className="mt-2 w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                                            Sonuç Raporunu Gör
                                        </button>
                                    )}
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
                                {[1, 2, 3].map(stepNum => {
                                    const isCompleted = currentStep > stepNum;
                                    const isActive = currentStep === stepNum;
                                    return (
                                        <div key={stepNum} className="flex flex-col items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${isActive ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-purple-500/30' : isCompleted ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200 text-slate-400'}`}>
                                                {isCompleted ? <span className="material-symbols-outlined text-[16px]">check</span> : stepNum}
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-[var(--color-primary)]' : 'text-slate-400'}`}>
                                                {stepNum === 1 ? 'Teklif' : stepNum === 2 ? 'Kitle' : 'Kanal'}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Scrollable Form Content */}
                        <div className="p-8 overflow-y-auto flex-1 bg-white">

                            {/* STEP 1: TEKLİFİ OLUŞTUR */}
                            {currentStep === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[var(--color-primary)]">local_offer</span>
                                        1. Teklifi Oluştur
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium">Kampanyanızın içeriğini ve müşterilere sunacağınız fırsatı belirleyin.</p>

                                    <div>
                                        <label className="block text-[12px] font-bold text-slate-700 uppercase tracking-widest mb-2">KAMPANYA ADI</label>
                                        <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-bold" placeholder="Örn: Hafta Sonu Fırsatı" />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">KAMPANYA TİPİ (TEKLİF)</label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {[
                                                { id: 'percentage_discount', label: 'Yüzde İndirim', icon: 'percent' },
                                                { id: 'fixed_discount', label: 'Tutar İndirimi', icon: 'payments' },
                                                { id: 'bogo', label: '1 Alana 1 Bedava', icon: 'exposure_plus_1' },
                                                { id: 'free_addon', label: 'Ücretsiz Ek Hizmet', icon: 'redeem' },
                                                { id: 'bundle_offer', label: 'Paket Teklifi', icon: 'inventory_2' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, offer_type: opt.id, offer_condition: '', offer_value: '' })}
                                                    className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-2 ${formData.offer_type === opt.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm ring-1 ring-[var(--color-primary)]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                                >
                                                    <span className={`material-symbols-outlined ${formData.offer_type === opt.id ? 'text-[var(--color-primary)]' : 'text-slate-400'}`}>{opt.icon}</span>
                                                    <span className={`font-bold text-sm ${formData.offer_type === opt.id ? 'text-[var(--color-primary)]' : 'text-slate-700'}`}>{opt.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* DİNAMİK ALANLAR */}
                                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mt-4">

                                        {/* YÜZDE VEYA TUTAR İNDİRİMİ */}
                                        {(formData.offer_type === 'percentage_discount' || formData.offer_type === 'fixed_discount') && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">GEÇERLİ OLDUĞU HİZMET (OPSİYONEL)</label>
                                                    <input type="text" value={formData.offer_condition} onChange={e => setFormData({ ...formData, offer_condition: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" placeholder="Örn: Lazer Epilasyon veya boş bırakın" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-[var(--color-primary)] uppercase tracking-widest">İNDİRİM {formData.offer_type === 'percentage_discount' ? 'ORANI' : 'TUTARI'}</label>
                                                    <div className="relative">
                                                        {formData.offer_type === 'percentage_discount' && <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--color-primary)]">%</span>}
                                                        {formData.offer_type === 'fixed_discount' && <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-[var(--color-primary)]">₺</span>}
                                                        <input type="number" value={formData.offer_value} onChange={e => setFormData({ ...formData, offer_value: e.target.value })} className="w-full pl-8 pr-4 py-3 bg-white border border-[var(--color-primary)]/30 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] border-[var(--color-primary)] font-bold text-[var(--color-primary)]" placeholder={formData.offer_type === 'percentage_discount' ? '20' : '150'} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 1 ALANA 1 BEDAVA VEYA ÜCRETSİZ EK HİZMET */}
                                        {(formData.offer_type === 'bogo' || formData.offer_type === 'free_addon') && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">{formData.offer_type === 'bogo' ? 'ALINACAK HİZMET' : 'ANA HİZMET'}</label>
                                                    <input type="text" value={formData.offer_condition} onChange={e => setFormData({ ...formData, offer_condition: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold" placeholder="Örn: Cilt Bakımı" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-bold text-emerald-600 uppercase tracking-widest">{formData.offer_type === 'bogo' ? 'BEDAVA VERİLECEK HİZMET' : 'HEDİYE HİZMET'}</label>
                                                    <input type="text" value={formData.offer_value} onChange={e => setFormData({ ...formData, offer_value: e.target.value })} className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-800" placeholder="Örn: Koltuk Altı Lazer" />
                                                </div>
                                            </div>
                                        )}

                                        {/* PAKET TEKLİFİ */}
                                        {(formData.offer_type === 'bundle_offer' || formData.offer_type === 'package_upgrade') && (
                                            <div className="space-y-1.5">
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">PAKET İÇERİĞİ / TEKLİF DETAYI</label>
                                                <textarea value={formData.offer_value} onChange={e => setFormData({ ...formData, offer_value: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold min-h-[80px]" placeholder="Örn: 3 Seans Lazer + 1 Cilt Bakımı sadece 2000 TL" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: HEDEF KİTLEYİ SEÇ */}
                            {currentStep === 2 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <h4 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[var(--color-primary)]">group_add</span>
                                        2. Hedef Kitleyi Seç
                                    </h4>
                                    <p className="text-sm text-slate-500 font-medium">Bu kampanyanın hangi müşteri segmentine ulaşmasını istiyorsunuz?</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {initialSegment && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, target_segment: initialSegment.id });
                                                    setPreviewData({ count: initialSegment.count, sample: initialSegment.sample });
                                                }}
                                                className={`p-4 rounded-xl border text-left transition-all col-span-1 md:col-span-2 ${formData.target_segment === initialSegment.id ? 'border-amber-500 bg-amber-50 shadow-sm ring-1 ring-amber-500' : 'border-amber-200 bg-amber-50/50 hover:border-amber-300'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="material-symbols-outlined text-amber-500 text-[18px]">auto_awesome</span>
                                                    <h5 className={`font-bold ${formData.target_segment === initialSegment.id ? 'text-amber-700' : 'text-amber-800'}`}>Yapay Zeka Hedef Kitlesi</h5>
                                                </div>
                                                <p className="text-[12px] text-amber-700/80 mb-2 font-medium">{initialSegment.name}</p>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {initialSegment.sample?.slice(0, 3).map((s: any) => (
                                                        <span key={s.id} className="text-[10px] bg-white px-2 py-0.5 rounded border border-amber-200 text-amber-600 font-bold">{s.name}</span>
                                                    ))}
                                                    {initialSegment.count > 3 && <span className="text-[10px] text-amber-600/60 font-bold">+{initialSegment.count - 3} kişi daha</span>}
                                                </div>
                                            </button>
                                        )}
                                        {[
                                            { id: 'vip', label: 'VIP Müşteriler', desc: 'Sadece en çok harcama yapanlar' },
                                            { id: 'risk', label: 'Riskli (Gelmeyenler)', desc: 'Uzun süredir randevu almayanlar' },
                                            { id: 'new', label: 'Yeni Müşteriler', desc: 'Sadece tek ziyaret yapanlar' },
                                            { id: 'loyal', label: 'Sadık Müşteriler', desc: 'Düzenli gelen müşteriler' },
                                            { id: 'all', label: 'Tüm Müşteriler', desc: 'Sistemdeki herkes' }
                                        ].map(seg => (
                                            <button
                                                key={seg.id} type="button"
                                                onClick={() => {
                                                    setFormData({ ...formData, target_segment: seg.id });
                                                    // Immediately trigger a preview load when segment changes in step 2
                                                    previewCampaignTargets(seg.id).then(res => setPreviewData(res));
                                                }}
                                                className={`p-4 rounded-xl border text-left transition-all ${formData.target_segment === seg.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm ring-1 ring-[var(--color-primary)]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                                            >
                                                <h5 className={`font-bold ${formData.target_segment === seg.id ? 'text-[var(--color-primary)]' : 'text-slate-800'}`}>{seg.label}</h5>
                                                <p className="text-[11px] text-slate-500 mt-1">{seg.desc}</p>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Basit Önizleme Kutusu */}
                                    <div className="mt-6 bg-slate-50 rounded-2xl p-5 border border-slate-200 flex items-center justify-between">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">TAHMİNİ ULAŞILACAK KİŞİ</p>
                                            <p className="text-sm text-slate-600 mt-0.5">Seçilen segmente göre otomatik hesaplanıyor.</p>
                                        </div>
                                        <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 font-black text-2xl text-[var(--color-primary)]">
                                            {previewData.count} <span className="text-sm font-bold text-slate-400">kişi</span>
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
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* MESAJ İÇERİĞİ VE AI */}
                                    <div className="mt-8 pt-6 border-t border-slate-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <h5 className="font-extrabold text-slate-700 text-sm">Kampanya Mesajı</h5>
                                            <button 
                                                type="button" 
                                                onClick={handleGenerateMessage}
                                                disabled={isGeneratingMessage || !formData.name}
                                                className="flex items-center gap-1.5 bg-gradient-to-r from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                            >
                                                <span className={`material-symbols-outlined text-[16px] ${isGeneratingMessage ? 'animate-spin' : ''}`}>
                                                    {isGeneratingMessage ? 'sync' : 'auto_awesome'}
                                                </span>
                                                AI ile Üret
                                            </button>
                                        </div>

                                        {aiMessageVariants.length > 0 && (
                                            <div className="mb-4 space-y-3 bg-purple-50 p-4 rounded-2xl border border-purple-100">
                                                <p className="text-xs font-bold text-purple-700 uppercase tracking-widest mb-2">AI Tarafından Üretilen Seçenekler</p>
                                                {aiMessageVariants.map((v, i) => (
                                                    <div key={i} className="flex gap-3 bg-white p-3 rounded-xl border border-purple-100 shadow-sm relative group cursor-pointer hover:border-purple-300" onClick={() => handleSelectVariant(v.text)}>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">Varyant {v.variant}</span>
                                                                <span className="text-[10px] font-bold text-purple-500 uppercase">{v.tone}</span>
                                                            </div>
                                                            <p className="text-sm text-slate-700 leading-relaxed italic">"{v.text}"</p>
                                                        </div>
                                                        <div className="shrink-0 flex items-center">
                                                            <button type="button" className="w-8 h-8 rounded-full bg-purple-50 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center text-purple-400 transition-colors">
                                                                <span className="material-symbols-outlined text-[18px]">touch_app</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <textarea
                                            value={formData.message_content || ""}
                                            onChange={e => setFormData({ ...formData, message_content: e.target.value })}
                                            className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all text-sm font-medium resize-none"
                                            placeholder="Müşterilere gidecek mesaj veya E-posta içeriği..."
                                        />
                                        <p className="text-right text-[11px] font-bold text-slate-400 mt-1">{(formData.message_content || "").length} karakter</p>
                                    </div>

                                    {/* Basit Özet Kartı */}
                                    <div className="bg-slate-800 text-white rounded-2xl p-6 mt-6 shadow-xl relative overflow-hidden">
                                        <div className="absolute right-0 top-0 opacity-10">
                                            <span className="material-symbols-outlined text-9xl">campaign</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">KAMPANYA ÖZETİ</p>
                                        <h3 className="text-2xl font-black mb-4 relative z-10">{formData.name}</h3>

                                        <div className="grid grid-cols-2 gap-4 relative z-10 text-sm">
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">TEKLİF</p>
                                                <p className="font-medium">{formData.offer_details || "Belirlenmedi"}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">KİTLE</p>
                                                <p className="font-medium">{segmentMap[formData.target_segment]}</p>
                                            </div>
                                            <div className="col-span-2 mt-2 pt-4 border-t border-slate-700/50">
                                                <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2">KANALLAR</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {formData.channel.length > 0 ? formData.channel.map(ch => (
                                                        <span key={ch} className="bg-slate-700 px-3 py-1 rounded-full text-xs font-bold">{channelMap[ch]}</span>
                                                    )) : <span className="text-rose-400 font-bold text-sm">Kanal Seçilmedi</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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

                            {currentStep < 3 ? (
                                <button type="button" onClick={handleNextStep} className="px-8 py-2.5 bg-slate-800 text-white font-bold rounded-xl shadow-lg hover:bg-slate-900 transition-all text-sm flex items-center gap-2">
                                    Devam Et <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                </button>
                            ) : (
                                <button type="button" onClick={handleCreateOrUpdate} disabled={isSubmitting || isPreviewLoading} className="px-8 py-2.5 bg-[var(--color-primary)] text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:opacity-90 active:scale-95 transition-all text-sm flex items-center gap-2">
                                    {isSubmitting ? (editingCampaignId ? "Güncelleniyor..." : "Oluşturuluyor...") : (editingCampaignId ? "Değişiklikleri Kaydet" : "Kampanyayı Oluştur")}
                                    {!isSubmitting && <span className="material-symbols-outlined text-[18px]">{editingCampaignId ? 'save' : 'rocket_launch'}</span>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Rapor Modalı */}
            {isReportOpen && currentReportCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden my-8 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flexItems-center justify-between">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[var(--color-primary)]">bar_chart</span>
                                    Kampanya Sonuç Raporu
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">{currentReportCampaign.name}</p>
                            </div>
                            <button onClick={() => setIsReportOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Hedef Kitle</p>
                                    <p className="text-2xl font-black text-slate-800">{currentReportCampaign.estimated_audience_count}</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-center">
                                    <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest mb-1">Dönüşüm</p>
                                    <p className="text-2xl font-black text-[var(--color-primary)]">{currentReportCampaign.actual_conversion_count}</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Kazanılan Ciro</p>
                                    <p className="text-2xl font-black text-emerald-600">₺{Number(currentReportCampaign.actual_revenue_impact || 0).toLocaleString('tr-TR')}</p>
                                </div>
                            </div>

                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">Dönüşüm Yapan Müşteriler</h4>

                            {isReportLoading ? (
                                <div className="py-12 flex justify-center">
                                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[var(--color-primary)] animate-spin"></div>
                                </div>
                            ) : reportData.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">mood_bad</span>
                                    <p className="font-medium text-sm">Henüz bu kampanyadan dönüş yapan müşteri bulunmuyor.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                    <table className="w-full text-left border-collapse bg-white">
                                        <thead>
                                            <tr className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-200">
                                                <th className="p-4 px-5">Müşteri</th>
                                                <th className="p-4 px-5">Telefon</th>
                                                <th className="p-4 px-5">Dönüşüm Tarihi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {reportData.map((row: any) => (
                                                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 px-5 font-bold text-slate-800">
                                                        <CustomerLink
                                                            id={row.customer_id}
                                                            firstName={row.customers?.first_name}
                                                            lastName={row.customers?.last_name}
                                                        />
                                                    </td>
                                                    <td className="p-4 px-5 text-slate-600 font-medium">
                                                        {row.customers?.phone}
                                                    </td>
                                                    <td className="p-4 px-5 text-slate-500">
                                                        {row.converted_at ? new Date(row.converted_at).toLocaleDateString('tr-TR') : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Kitle Önizleme Modalı */}
            {isAudienceModalOpen && audienceModalCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-[32px] w-full max-w-xl shadow-2xl overflow-hidden my-8 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[var(--color-primary)]">groups</span>
                                    Hedef Kitle Önizleme
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mt-1">{audienceModalCampaign.name}</p>
                            </div>
                            <button onClick={() => setIsAudienceModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-center mb-6">
                                <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-widest mb-1">Toplam Kitle Büyüklüğü</p>
                                <p className="text-3xl font-black text-[var(--color-primary)]">{audienceModalCampaign.estimated_audience_count} <span className="text-xl">Kişi</span></p>
                                <p className="text-xs font-semibold text-purple-700/70 mt-1">{audienceModalCampaign.segment_real_name}</p>
                            </div>

                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">GÖNDERİLECEK KİŞİLER (Örnek Liste)</h4>

                            {isAudienceLoading ? (
                                <div className="py-12 flex justify-center">
                                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[var(--color-primary)] animate-spin"></div>
                                </div>
                            ) : audienceModalData.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                                    <p className="font-medium text-sm">Bu kitleye uygun müşteri bulunamadı.</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                                        <table className="w-full text-left border-collapse bg-white">
                                            <thead>
                                                <tr className="bg-slate-50 text-[11px] uppercase tracking-widest text-slate-500 font-bold border-b border-slate-200">
                                                    <th className="p-4 px-5">Müşteri Adı Soyadı</th>
                                                    <th className="p-4 px-5">Telefon No</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm">
                                                {audienceModalData.slice((audiencePage - 1) * AUDIENCE_PER_PAGE, audiencePage * AUDIENCE_PER_PAGE).map((row: any) => (
                                                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors last:border-0">
                                                        <td className="p-4 px-5 font-bold text-slate-800">
                                                            <CustomerLink
                                                                id={row.id}
                                                                firstName={row.name ? row.name.split(' ')[0] : row.first_name}
                                                                lastName={row.name ? row.name.split(' ').slice(1).join(' ') : row.last_name}
                                                            />
                                                        </td>
                                                        <td className="p-4 px-5 text-slate-600 font-medium">
                                                            {row.phone || row.customers?.phone || "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    {Math.ceil(audienceModalData.length / AUDIENCE_PER_PAGE) > 1 && (
                                        <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-4">
                                            <button 
                                                onClick={() => setAudiencePage(p => Math.max(1, p - 1))} 
                                                disabled={audiencePage === 1}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${audiencePage === 1 ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                <span className="material-symbols-outlined text-[16px]">chevron_left</span> Önceki
                                            </button>
                                            <span className="text-xs font-bold text-slate-500">
                                                Sayfa {audiencePage} / {Math.ceil(audienceModalData.length / AUDIENCE_PER_PAGE)}
                                            </span>
                                            <button 
                                                onClick={() => setAudiencePage(p => Math.min(Math.ceil(audienceModalData.length / AUDIENCE_PER_PAGE), p + 1))} 
                                                disabled={audiencePage === Math.ceil(audienceModalData.length / AUDIENCE_PER_PAGE)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${audiencePage === Math.ceil(audienceModalData.length / AUDIENCE_PER_PAGE) ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'}`}
                                            >
                                                Sonraki <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {audienceModalData.length === 100 && (
                                <p className="text-center text-xs text-slate-400 font-bold mt-4 italic">Liste sunucu performansı sebebiyle maksimum 100 kişi ile sınırlandırılmıştır.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
