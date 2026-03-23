export class ProviderError extends Error {
    constructor(message: string, public reason: string) {
        super(message);
        this.name = "ProviderError";
    }
}

export async function callOpenRouter(prompt: string): Promise<{ text: string; latency_ms: number }> {
    const startTime = Date.now();
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new ProviderError("OPENROUTER_API_KEY bulunamadı.", "provider_error");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s maximum timeout

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
                "X-OpenRouter-Title": process.env.OPENROUTER_APP_NAME || "Zarif Güzellik"
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5,
                max_tokens: 3500,
                response_format: { type: "json_object" }
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);
        const latency_ms = Date.now() - startTime;

        if (!response.ok) {
            if (response.status === 429) throw new ProviderError("Rate limit aşıldı", "rate_limit");
            throw new ProviderError(`HTTP Error: ${response.status}`, "provider_error");
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;

        if (!text) throw new ProviderError("Geçersiz yanıt formatı", "provider_error");

        return { text, latency_ms };
    } catch (error: any) {
        clearTimeout(timeout);
        const latency_ms = Date.now() - startTime;

        if (error.name === "AbortError" || error.code === "ECONNRESET") {
            throw new ProviderError("İstek zaman aşımına uğradı", "timeout");
        }
        if (error instanceof ProviderError) throw error;
        throw new ProviderError(error.message || "Bilinmeyen hata", "provider_error");
    }
}
