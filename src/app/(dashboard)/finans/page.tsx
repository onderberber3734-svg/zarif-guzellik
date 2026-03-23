import { getFinanceSummary, getOutstandingPayments, getExpenses, getTopServices } from "@/app/actions/finance";
import FinansClient from "./FinansClient";

export const metadata = {
  title: 'Kârlılık ve Finans - Zarif Güzellik Yönetim Modülü',
  description: 'İşletme geliri, giderler ve tahsilat takibi.',
}

export default async function FinansPage() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    // Önce varsayılan olarak "Bu Ay" verilerini çekelim
    const [summaryRes, outstandingRes, expensesRes, topServicesRes] = await Promise.all([
        getFinanceSummary(firstDay, lastDay),
        getOutstandingPayments(),
        getExpenses(firstDay, lastDay),
        getTopServices(firstDay, lastDay)
    ]);

    const summary = summaryRes.success ? summaryRes.data : null;
    const outstanding = (outstandingRes.success && outstandingRes.data) ? outstandingRes.data : [];
    const expenses = (expensesRes.success && expensesRes.data) ? expensesRes.data : [];
    const topServices = (topServicesRes.success && topServicesRes.data) ? topServicesRes.data : [];

    return (
        <FinansClient 
            initialSummary={summary} 
            initialOutstanding={outstanding} 
            initialExpenses={expenses} 
            initialTopServices={topServices} 
        />
    );
}
