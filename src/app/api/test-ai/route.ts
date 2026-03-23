import { NextResponse } from 'next/server';
import { refreshAiInsight } from '@/app/actions/ai';

export const dynamic = 'force-dynamic';

export async function GET() {
    const results = [];
    const types = ['daily_summary', 'fill_empty_slots', 'winback', 'campaign_copy'];
    const campaignParams = { name: 'Test', service_id: '123', offer_type: 'test', offer_value: 10 };

    for (const type of types) {
        const t0 = Date.now();
        const res = await refreshAiInsight(type as any, type === 'campaign_copy' ? campaignParams : undefined, true);
        const t1 = Date.now();
        
        results.push({
            type,
            success: res.success,
            latency_ms: (t1 - t0),
            fallback: !!res.fallback,
            error: res.error
        });
    }

    return NextResponse.json({ results });
}
