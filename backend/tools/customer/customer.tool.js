import { supabase } from "../../config/supabase.js";

function sanitizeSearchTerm(value) {
    return String(value || "")
        .replace(/[%,]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeCustomer(row) {
    return {
        id: row.id,
        full_name: row.full_name || "",
        birth_year: row.birth_year || null,
        phone: row.phone || "",
        warranty_code: row.warranty_code || "",
        note: row.note || "",
        appointment_date: row.appointment_date || null,
        status: row.status || "lead",
        created_at: row.created_at || null,
        link_pfp: row.link_pfp || null
    };
}

async function searchCustomers(input = {}) {
    const rawQuery = input.query || "";
    const safeQuery = sanitizeSearchTerm(rawQuery);
    const safeLimit = Math.max(
        1,
        Math.min(Number(input.limit || 10) || 10, 50)
    );

    const selectColumns = `
        id,
        full_name,
        birth_year,
        phone,
        warranty_code,
        note,
        appointment_date,
        status,
        created_at,
        link_pfp
    `;

    try {
        let queryBuilder = supabase
            .from("customers")
            .select(selectColumns.trim())
            .order("created_at", { ascending: false })
            .limit(safeLimit);

        if (safeQuery) {
            const orFilter = [
                `full_name.ilike.%${safeQuery}%`,
                `phone.ilike.%${safeQuery}%`,
                `warranty_code.ilike.%${safeQuery}%`,
                `note.ilike.%${safeQuery}%`
            ].join(",");

            queryBuilder = queryBuilder.or(orFilter);
        }

        const { data, error } = await queryBuilder;

        if (error) {
            throw error;
        }

        const customers = (data || []).map(normalizeCustomer);

        return {
            success: true,
            tool: "customer.search",
            query: rawQuery,
            count: customers.length,
            customers
        };
    } catch (error) {
        console.error("[customer.search] error:", error);

        return {
            success: false,
            tool: "customer.search",
            query: rawQuery,
            count: 0,
            customers: [],
            error: error.message || "Unknown error"
        };
    }
}

const customerSearchTool = {
    name: "customer.search",
    description: "Tìm kiếm khách hàng theo tên, số điện thoại, mã bảo hành hoặc ghi chú.",
    category: "customer",
    permissions: ["admin", "receptionist", "telesale"],
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Từ khóa tìm kiếm"
            },
            limit: {
                type: "number",
                description: "Số lượng kết quả tối đa"
            }
        },
        required: ["query"]
    },
    outputSchema: {
        type: "object",
        properties: {
            success: { type: "boolean" },
            count: { type: "number" },
            customers: { type: "array" }
        }
    },
    execute: searchCustomers
};

export default customerSearchTool;
export { searchCustomers };