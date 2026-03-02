import { getServices } from "@/app/actions/services";
import { getCustomers } from "@/app/actions/customers";
import RandevuOlusturClient from "./RandevuOlusturClient";

export const dynamic = 'force-dynamic';

export default async function RandevuOlusturPage() {
    const services = await getServices();
    const customers = await getCustomers();

    return <RandevuOlusturClient services={services} customers={customers} />;
}
