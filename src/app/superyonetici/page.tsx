import { getAllBusinessesList, getAllAuthUsers } from "@/app/actions/superadmin";
import SuperAdminClient from "./SuperAdminClient";

export default async function SuperAdminPage() {
    const [bizResult, usersResult] = await Promise.all([
        getAllBusinessesList(),
        getAllAuthUsers(),
    ]);

    if (!bizResult.success) {
        return (
            <div className="p-10">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Hata</h1>
                <p>{bizResult.error}</p>
            </div>
        );
    }

    return (
        <div className="p-10 w-full min-h-screen">
            <header className="mb-8">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Süper Admin Paneli</h1>
                <p className="text-slate-500 mt-2 text-lg">
                    Sistemde kayıtlı olan tüm salonları, kullanıcıları ve istatistiklerini buradan inceleyip yönetebilirsiniz.
                </p>
            </header>

            <SuperAdminClient businesses={bizResult.data || []} users={usersResult.success ? (usersResult.data || []) : []} />
        </div>
    );
}
