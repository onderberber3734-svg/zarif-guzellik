import { getAllSessionPlansSummary } from "@/app/actions/packages";
import { getAiInsight } from "@/app/actions/ai";
import PaketSeansClient from "./PaketSeansClient";
import { WinbackCard } from "@/components/ai/WinbackCard";

export const metadata = {
    title: "Paket & Seans Takibi | Zarif Güzellik",
    description: "Paket ve seans yönetimi",
};

export default async function PaketSeansPage() {
    const [plansRes, aiResult] = await Promise.all([
        getAllSessionPlansSummary(),
        getAiInsight("winback")
    ]);

    const plans = plansRes.success && plansRes.data ? plansRes.data : [];
    const aiInsight = aiResult.success && aiResult.data ? aiResult.data : null;

    return (
        <div className="space-y-6">
            <WinbackCard initialInsight={aiInsight} isStale={aiResult.isStale} />
            <PaketSeansClient initialPlans={plans as any} />
        </div>
    );
}
