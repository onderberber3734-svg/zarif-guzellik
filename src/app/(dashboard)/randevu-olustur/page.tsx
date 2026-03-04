import { getServices } from "@/app/actions/services";
import { getCustomers } from "@/app/actions/customers";
import { getAppointments } from "@/app/actions/appointments";
import { getSalons } from "@/app/actions/salons";
import RandevuOlusturClient from "./RandevuOlusturClient";

export const dynamic = 'force-dynamic';

export default async function RandevuOlusturPage() {
    const services = await getServices();
    const customers = await getCustomers();
    const appointments = await getAppointments();
    const salons = await getSalons();

    return <RandevuOlusturClient services={services} customers={customers} appointments={appointments} salons={salons} />;
}
