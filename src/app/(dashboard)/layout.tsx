import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
