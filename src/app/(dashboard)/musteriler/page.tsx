import { getCustomersWithStats } from "@/app/actions/customers";
import MusterilerClient from "./MusterilerClient";

export const dynamic = 'force-dynamic';

export default async function MusterilerPage() {
    const customers = await getCustomersWithStats();

    return <MusterilerClient initialCustomers={customers} />;
}
