import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { getBusinessProfile } from "@/app/actions/businesses";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: business } = await getBusinessProfile();

    if (business && !business.is_onboarding_completed) {
        redirect("/onboarding");
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-72">
                <Header />
                <div className="p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
