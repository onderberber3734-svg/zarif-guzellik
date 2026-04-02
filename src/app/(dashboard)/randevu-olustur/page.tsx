import { getServices } from "@/app/actions/services";
import { getCustomers } from "@/app/actions/customers";
import { getAppointments } from "@/app/actions/appointments";
import { getSalons } from "@/app/actions/salons";
import { getWorkingHours } from "@/app/actions/workingHours";
import RandevuOlusturClient from "./RandevuOlusturClient";

import { Suspense } from "react";

export const dynamic = 'force-dynamic';

export default async function RandevuOlusturPage() {
    const services = await getServices();
    const customers = await getCustomers();
    const appointments = await getAppointments();
    const salons = await getSalons();
    const { data: workingHours } = await getWorkingHours();

    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Yükleniyor...</div>}>
            <RandevuOlusturClient
                services={services}
                customers={customers}
                appointments={appointments}
                salons={salons}
                workingHours={workingHours || []}
            />
        </Suspense>
    );
}
