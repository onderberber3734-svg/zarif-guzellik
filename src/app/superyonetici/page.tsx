import { getAllBusinessesList } from "@/app/actions/superadmin";
import SuperAdminClient from "./SuperAdminClient";

export default async function SuperAdminPage() {
    const { success, data, error } = await getAllBusinessesList();

    if (!success) {
        return (
            <div className="p-10">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Hata</h1>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="p-10 w-full min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Süper Admin Paneli</h1>
                <p className="text-slate-500 mt-2 text-lg">
                    Sistemde kayıtlı olan tüm salonları, kapasitelerini ve istatistiklerini buradan inceleyip silebilirsiniz.
                </p>
            </header>

            <SuperAdminClient businesses={data || []} />
        </div>
    );
}
