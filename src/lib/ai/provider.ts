/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { callOpenRouter, ProviderError } from "./providers/openrouter";

// Dışa aktar, AI fallback yakalamalarında kullanılabilsin
export { ProviderError };

export interface AIMetadata {
    provider_used: "openrouter";
    reason: "ok" | "rate_limit" | "timeout" | "slow" | "provider_error";
    latency_ms: number;
}

export interface AIResult {
    payload: string;
    metadata: AIMetadata;
}

export async function runAI(prompt: string): Promise<AIResult> {
    try {
        const { text, latency_ms } = await callOpenRouter(prompt);
        
        return {
            payload: text,
            metadata: {
                provider_used: "openrouter",
                reason: "ok",
                latency_ms
            }
        };
    } catch (error: any) {
        console.warn(`[AI Provider] OpenRouter isteği başarısız:`, error.message);
        throw error;
    }
}
