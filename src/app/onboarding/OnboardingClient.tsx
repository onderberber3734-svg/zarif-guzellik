"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBusinessProfile } from "@/app/actions/businesses";
import { createSalon } from "@/app/actions/salons";
import { runBusinessSeed } from "@/app/actions/seed";
import Image from "next/image";
import Step1 from "./steps/Step1";
import Step2 from "./steps/Step2";
import Step3 from "./steps/Step3";
import StepWorkingHours from "./steps/StepWorkingHours";
import StepStaff from "./steps/StepStaff";
import Step4 from "./steps/Step4";
import Step5 from "./steps/Step5";
import Step6 from "./steps/Step6";

export default function OnboardingClient({ business, services, salons }: { business: any, services: any[], salons: any[] }) {
    const [step, setStep] = useState(business.onboarding_step || 1);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Step 2 Form
    const [bizDetails, setBizDetails] = useState({
        name: business.name || "",
        phone: business.phone || "",
        city: business.city || "",
        address: business.address || "",
    });

    // Step 4 Form (Salon)
    const [salonName, setSalonName] = useState("");
    const [salonType, setSalonType] = useState("room"); // 'room' | 'chair'
    const [salonColor, setSalonColor] = useState("#8b5cf6"); // Default purple
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [localSalons, setLocalSalons] = useState(salons);

    const handleNextStep = async (nextStep: number) => {
        startTransition(async () => {
            const updates: any = { onboarding_step: nextStep };

            if (step === 2) {
                updates.name = bizDetails.name;
                updates.phone = bizDetails.phone;
                updates.city = bizDetails.city;
                updates.address = bizDetails.address;
            }

            await updateBusinessProfile(business.id, updates);
            setStep(nextStep);
            router.refresh();
        });
    };

    const handleAddSalon = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const res = await createSalon({
                name: salonName,
                type: salonType,
                color_code: salonColor,
                is_active: true,
                service_ids: selectedServiceIds
            });

            if (res.success) {
                setLocalSalons(prev => [...prev, {
                    ...res.data,
                    name: salonName,
                    salon_services: selectedServiceIds.map((id: string) => ({ service_id: id }))
                }]);
                setSalonName("");
                setSelectedServiceIds([]);
                router.refresh();
            } else {
                alert("Hata: " + res.error);
            }
        });
    };

    const handleDemoData = async (targetStep: number = 8) => {
        startTransition(async () => {
            const res = await runBusinessSeed();
            if (res.success) {
                alert("Örnek veriler başarıyla yüklendi!");
                handleNextStep(targetStep);
            } else {
                alert("Hata: " + (res.error || "Bilinmeyen bir hata oluştu."));
            }
        });
    };

    const completeOnboarding = async () => {
        startTransition(async () => {
            await updateBusinessProfile(business.id, {
                is_onboarding_completed: true,
                onboarding_step: 7 // Final step marker
            });
            window.location.href = "/";
        });
    };

    const totalSteps = 8;

    return (
        <>
            {step === 1 && <Step1 onNext={handleNextStep} isPending={isPending} />}
            {step === 2 && <Step2 business={business} bizDetails={bizDetails} setBizDetails={setBizDetails} onNext={handleNextStep} onBack={() => setStep(1)} isPending={isPending} />}
            {step === 3 && <Step3 services={services} onNext={handleNextStep} onBack={() => setStep(2)} isPending={isPending} />}
            {step === 4 && <StepWorkingHours onNext={handleNextStep} onBack={() => setStep(3)} isPending={isPending} />}
            {step === 5 && <Step4 services={services} localSalons={localSalons} salonName={salonName} setSalonName={setSalonName} salonType={salonType} setSalonType={setSalonType} salonColor={salonColor} setSalonColor={setSalonColor} selectedServiceIds={selectedServiceIds} setSelectedServiceIds={setSelectedServiceIds} handleAddSalon={handleAddSalon} onNext={handleNextStep} onBack={() => setStep(4)} isPending={isPending} />}
            {step === 6 && <StepStaff services={services} onNext={handleNextStep} onBack={() => setStep(5)} isPending={isPending} />}
            {step === 7 && <Step5 handleDemoData={() => handleDemoData(8)} onNext={handleNextStep} onBack={() => setStep(6)} isPending={isPending} />}
            {step === 8 && <Step6 business={business} servicesCount={services.length} salonsCount={localSalons.length} completeOnboarding={completeOnboarding} />}
        </>
    );
}
