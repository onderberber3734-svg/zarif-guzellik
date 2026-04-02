/**
 * Merkezi Müşteri Segmentasyon Kuralları
 * Bu kurallar hem UI tarafında kartlarda, filtrelemede hem de 
 * ileride AI tabanlı analiz sistemlerinde ortak olarak kullanılacaktır.
 */

export const isVIPCustomer = (customer: any): boolean => {
    // VIP Müşteriler = VIP üyelikte olanlar
    return customer.is_vip === true || customer.segment === "VIP";
};

export const isNewCustomer = (customer: any): boolean => {
    // Yeni Müşteriler = ilk ziyaretini yakın zamanda yapmış ve henüz derin geçmiş oluşturmamış müşteriler
    const totalAppts = customer.stats?.totalAppointments || 0;
    const firstVisitDate = customer.stats?.firstVisitDate;
    if (!firstVisitDate || totalAppts > 1) return false;

    const firstVisitMs = new Date(firstVisitDate).getTime();
    if (Number.isNaN(firstVisitMs)) return false;

    const fortyFiveDaysMs = 45 * 24 * 60 * 60 * 1000;
    return (Date.now() - firstVisitMs) <= fortyFiveDaysMs;
};

export const isRiskGroup = (customer: any): boolean => {
    // Riskli Grup = geçmişte gelmiş ama son ziyaretinin üzerinden 90+ gün geçmiş müşteriler
    return Boolean(
        customer.stats &&
        customer.stats.totalAppointments > 0 &&
        customer.stats.daysSinceLastVisit !== null &&
        customer.stats.daysSinceLastVisit > 90
    );
};

export const isBirthdayApproaching = (customer: any): boolean => {
    // Doğum Günü = bu ay doğum günü yaklaşanlar
    if (!customer.birth_date) return false;
    const parts = customer.birth_date.split("-");
    if (parts.length >= 2) {
        const month = parseInt(parts[1], 10);
        const currentMonth = new Date().getMonth() + 1;
        return month === currentMonth;
    }
    return false;
};

export const isLoyalCustomer = (customer: any): boolean => {
    // Sadık Müşteri = En az 3 randevusu olanlar veya AI Özeti Sadık Müşteri/Düzenli Ziyaretçi olanlar
    if (customer.stats && customer.stats.totalAppointments >= 3) {
        return true;
    }
    if (customer.ai_summary === "Sadık Müşteri" || customer.ai_summary === "Düzenli Ziyaretçi") {
        return true;
    }
    return false;
};

export const SEGMENT_NAMES = {
    ALL: "Tümü",
    VIP: "VIP Müşteriler",
    LOYAL: "Sadık Müşteriler",
    NEW: "Yeni Müşteriler",
    RISK: "Riskli Grup",
    BIRTHDAY: "Doğum Günü"
};
