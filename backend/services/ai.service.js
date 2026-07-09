import { chat } from "../providers/ollama.provider.js";
import { buildSystemPrompt } from "../prompts/buildSystemPrompt.js";
import toolRegistry, { registerDefaultTools } from "../tools/index.js";
import toolExecutionService from "./toolExecution.service.js";
import conversationMemory from "./conversationMemory.service.js";
import entityMemoryService from "./entityMemory.service.js";

registerDefaultTools();

function normalizeHistory(history = []) {
    if (!Array.isArray(history)) {
        return [];
    }

    return history
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
            role: item.role,
            content: String(item.content || ""),
        }))
        .filter(
            (item) =>
                ["system", "user", "assistant"].includes(item.role) &&
                item.content.trim() !== ""
        );
}

function normalizeSessionId(sessionId) {
    const value = String(sessionId || "").trim();
    return value || "default";
}

function dedupeHistory(messages = []) {
    const seen = new Set();
    const deduped = [];

    for (const msg of messages) {
        if (!msg || typeof msg !== "object") continue;

        const role = String(msg.role || "").trim();
        const content = String(msg.content || "").trim();

        if (!role || !content) continue;

        const key = `${role}::${content}`;
        if (seen.has(key)) continue;

        seen.add(key);
        deduped.push({ role, content });
    }

    return deduped;
}

class AIService {
    constructor() {
        this.maxHistory = 20;
    }

    getAvailableTools() {
        return toolRegistry.list();
    }

    buildMessages({
        history = [],
        userMessage,
        context = "",
    }) {
        const messages = [];

        const toolDocs = toolRegistry.getPromptDocs();

        messages.push({
            role: "system",
            content: buildSystemPrompt(toolDocs),
        });

        if (context && context.trim()) {
            messages.push({
                role: "system",
                content: `
# BACKEND CONTEXT

${context}
                `.trim(),
            });
        }

        const safeHistory = normalizeHistory(history);

        if (safeHistory.length > 0) {
            messages.push(...safeHistory.slice(-this.maxHistory));
        }

        messages.push({
            role: "user",
            content: String(userMessage || ""),
        });

        return messages;
    }

    async ask({
        userMessage,
        context = "",
        history = [],
        sessionId = "default",
    }) {
        const safeSessionId = normalizeSessionId(sessionId);
        const session = conversationMemory.getSession(safeSessionId);

        const memoryHistory = normalizeHistory(session?.messages || []);
        const incomingHistory = normalizeHistory(history);
        const combinedHistory = dedupeHistory([
            ...memoryHistory,
            ...incomingHistory,
        ]);

        conversationMemory.addUserMessage(safeSessionId, String(userMessage || ""));

        const memoryContextBefore = conversationMemory.buildConversationContext(safeSessionId);

        const toolExecution = await toolExecutionService.executeForMessage(
            userMessage,
            {
                memoryContext: memoryContextBefore,
            }
        );

        entityMemoryService.update(session, toolExecution);

        const mergedContext = [
            toolExecution.context,
            context,
        ]
            .filter(Boolean)
            .map((item) => String(item).trim())
            .filter(Boolean)
            .join("\n\n")
            .trim();

        const conversationContextAfter = conversationMemory.buildConversationContext(
            safeSessionId
        );

        const finalContext = [
            conversationContextAfter,
            mergedContext,
        ]
            .filter(Boolean)
            .map((item) => String(item).trim())
            .filter(Boolean)
            .join("\n\n")
            .trim();

        const messages = this.buildMessages({
            history: combinedHistory,
            context: finalContext,
            userMessage,
        });

        const answer = await chat(messages);

        conversationMemory.addAssistantMessage(safeSessionId, answer);

        return {
            success: true,
            sessionId: safeSessionId,
            answer,
            toolExecution,
            memory: {
                sessionId: safeSessionId,
                historyLength: conversationMemory.getHistory(safeSessionId).length,
                entities: conversationMemory.getEntities(safeSessionId),
            },
            usage: {
                historyLength: combinedHistory.length,
                contextLength: finalContext.length,
                toolCount: this.getAvailableTools().length,
            },
        };
    }
}

const aiService = new AIService();

export default aiService;