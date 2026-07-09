import { createToolDefinition } from "./toolTypes.js";

class ToolRegistry {
    constructor() {
        this.tools = new Map();
    }

    register(toolDefinition) {
        const tool = createToolDefinition(toolDefinition);

        if (this.tools.has(tool.name)) {
            throw new Error(`Tool already registered: ${tool.name}`);
        }

        this.tools.set(tool.name, tool);
        return tool;
    }

    registerMany(toolDefinitions = []) {
        return toolDefinitions.map((tool) => this.register(tool));
    }

    has(name) {
        return this.tools.has(name);
    }

    get(name) {
        return this.tools.get(name) || null;
    }

    list() {
        return Array.from(this.tools.values()).map((tool) => ({
            name: tool.name,
            description: tool.description,
            category: tool.category,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema,
            permissions: tool.permissions
        }));
    }

    getPromptDocs() {
        const tools = this.list();

        if (tools.length === 0) {
            return "Chưa có tool nào được đăng ký.";
        }

        return tools
            .map((tool, index) => {
                return [
                    `${index + 1}. ${tool.name}`,
                    `   Mô tả: ${tool.description}`,
                    `   Category: ${tool.category}`,
                    `   Input: ${JSON.stringify(tool.inputSchema, null, 2)}`,
                    `   Output: ${JSON.stringify(tool.outputSchema, null, 2)}`
                ].join("\n");
            })
            .join("\n\n");
    }

    async execute(name, input = {}, context = {}) {
        const tool = this.get(name);

        if (!tool) {
            throw new Error(`Tool not found: ${name}`);
        }

        return await tool.execute(input, context);
    }
}

const toolRegistry = new ToolRegistry();

export default toolRegistry;
export { ToolRegistry };