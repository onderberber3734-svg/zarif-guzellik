"use client";

import Link from "next/link";
import React from "react";

export interface CustomerLinkProps {
    id?: string | number;
    firstName?: string;
    lastName?: string;
    className?: string; // Ekstra stil ayarları için (örn: font-bold text-slate-900)
}

export default function CustomerLink({
    id,
    firstName = "",
    lastName = "",
    className = ""
}: CustomerLinkProps) {
    const fullName = `${firstName} ${lastName}`.trim() || 'Bilinmiyor';

    // ID yoksa veya müşteri silinmişse güvenli fallback
    if (!id) {
        return <span className={className} title="Müşteri ID bulunamadı">{fullName}</span>;
    }

    // Kartlara tıklama olayının yayılmasını engellemek için
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <Link
            href={`/musteriler/${id}`}
            onClick={handleClick}
            title={`${fullName} Profiline Git`}
            className={`cursor-pointer hover:text-[var(--color-primary)] hover:underline decoration-2 underline-offset-2 decoration-[var(--color-primary)]/40 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:ring-offset-1 rounded-sm ${className}`}
        >
            {fullName}
        </Link>
    );
}
