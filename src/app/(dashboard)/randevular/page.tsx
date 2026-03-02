import { getAppointments } from "@/app/actions/appointments";
import RandevularClient from "./RandevularClient";

export const dynamic = 'force-dynamic';

export default async function RandevularPage() {
    // 1. Randevuları Supabase'den çek
    const appointments = await getAppointments();

    // 2. Client tarafına data aktar
    return <RandevularClient appointments={appointments} />;
}
