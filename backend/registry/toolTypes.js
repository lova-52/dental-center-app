export const TOOL_CATEGORIES = Object.freeze({
    CUSTOMER: "customer",
    APPOINTMENT: "appointment",
    TREATMENT: "treatment",
    INVENTORY: "inventory",
    INVOICE: "invoice",
    GENERAL: "general"
});

export function createToolDefinition(definition) {
    if (!definition || typeof definition !== "object") {
        throw new Error("Tool definition must be an object");
    }

    const {
        name,
        description,
        category = TOOL_CATEGORIES.GENERAL,
        inputSchema = {},
        outputSchema = {},
        permissions = [],
        execute
    } = definition;

    if (!name || typeof name !== "string") {
        throw new Error("Tool name is required");
    }

    if (!description || typeof description !== "string") {
        throw new Error(`Tool description is required for ${name}`);
    }

    if (typeof execute !== "function") {
        throw new Error(`Tool execute() is required for ${name}`);
    }

    return {
        name,
        description,
        category,
        inputSchema,
        outputSchema,
        permissions,
        execute
    };
}