import { getCampaigns, getSegmentDetails } from "@/app/actions/campaigns";
import KampanyalarClient from "./KampanyalarClient";

export const dynamic = 'force-dynamic';

export default async function KampanyalarPage({ searchParams }: { searchParams: Promise<{ segment_id?: string, service_id?: string, service_name?: string, offer_type?: string, offer_value?: string, message_content?: string, concept_name?: string, ai_goal?: string }> }) {
    const campaigns = await getCampaigns();
    const params = await searchParams;
    
    let segmentDetails = null;
    if (params.segment_id) {
        segmentDetails = await getSegmentDetails(params.segment_id);
    }

    return <KampanyalarClient initialCampaigns={campaigns} initialSegment={segmentDetails} initialParams={params} />;
}
