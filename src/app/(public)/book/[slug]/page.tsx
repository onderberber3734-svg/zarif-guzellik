import { getPublicBusinessProfile } from "@/app/actions/public-booking";
import { notFound } from "next/navigation";
import BookingWizardClient from "./BookingWizardClient";
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    const { data: business } = await getPublicBusinessProfile(resolvedParams.slug);
    
    if (!business) {
        return {
            title: 'Bulunamadı',
            description: 'İşletme bulunamadı.',
        };
    }

    return {
        title: `${business.name} | Online Randevu Al`,
        description: `${business.name} işletmesinden hızlı ve kolayca online randevu alın.`,
    };
}

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    // 1. İşletme verisini çek
    const res = await getPublicBusinessProfile(resolvedParams.slug);
    
    // 2. İşletme yoksa 404 sayfasına yönlendir
    if (!res.success || !res.data) {
        notFound();
    }
    
    const business = res.data;

    return (
        <BookingWizardClient business={business} />
    );
}
