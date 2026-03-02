import { getCampaigns } from "@/app/actions/campaigns";
import KampanyalarClient from "./KampanyalarClient";

export const dynamic = 'force-dynamic';

export default async function KampanyalarPage() {
    const campaigns = await getCampaigns();

    return <KampanyalarClient initialCampaigns={campaigns} />;
}
