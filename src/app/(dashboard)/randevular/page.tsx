import { getAppointments, getPendingSessionPlans } from "@/app/actions/appointments";
import { getAiInsight } from "@/app/actions/ai";
import RandevularClient from "./RandevularClient";
import { FillEmptySlotsCard } from "@/components/ai/FillEmptySlotsCard";

export const dynamic = 'force-dynamic';

export default async function RandevularPage() {
    const [appointments, pendingSessions, aiResult] = await Promise.all([
        getAppointments(),
        getPendingSessionPlans(),
        getAiInsight("fill_empty_slots")
    ]);

    const aiInsight = aiResult.success && aiResult.data ? aiResult.data : null;

    return (
        <div className="space-y-6">
            <FillEmptySlotsCard initialInsight={aiInsight} isStale={aiResult.isStale} />
            <RandevularClient appointments={appointments} pendingSessions={pendingSessions} />
        </div>
    );
}
