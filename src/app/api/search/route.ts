import { NextResponse } from "next/server";
import { getCustomers } from "@/app/actions/customers";
import { getAppointments } from "@/app/actions/appointments";
import { getServices } from "@/app/actions/services";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase();

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] });
    }

    try {
        const [customers, appointments, services] = await Promise.all([
            getCustomers(),
            getAppointments(),
            getServices()
        ]);

        const results = [];

        // Müşteri Araması (Ad, Soyad, Telefon)
        const matchedCustomers = customers.filter(c =>
            c.first_name.toLowerCase().includes(query) ||
            c.last_name.toLowerCase().includes(query) ||
            (c.phone && c.phone.includes(query))
        ).slice(0, 5); // En fazla 5 müşteri

        for (const c of matchedCustomers) {
            results.push({
                type: 'customer',
                id: c.id,
                title: `${c.first_name} ${c.last_name}`,
                subtitle: c.phone || 'Telefon yok',
                url: `/musteriler/${c.id}`
            });
        }

        // Randevu Araması (Müşteri adına göre veya hizmete göre o günün randevuları vs. çok karmaşık olmasın diye sadece ID veya tarih)
        // Kullanıcı randevularda tam olarak ne arar? Genelde "Ayşe" yazar ve randevusunu bulmak ister, 
        // ancak biz zaten müşteriyi gösteriyoruz. Randevu için spesifik bir arama senkronu ekleyelim:
        const matchedAppointments = appointments.filter(a => {
            const customer: any = a.customer;
            const custName = `${customer?.first_name || ''} ${customer?.last_name || ''}`.toLowerCase();
            return custName.includes(query) || a.appointment_date.includes(query);
        }).slice(0, 3);

        for (const a of matchedAppointments) {
            results.push({
                type: 'appointment',
                id: a.id,
                title: `${(a.customer as any)?.first_name || 'Bilinmeyen'} ${(a.customer as any)?.last_name || 'Müşteri'} Randevusu`,
                subtitle: `${a.appointment_date} - ${a.appointment_time}`,
                url: `/randevular?date=${a.appointment_date}` // İlgili tarihe gitmesi için bir query parametresi eklenebilir veya direkt randevular sayfasına
            });
        }

        // Hizmet Araması (Hizmet Adı, Açıklaması)
        const matchedServices = services.filter((s: any) =>
            s.name.toLowerCase().includes(query) ||
            (s.description && s.description.toLowerCase().includes(query))
        ).slice(0, 3);

        for (const s of matchedServices) {
            results.push({
                type: 'service',
                id: s.id,
                title: s.name,
                subtitle: `₺${s.price} - ${s.duration_minutes} dk`,
                url: `/hizmetler`
            });
        }

        return NextResponse.json({ results });

    } catch (error) {
        console.error("API Search Error:", error);
        return NextResponse.json({ error: "Arama sırasında bir hata oluştu" }, { status: 500 });
    }
}
