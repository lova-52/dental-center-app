import systemPrompt from "./system.prompt.js";

export function buildSystemPrompt(toolDocs = "") {
    return `
${systemPrompt}

# AVAILABLE TOOLS

${toolDocs && toolDocs.trim() ? toolDocs : "Chưa có tool nào được đăng ký."}

# TOOL USE RULES

- Nếu câu hỏi liên quan dữ liệu nội bộ, ưu tiên dùng tool phù hợp.
- Không tự bịa dữ liệu.
- Không đoán khi thiếu dữ liệu.
- Nếu không có tool phù hợp, hãy nói rõ là chưa có khả năng thực hiện.
`.trim();
}