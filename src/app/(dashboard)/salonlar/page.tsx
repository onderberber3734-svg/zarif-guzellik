import { getSalons } from "@/app/actions/salons";
import { getServices } from "@/app/actions/services";
import SalonlarClient from "./SalonlarClient";

export const dynamic = 'force-dynamic';

export default async function SalonlarPage() {
    const salons = await getSalons();
    const services = await getServices();
    return <SalonlarClient initialSalons={salons} services={services} />;
}
