import { getStaffList } from "@/app/actions/staff";
import { getServices } from "@/app/actions/services";
import PersonelClient from "./PersonelClient";

export const dynamic = 'force-dynamic';

export default async function PersonelPage() {
    const { data: staffList } = await getStaffList();
    const services = await getServices();
    return <PersonelClient initialStaff={staffList || []} services={services} />;
}
