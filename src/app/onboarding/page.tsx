import OnboardingClient from "./OnboardingClient";
import { getBusinessProfile } from "@/app/actions/businesses";
import { getServices } from "@/app/actions/services";
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

    const services = await getServices();
    const salons = await getSalons();

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex">
                <OnboardingClient
                    business={business}
                    services={services || []}
                    salons={salons || []}
                />
            </div>
        </main>
    );
}
