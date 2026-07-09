import { chat } from "../providers/ollama.provider.js";

const SYSTEM_PROMPT = `
You are an intent parser for an internal dental clinic AI.

Return ONLY valid JSON.
No markdown.
No code fences.
No explanation.

You must infer the user's intent from the current message and the provided conversation context.

Allowed intents:
- general.chat
- customer.search
- appointment.search
- treatment.search
- inventory.search
- invoice.search

Output schema:
{
  "intent": "string",
  "confidence": 0.0,
  "customer": "string",
  "phone": "string",
  "item": "string",
  "invoice": "string",
  "dateWindow": "today|tomorrow|this_week|next_week|this_month|all_time|null",
  "keywords": ["string"],
  "rewrittenMessage": "string"
}

Rules:
- If the user says a short follow-up like "Bao giờ?", use conversation context to resolve the subject.
- If the user says "SĐT?", use conversation context to resolve the customer.
- If the user says "Làm implant à?", use conversation context to resolve the customer and infer the likely dental-related intent.
- If no clear intent exists, use general.chat.
- If there is no specific date window, set dateWindow to null.
- Keep customer names as normal human names, not extra words.
- Keep phone numbers as digits or with + if present.
- Keep item names concise.
- rewrittenMessage should be a clean, resolved version of the user message using context when needed.
- confidence should be between 0 and 1.

Examples:

User: "Khách Philip Bradford có lịch hẹn không?"
Output:
{
  "intent":"appointment.search",
  "confidence":0.98,
  "customer":"Philip Bradford",
  "phone":"",
  "item":"",
  "invoice":"",
  "dateWindow":"all_time",
  "keywords":[],
  "rewrittenMessage":"Khách Philip Bradford có lịch hẹn không?"
}

User: "Bao giờ?"
Context contains current customer Philip Bradford and current appointment.
Output:
{
  "intent":"appointment.search",
  "confidence":0.95,
  "customer":"Philip Bradford",
  "phone":"",
  "item":"",
  "invoice":"",
  "dateWindow":"all_time",
  "keywords":[],
  "rewrittenMessage":"Lịch hẹn của Philip Bradford vào thời gian nào?"
}

User: "SĐT?"
Context contains current customer Philip Bradford.
Output:
{
  "intent":"customer.search",
  "confidence":0.95,
  "customer":"Philip Bradford",
  "phone":"",
  "item":"",
  "invoice":"",
  "dateWindow":null,
  "keywords":[],
  "rewrittenMessage":"Số điện thoại của Philip Bradford"
}
`.trim();

function extractJsonObject(text) {
    const raw = String(text || "").trim();

    if (!raw) return null;

    const fenced = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const firstBrace = fenced.indexOf("{");
    const lastBrace = fenced.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
    }

    const candidate = fenced.slice(firstBrace, lastBrace + 1);

    try {
        return JSON.parse(candidate);
    } catch {
        return null;
    }
}

function normalizeDateWindow(value) {
    const allowed = new Set([
        "today",
        "tomorrow",
        "this_week",
        "next_week",
        "this_month",
        "all_time",
        null,
        undefined,
        "",
    ]);

    if (allowed.has(value)) return value || null;
    return null;
}

class IntentParserService {
    async parse(message, { context = "" } = {}) {
        const messages = [
            {
                role: "system",
                content: SYSTEM_PROMPT,
            },
        ];

        if (String(context || "").trim()) {
            messages.push({
                role: "system",
                content: `
Conversation context:
${context}
                `.trim(),
            });
        }

        messages.push({
            role: "user",
            content: String(message || ""),
        });

        try {
            const raw = await chat(messages);
            const parsed = extractJsonObject(raw);

            if (!parsed) {
                throw new Error(`Could not parse JSON from parser output: ${raw}`);
            }

            const intent = [
                "general.chat",
                "customer.search",
                "appointment.search",
                "treatment.search",
                "inventory.search",
                "invoice.search",
            ].includes(parsed.intent)
                ? parsed.intent
                : "general.chat";

            const confidence = Number.isFinite(Number(parsed.confidence))
                ? Math.max(0, Math.min(1, Number(parsed.confidence)))
                : 0;

            return {
                originalMessage: String(message || ""),
                normalizedMessage: String(message || "").trim(),
                intent,
                confidence,
                entities: {
                    customer: String(parsed.customer || "").trim(),
                    phone: String(parsed.phone || "").trim(),
                    item: String(parsed.item || "").trim(),
                    invoice: String(parsed.invoice || "").trim(),
                    dateWindow: normalizeDateWindow(parsed.dateWindow),
                    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map((k) => String(k || "").trim()).filter(Boolean) : [],
                },
                rewrittenMessage: String(parsed.rewrittenMessage || message || "").trim(),
                raw,
            };
        } catch (err) {
            console.error("[IntentParserService] parse error:", err);

            return {
                originalMessage: String(message || ""),
                normalizedMessage: String(message || "").trim(),
                intent: "general.chat",
                confidence: 0,
                entities: {
                    customer: "",
                    phone: "",
                    item: "",
                    invoice: "",
                    dateWindow: null,
                    keywords: [],
                },
                rewrittenMessage: String(message || "").trim(),
                raw: null,
            };
        }
    }
}

const intentParserService = new IntentParserService();

export default intentParserService;