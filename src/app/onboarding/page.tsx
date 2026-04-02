import OnboardingClient from "./OnboardingClient";
import { getBusinessProfile } from "@/app/actions/businesses";
import { getServices, getServiceCategories, seedStandardCatalog } from "@/app/actions/services";
import { getSalons } from "@/app/actions/salons";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
    const { data: business } = await getBusinessProfile();

    if (!business) {
        redirect("/login");
    }

    if (business.is_onboarding_completed) {
        redirect("/");
    }

    let services = await getServices();
    let categories = await getServiceCategories();

    // Otomatik Demo / Varsayılan Veri Yükleme
    if (!categories || categories.length === 0) {
        await seedStandardCatalog();
        services = await getServices();
    }

    const salons = await getSalons();

    return (
        <OnboardingClient
            business={business}
            services={services || []}
            salons={salons || []}
        />
    );
}
