import { getCampaignById, getCampaigns, getSegmentDetails } from "@/app/actions/campaigns";
import KampanyalarClient from "./KampanyalarClient";

export const dynamic = 'force-dynamic';

export default async function KampanyalarPage({ searchParams }: { searchParams: Promise<{ draft_id?: string, segment_id?: string, service_id?: string, service_name?: string, offer_type?: string, offer_value?: string, message_content?: string, concept_name?: string, ai_goal?: string }> }) {
    const campaigns = await getCampaigns();
    const params = await searchParams;
    
    let segmentDetails = null;
    if (params.segment_id) {
        segmentDetails = await getSegmentDetails(params.segment_id);
    }

    const initialDraft = params.draft_id ? await getCampaignById(params.draft_id) : null;

    return <KampanyalarClient initialCampaigns={campaigns} initialSegment={segmentDetails} initialParams={params} initialDraft={initialDraft} />;
}
