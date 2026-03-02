import { getServices } from "@/app/actions/services";
import HizmetlerClient from "./HizmetlerClient";

export const metadata = {
    title: "Hizmetler | Zarif Güzellik AI",
    description: "İşletmenizin hizmet kataloğu ve fiyat yönetimi."
};

// Next.js App Router: Server Component
// Bu sayfa sunucuda çalışır, Supabase veritabanından güvenli şekilde RLS'e uğrayıp giriş yapan işletmenin hizmetlerini çeker.
export default async function HizmetlerPage() {
    // 1. Veritabanından (Supabase) Kullanıcının Hizmetlerini Çek (Server-Side)
    const services = await getServices();

    // 2. Client tarafındaki etkileşimli (interaktif) tablo bileşenine verileri aktar
    return <HizmetlerClient initialServices={services} />;
}
