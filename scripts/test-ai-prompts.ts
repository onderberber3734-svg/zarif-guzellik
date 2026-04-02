import { runAI } from "../src/lib/ai/provider";
import { AiOutputSchema } from "../src/lib/ai/prompts/_base";
import { buildDailySummaryPrompt } from "../src/lib/ai/prompts/daily_summary";
import { buildFillEmptySlotsPrompt } from "../src/lib/ai/prompts/fill_empty_slots";
import Object from "zod"; // for catch
import 'dotenv/config';

function parseJSON(text: string) {
    let cleaned = text.trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    }
    return JSON.parse(cleaned);
}

async function runTest() {
    console.log("🚀 Testing Daily Summary Prompt...");
    const dailyData = {
        today_appointments: 12,
        today_revenue: 14000,
        today_collections: 0,
        outstanding_amount: 4500,
        overdue_sessions_count: 3,
        top_services: ["Genel Bakım"],
        empty_slot_count: 2
    };

    try {
        const prompt = buildDailySummaryPrompt(dailyData);
        let aiResult = await runAI(prompt);
        let parsed = parseJSON(aiResult.payload);
        let validated = AiOutputSchema.parse(parsed);

        console.log("✅ Daily Summary parsed successfully:");
        console.log(`Title: ${validated.title}`);
        console.log(`Action: ${validated.next_best_action?.label} (${validated.next_best_action?.route})`);
        if (validated.impact) {
            console.log(`Impact: ${validated.impact.label} (~₺${validated.impact.estimate_try})`);
        }
    } catch (e: any) {
        console.error("❌ Daily Summary Test Failed:", e.message);
    }

    console.log("\n🚀 Testing Fill Empty Slots Prompt...");
    const emptySlotData = {
        empty_slots: [{ date: "2023-10-10", time: "10:00" }, { date: "2023-10-10", time: "11:00" }],
        inactive_customers: ["L.K. (#1234)"],
        best_selling_service: "Cilt Bakımı"
    };

    try {
        const prompt2 = buildFillEmptySlotsPrompt(emptySlotData);
        let aiResult2 = await runAI(prompt2);
        let parsed2 = parseJSON(aiResult2.payload);
        let validated2 = AiOutputSchema.parse(parsed2);

        console.log("✅ Fill Empty Slots parsed successfully:");
        console.log(`Title: ${validated2.title}`);
        console.log(`Action: ${validated2.next_best_action?.label}`);
    } catch (e: any) {
        console.error("❌ Fill Empty Slots Test Failed:", e.message);
    }
}

runTest();
