import { chat } from "../providers/ollama.provider.js";
import toolRegistry from "../registry/toolRegistry.js";
import buildPlannerPrompt from "../prompts/planner.prompt.js";

function extractJsonObject(text) {
    const raw = String(text || "").trim();
    if (!raw) return null;

    const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        return null;
    }

    const candidate = cleaned.slice(firstBrace, lastBrace + 1);

    try {
        return JSON.parse(candidate);
    } catch {
        return null;
    }
}

function normalizeToolCall(call) {
    if (!call || typeof call !== "object") return null;

    const tool = String(call.tool || "").trim();
    const input = call.input && typeof call.input === "object" ? call.input : {};

    if (!tool) return null;

    return { tool, input };
}

function buildFallbackPlan(parsed = {}) {
    const intent = String(parsed.intent || "general.chat").trim();
    const entities = parsed.entities || {};

    const customer = String(entities.customer || "").trim();
    const phone = String(entities.phone || "").trim();
    const item = String(entities.item || "").trim();
    const invoice = String(entities.invoice || "").trim();
    const dateWindow = entities.dateWindow || null;

    if (intent === "customer.search") {
        const query = customer || phone || "";
        return query
            ? [{ tool: "customer.search", input: { query, limit: 5 } }]
            : [];
    }

    if (intent === "appointment.search") {
        return [
            {
                tool: "appointment.search",
                input: {
                    customerQuery: customer || phone || "",
                    query: customer || phone || "",
                    dateWindow: dateWindow || null,
                    limit: 10,
                },
            },
        ];
    }

    if (intent === "treatment.search") {
        return [
            {
                tool: "treatment.search",
                input: {
                    customerQuery: customer || phone || "",
                    query: customer || phone || "",
                    dateWindow: dateWindow || null,
                    limit: 10,
                },
            },
        ];
    }

    if (intent === "inventory.search") {
        const query = item || "";
        return query
            ? [
                  {
                      tool: "inventory.search",
                      input: {
                          itemQuery: query,
                          query,
                          limit: 10,
                          lowStock: false,
                      },
                  },
              ]
            : [];
    }

    if (intent === "invoice.search") {
        const query = invoice || customer || phone || "";
        return query
            ? [
                  {
                      tool: "invoice.search",
                      input: {
                          customerQuery: customer || phone || "",
                          query,
                          limit: 10,
                      },
                  },
              ]
            : [];
    }

    return [];
}

class ToolPlannerService {
    async plan({
        message,
        parsed = {},
        memoryContext = "",
    }) {
        const toolDocs = toolRegistry.getPromptDocs();

        const payload = {
            message: String(message || ""),
            parsed,
            memoryContext: String(memoryContext || ""),
        };

        const messages = [
            {
                role: "system",
                content: buildPlannerPrompt(toolDocs),
            },
            {
                role: "user",
                content: JSON.stringify(payload, null, 2),
            },
        ];

        try {
            const raw = await chat(messages);
            const parsedPlan = extractJsonObject(raw);

            if (!parsedPlan) {
                throw new Error("Planner did not return valid JSON");
            }

            const rawCalls = Array.isArray(parsedPlan.toolCalls)
                ? parsedPlan.toolCalls
                : [];

            const toolCalls = rawCalls
                .map(normalizeToolCall)
                .filter(Boolean)
                .filter((call) => toolRegistry.has(call.tool))
                .slice(0, 3);

            return {
                reason: String(parsedPlan.reason || "").trim(),
                confidence: Number.isFinite(Number(parsedPlan.confidence))
                    ? Math.max(0, Math.min(1, Number(parsedPlan.confidence)))
                    : 0,
                toolCalls: toolCalls.length > 0 ? toolCalls : buildFallbackPlan(parsed),
                raw,
            };
        } catch (error) {
            console.error("[ToolPlannerService] plan error:", error);

            return {
                reason: "fallback",
                confidence: 0,
                toolCalls: buildFallbackPlan(parsed),
                raw: null,
            };
        }
    }
}

const toolPlannerService = new ToolPlannerService();

export default toolPlannerService;
export { buildFallbackPlan };