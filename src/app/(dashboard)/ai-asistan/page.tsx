import { getAiInsight } from "@/app/actions/ai";
import { getCampaigns } from "@/app/actions/campaigns";
import { FillEmptySlotsCard } from "@/components/ai/FillEmptySlotsCard";
import { WinbackCard } from "@/components/ai/WinbackCard";
import { AiDailySummaryCard } from "@/components/ai/AiDailySummaryCard";
import { AiCampaignChatCard } from "@/components/ai/AiCampaignChatCard";
import { ActiveCampaignsCard } from "@/components/ai/ActiveCampaignsCard";
import { AiTopCardsCarousel } from "@/components/ai/AiTopCardsCarousel";

export const dynamic = 'force-dynamic';

export default async function AiAsistanPage() {
    // Tüm AI verilerini paralel çek
    const [dailyRes, emptySlotsRes, winbackRes, campaignsData] = await Promise.all([
        getAiInsight("daily_summary"),
        getAiInsight("fill_empty_slots"),
        getAiInsight("winback"),
        getCampaigns()
    ]);

    const dailyInsight = dailyRes.success && dailyRes.data ? dailyRes.data : null;
    const emptySlotsInsight = emptySlotsRes.success && emptySlotsRes.data ? emptySlotsRes.data : null;
    const winbackInsight = winbackRes.success && winbackRes.data ? winbackRes.data : null;

    // Aktif/yayında kampanyalar (gerçek DB verisi)
    const activeCampaigns = (campaignsData || [])
        .filter((c: any) => ["active", "published", "sending", "sent"].includes(c.status))
        .slice(0, 5)
        .map((c: any) => ({
            id: c.id,
            name: c.name,
            status: c.status,
            channel: Array.isArray(c.channel) ? c.channel[0] : (c.channel || "WhatsApp"),
            estimated_audience_count: c.estimated_audience_count || 0,
            send_status: c.send_status || "draft",
            offer_type: c.offer_type || "",
            offer_value: c.offer_details?.offer_value || "",
            created_at: c.created_at,
        }));

    return (
        <div className="space-y-8 lg:space-y-12 pb-20 max-w-[1400px] mx-auto overflow-hidden">
            <div className="flex items-center gap-4 mb-2">
                <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-800" style={{ fontFamily: "'Playfair Display', serif" }}>
                    AI Risk & Fırsat Merkezi
                </h2>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full animate-pulse border border-purple-200">BETA</span>
            </div>

            {/* BÖLÜM 1: Risk-O-Meter & Boş Slot Tahmini (Carousel) */}
            <AiTopCardsCarousel 
                winbackCard={<WinbackCard initialInsight={winbackInsight} isStale={winbackRes.isStale} />} 
                emptySlotsCard={<FillEmptySlotsCard initialInsight={emptySlotsInsight} isStale={emptySlotsRes.isStale} />} 
            />

            {/* BÖLÜM 2: AI Kampanya Chat Sihirbazı */}
            <AiCampaignChatCard />

            {/* BÖLÜM 3: Yayındaki Kampanyalar & Haftalık Öngörüler */}
            <div className="bg-slate-50/50 -mx-6 lg:-mx-10 px-6 lg:px-10 py-12 border-y border-slate-100/80">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch">
                    {/* SOL (2 Kolon): Kampanya Tablosu */}
                    <div className="lg:col-span-2">
                        <ActiveCampaignsCard campaigns={activeCampaigns} />
                    </div>

                    {/* SAĞ (1 Kolon): Haftalık Öngörüler */}
                    <div className="lg:col-span-1">
                        <AiDailySummaryCard initialInsight={dailyInsight} isStale={dailyRes.isStale} />
                    </div>
                </div>
            </div>
        </div>
    );
}
