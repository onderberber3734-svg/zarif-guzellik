import { createClient } from "@/utils/supabase/server";
import { getBusinessProfile } from "@/app/actions/businesses";
import { getWorkingHours } from "@/app/actions/workingHours";
import AyarlarClient from "./AyarlarClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AyarlarPage() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    const { data: business } = await getBusinessProfile();
    const { data: workingHours } = await getWorkingHours();

    return <AyarlarClient
        user={user}
        business={business}
        initialWorkingHours={workingHours || []}
    />;
}
