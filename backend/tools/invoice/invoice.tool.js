import { supabase } from "../../config/supabase.js";
import { searchCustomers } from "../customer/customer.tool.js";

function normalizeText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeInvoice(row, patientMap = new Map()) {
    const patient = row.patient_id ? patientMap.get(row.patient_id) : null;

    return {
        id: row.id,
        invoice_no: row.invoice_no || "",
        patient_id: row.patient_id || null,
        patient_name: patient?.full_name || "",
        patient_phone: patient?.phone || "",
        invoice_date: row.invoice_date || null,
        buyer_name: row.buyer_name || "",
        buyer_phone: row.buyer_phone || "",
        payment_method: row.payment_method || "",
        subtotal: Number(row.subtotal || 0),
        vat_amount: Number(row.vat_amount || 0),
        total_amount: Number(row.total_amount || 0),
        status: row.status || "draft",
        note: row.note || "",
        created_at: row.created_at || null,
    };
}

async function searchInvoices(input = {}) {
    const rawQuery = normalizeText(input.customerQuery || input.query || "");
    const safeLimit = Math.max(1, Math.min(Number(input.limit || 10) || 10, 50));

    try {
        let patientIds = [];

        if (rawQuery) {
            const patientSearch = await searchCustomers({
                query: rawQuery,
                limit: 20,
            });

            patientIds = (patientSearch?.customers || [])
                .map((customer) => customer.id)
                .filter(Boolean);

            if (patientIds.length === 0) {
                return {
                    success: true,
                    tool: "invoice.search",
                    query: rawQuery,
                    count: 0,
                    invoices: [],
                    match_status: "customer_not_found",
                };
            }
        }

        let queryBuilder = supabase
            .from("invoices")
            .select(`
                id,
                invoice_no,
                patient_id,
                invoice_date,
                buyer_name,
                buyer_phone,
                payment_method,
                subtotal,
                vat_amount,
                total_amount,
                status,
                note,
                created_at
            `)
            .order("created_at", { ascending: false })
            .limit(safeLimit);

        if (rawQuery) {
            const safeQuery = rawQuery.replace(/[%,]/g, " ");
            queryBuilder = queryBuilder.or(
                `invoice_no.ilike.%${safeQuery}%,buyer_name.ilike.%${safeQuery}%,buyer_phone.ilike.%${safeQuery}%,note.ilike.%${safeQuery}%`
            );
        }

        if (patientIds.length > 0) {
            queryBuilder = queryBuilder.in("patient_id", patientIds);
        }

        const { data, error } = await queryBuilder;

        if (error) {
            throw error;
        }

        const invoiceRows = data || [];
        const patientIdList = [
            ...new Set(invoiceRows.map((row) => row.patient_id).filter(Boolean)),
        ];

        let patientMap = new Map();

        if (patientIdList.length > 0) {
            const { data: patients, error: patientError } = await supabase
                .from("customers")
                .select("id, full_name, phone, note")
                .in("id", patientIdList);

            if (patientError) {
                throw patientError;
            }

            patientMap = new Map(
                (patients || []).map((patient) => [
                    patient.id,
                    {
                        id: patient.id,
                        full_name: patient.full_name || "",
                        phone: patient.phone || "",
                        note: patient.note || "",
                    },
                ])
            );
        }

        const invoices = invoiceRows.map((row) =>
            normalizeInvoice(row, patientMap)
        );

        return {
            success: true,
            tool: "invoice.search",
            query: rawQuery,
            count: invoices.length,
            invoices,
        };
    } catch (error) {
        console.error("[invoice.search] error:", error);

        return {
            success: false,
            tool: "invoice.search",
            query: rawQuery,
            count: 0,
            invoices: [],
            error: error.message || "Unknown error",
        };
    }
}

const invoiceSearchTool = {
    name: "invoice.search",
    description: "Tìm kiếm hóa đơn theo số hóa đơn, tên khách hàng hoặc số điện thoại.",
    category: "invoice",
    permissions: ["admin", "receptionist", "developers"],
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Từ khóa tìm kiếm",
            },
            customerQuery: {
                type: "string",
                description: "Tên khách hàng hoặc số điện thoại",
            },
            limit: {
                type: "number",
                description: "Số lượng kết quả tối đa",
            },
        },
        required: ["query"],
    },
    outputSchema: {
        type: "object",
        properties: {
            success: { type: "boolean" },
            count: { type: "number" },
            invoices: { type: "array" },
        },
    },
    execute: searchInvoices,
};

export default invoiceSearchTool;
export { searchInvoices };