import "../tools/index.js";
import toolRegistry from "../registry/toolRegistry.js";
import intentParserService from "./intentParser.service.js";
import toolPlannerService from "./toolPlanner.service.js";

function formatDateTimeVi(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDateVi(value) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString("vi-VN");
}

function formatCurrencyVi(value) {
    const number = Number(value || 0);
    return `${number.toLocaleString("vi-VN")} ₫`;
}

function normalizeText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function buildContextFromToolResult(toolName, result, query, parsed) {
    if (!result) return "";

    if (toolName === "customer.search") {
        const customers = Array.isArray(result.customers) ? result.customers : [];
        const lines = [
            `# TOOL: customer.search`,
            `Query: ${query || "(empty)"}`,
            `Count: ${customers.length}`,
            `Schema note: bảng customers hiện không có cột ngày hết hạn bảo hành riêng; chỉ có warranty_code và note.`,
        ];

        if (customers.length === 0) {
            lines.push(`Result: không tìm thấy khách hàng phù hợp.`);
            return lines.join("\n");
        }

        lines.push(`Result:`);

        customers.forEach((customer, index) => {
            lines.push(
                `${index + 1}. Họ tên: ${customer.full_name || "—"} | SĐT: ${customer.phone || "—"} | Năm sinh: ${customer.birth_year || "—"} | Mã bảo hành: ${customer.warranty_code || "—"} | Trạng thái: ${customer.status || "—"} | Ghi chú: ${customer.note || "—"} | Ngày tư vấn: ${formatDateVi(customer.appointment_date)}`
            );
        });

        return lines.join("\n");
    }

    if (toolName === "appointment.search") {
        const appointments = Array.isArray(result.appointments) ? result.appointments : [];
        const lines = [
            `# TOOL: appointment.search`,
            `Query: ${query || "(empty)"}`,
            `Count: ${appointments.length}`,
            `Date window: ${result.date_window || parsed?.entities?.dateWindow || "unknown"}`,
        ];

        if (result.match_status === "customer_not_found") {
            lines.push(`Result: không tìm thấy khách hàng khớp để tra lịch hẹn.`);
            return lines.join("\n");
        }

        if (appointments.length === 0) {
            lines.push(`Result: không tìm thấy lịch hẹn phù hợp.`);
            return lines.join("\n");
        }

        lines.push(`Result:`);

        appointments.forEach((item, index) => {
            lines.push(
                `${index + 1}. Khách: ${item.customer_name || "—"} | SĐT: ${item.customer_phone || "—"} | Thời gian: ${formatDateTimeVi(item.appointment_time)} | Trạng thái: ${item.status || "—"} | Lý do: ${item.reason || "—"}`
            );
        });

        return lines.join("\n");
    }

    if (toolName === "treatment.search") {
        const treatments = Array.isArray(result.treatments) ? result.treatments : [];
        const lines = [
            `# TOOL: treatment.search`,
            `Query: ${query || "(empty)"}`,
            `Count: ${treatments.length}`,
            `Date window: ${result.date_window || parsed?.entities?.dateWindow || "unknown"}`,
        ];

        if (result.match_status === "customer_not_found") {
            lines.push(`Result: không tìm thấy khách hàng khớp để tra điều trị.`);
            return lines.join("\n");
        }

        if (treatments.length === 0) {
            lines.push(`Result: không tìm thấy phiếu điều trị phù hợp.`);
            return lines.join("\n");
        }

        lines.push(`Result:`);

        treatments.forEach((item, index) => {
            lines.push(
                `${index + 1}. Khách: ${item.customer_name || "—"} | SĐT: ${item.customer_phone || "—"} | Dịch vụ: ${item.service_name || "—"} | Ngày: ${formatDateTimeVi(item.treatment_date)} | Bác sĩ: ${item.doctor_name || "—"} | Thành tiền: ${formatCurrencyVi(item.total_amount)} | Mô tả: ${item.description || "—"}`
            );
        });

        return lines.join("\n");
    }

    if (toolName === "inventory.search") {
        const items = Array.isArray(result.items) ? result.items : [];
        const lines = [
            `# TOOL: inventory.search`,
            `Query: ${query || "(empty)"}`,
            `Count: ${items.length}`,
        ];

        if (items.length === 0) {
            lines.push(`Result: không tìm thấy vật tư phù hợp.`);
            return lines.join("\n");
        }

        lines.push(`Result:`);

        items.forEach((item, index) => {
            lines.push(
                `${index + 1}. Tên: ${item.name || "—"} | Mã: ${item.code || "—"} | Danh mục: ${item.category_name || "—"} | Tồn: ${item.qty_on_hand ?? "—"} | Min: ${item.stock_min ?? "—"} | Đơn vị: ${item.unit || "—"} | Giá: ${formatCurrencyVi(item.price)}`
            );
        });

        return lines.join("\n");
    }

    if (toolName === "invoice.search") {
        const invoices = Array.isArray(result.invoices) ? result.invoices : [];
        const lines = [
            `# TOOL: invoice.search`,
            `Query: ${query || "(empty)"}`,
            `Count: ${invoices.length}`,
        ];

        if (result.match_status === "customer_not_found") {
            lines.push(`Result: không tìm thấy khách hàng khớp để tra hóa đơn.`);
            return lines.join("\n");
        }

        if (invoices.length === 0) {
            lines.push(`Result: không tìm thấy hóa đơn phù hợp.`);
            return lines.join("\n");
        }

        lines.push(`Result:`);

        invoices.forEach((item, index) => {
            lines.push(
                `${index + 1}. Số HĐ: ${item.invoice_no || "—"} | Khách: ${item.patient_name || item.buyer_name || "—"} | SĐT: ${item.patient_phone || item.buyer_phone || "—"} | Ngày: ${formatDateVi(item.invoice_date)} | Tổng: ${formatCurrencyVi(item.total_amount)} | Trạng thái: ${item.status || "—"}`
            );
        });

        return lines.join("\n");
    }

    return "";
}

function buildToolCallsFromParsed(parsed = {}) {
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

class ToolExecutionService {
    async executeForMessage(message, { memoryContext = "" } = {}) {
        const parsed = await intentParserService.parse(message, { context: memoryContext });

        const trace = [
            {
                step: "parse",
                intent: parsed.intent,
                confidence: parsed.confidence,
                entities: {
                    customer: parsed.entities.customer || "",
                    phone: parsed.entities.phone || "",
                    item: parsed.entities.item || "",
                    invoice: parsed.entities.invoice || "",
                    dateWindow: parsed.entities.dateWindow || null,
                    keywords: parsed.entities.keywords || [],
                },
            },
        ];

        const plan = await toolPlannerService.plan({
            message,
            parsed,
            memoryContext,
        });

        const plannedCalls = Array.isArray(plan.toolCalls) && plan.toolCalls.length > 0
            ? plan.toolCalls
            : buildToolCallsFromParsed(parsed);

        trace.push({
            step: "plan",
            reason: plan.reason || "",
            confidence: plan.confidence ?? 0,
            toolCalls: plannedCalls.map((call) => ({
                tool: call.tool,
                input: call.input,
            })),
        });

        if (plannedCalls.length === 0) {
            trace.push({
                step: "dispatch",
                tool: null,
                reason: "No suitable tool found for parsed intent",
            });

            return {
                context: "",
                trace,
                parsed,
                plan,
            };
        }

        const contexts = [];
        const results = [];

        for (const call of plannedCalls.slice(0, 3)) {
            const toolName = String(call?.tool || "").trim();
            const toolInput = call?.input && typeof call.input === "object" ? call.input : {};

            if (!toolName || !toolRegistry.has(toolName)) {
                trace.push({
                    step: "dispatch",
                    tool: toolName || null,
                    success: false,
                    reason: "Tool not found",
                });
                continue;
            }

            const result = await toolRegistry.execute(toolName, toolInput, {
                sourceMessage: message,
                parsed,
                memoryContext,
                plan,
            });

            results.push({
                tool: toolName,
                result,
            });

            trace.push({
                step: "dispatch",
                tool: toolName,
                success: Boolean(result?.success),
                count: Number(result?.count || 0),
            });

            const query =
                toolInput.query ||
                toolInput.customerQuery ||
                toolInput.itemQuery ||
                toolInput.invoice ||
                "";

            const context = buildContextFromToolResult(toolName, result, query, parsed);

            if (context.trim()) {
                contexts.push(context.trim());
            }
        }

        return {
            context: contexts.join("\n\n").trim(),
            trace,
            parsed,
            plan,
            results,
        };
    }
}

const toolExecutionService = new ToolExecutionService();

export default toolExecutionService;