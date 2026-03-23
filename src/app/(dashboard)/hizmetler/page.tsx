import { getServices, getServiceCategories } from "@/app/actions/services";
import { getSalons } from "@/app/actions/salons";
import { getStaffList } from "@/app/actions/staff";
import HizmetlerClient from "./HizmetlerClient";

export const metadata = {
    title: "Hizmetler | Zarif Güzellik AI",
    description: "İşletmenizin hizmet kataloğu ve fiyat yönetimi."
};

export default async function HizmetlerPage() {
    const [services, categories, salons, staffResult] = await Promise.all([
        getServices(),
        getServiceCategories(),
        getSalons(),
        getStaffList()
    ]);

    const staffList = staffResult.success ? staffResult.data || [] : [];

    return <HizmetlerClient initialServices={services} initialCategories={categories} salons={salons} staffList={staffList} />;
}
