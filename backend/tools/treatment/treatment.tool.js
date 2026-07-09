import { supabase } from "../../config/supabase.js";
import { searchCustomers } from "../customer/customer.tool.js";

function normalizeText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function toDate(value) {
    if (!value) return null;

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function resolveDateWindow(dateWindow) {
    if (!dateWindow) {
        return { label: "all_time", start: null, end: null };
    }

    if (typeof dateWindow === "object") {
        return {
            label: dateWindow.label || "all_time",
            start: dateWindow.start || null,
            end: dateWindow.end || null,
        };
    }

    const label = String(dateWindow).trim().toLowerCase();
    const now = new Date();

    if (label === "today") {
        const start = startOfDay(now);
        const end = endOfDay(now);
        return {
            label: "today",
            start: start.toISOString(),
            end: end.toISOString(),
        };
    }

    if (label === "tomorrow") {
        const d = addDays(now, 1);
        return {
            label: "tomorrow",
            start: startOfDay(d).toISOString(),
            end: endOfDay(d).toISOString(),
        };
    }

    if (label === "this_week") {
        const start = startOfDay(now);
        const end = endOfDay(addDays(now, 6));
        return {
            label: "this_week",
            start: start.toISOString(),
            end: end.toISOString(),
        };
    }

    if (label === "next_week") {
        const start = startOfDay(addDays(now, 7));
        const end = endOfDay(addDays(now, 13));
        return {
            label: "next_week",
            start: start.toISOString(),
            end: end.toISOString(),
        };
    }

    if (label === "this_month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return {
            label: "this_month",
            start: start.toISOString(),
            end: end.toISOString(),
        };
    }

    if (label === "all_time") {
        return { label: "all_time", start: null, end: null };
    }

    return { label: "all_time", start: null, end: null };
}

function normalizeTreatment(row, customerMap = new Map(), serviceMap = new Map()) {
    const customer = row.customer_id ? customerMap.get(row.customer_id) : null;
    const service = row.service_id ? serviceMap.get(row.service_id) : null;

    return {
        id: row.id,
        treatment_date: row.treatment_date || null,
        service_id: row.service_id || null,
        service_name: service?.name || "",
        description: row.description || "",
        doctor_name: row.doctor_name || "",
        total_amount: Number(row.total_amount || 0),
        customer_id: row.customer_id || null,
        customer_name: customer?.full_name || "",
        customer_phone: customer?.phone || "",
        appointment_id: row.appointment_id || null,
        created_at: row.created_at || null,
    };
}

async function searchTreatments(input = {}) {
    const customerQuery = normalizeText(input.customerQuery || input.query || "");
    const safeLimit = Math.max(1, Math.min(Number(input.limit || 10) || 10, 50));
    const dateWindow = resolveDateWindow(input.dateWindow);
    const startDate = toDate(dateWindow.start);
    const endDate = toDate(dateWindow.end);

    try {
        let customerIds = [];

        if (customerQuery) {
            const customerSearch = await searchCustomers({
                query: customerQuery,
                limit: 20,
            });

            customerIds = (customerSearch?.customers || [])
                .map((customer) => customer.id)
                .filter(Boolean);

            if (customerIds.length === 0) {
                return {
                    success: true,
                    tool: "treatment.search",
                    query: customerQuery,
                    count: 0,
                    treatments: [],
                    date_window: dateWindow.label || "all_time",
                    match_status: "customer_not_found",
                };
            }
        }

        let queryBuilder = supabase
            .from("treatments")
            .select(`
                id,
                service_id,
                treatment_date,
                description,
                doctor_name,
                total_amount,
                customer_id,
                appointment_id,
                created_at
            `);

        if (customerIds.length > 0) {
            queryBuilder = queryBuilder.in("customer_id", customerIds);
        }

        if (startDate && endDate) {
            queryBuilder = queryBuilder
                .gte("treatment_date", startDate.toISOString())
                .lte("treatment_date", endDate.toISOString());
        }

        queryBuilder = queryBuilder
            .order("treatment_date", { ascending: false })
            .limit(safeLimit);

        const { data, error } = await queryBuilder;

        if (error) {
            throw error;
        }

        const treatmentRows = data || [];
        const customerIdList = [
            ...new Set(treatmentRows.map((row) => row.customer_id).filter(Boolean)),
        ];
        const serviceIdList = [
            ...new Set(treatmentRows.map((row) => row.service_id).filter(Boolean)),
        ];

        let customerMap = new Map();
        let serviceMap = new Map();

        if (customerIdList.length > 0) {
            const { data: customers, error: customerError } = await supabase
                .from("customers")
                .select("id, full_name, phone, note")
                .in("id", customerIdList);

            if (customerError) {
                throw customerError;
            }

            customerMap = new Map(
                (customers || []).map((customer) => [
                    customer.id,
                    {
                        id: customer.id,
                        full_name: customer.full_name || "",
                        phone: customer.phone || "",
                        note: customer.note || "",
                    },
                ])
            );
        }

        if (serviceIdList.length > 0) {
            const { data: services, error: serviceError } = await supabase
                .from("services")
                .select("id, name, price, description")
                .in("id", serviceIdList);

            if (serviceError) {
                throw serviceError;
            }

            serviceMap = new Map(
                (services || []).map((service) => [
                    service.id,
                    {
                        id: service.id,
                        name: service.name || "",
                        price: Number(service.price || 0),
                        description: service.description || "",
                    },
                ])
            );
        }

        const treatments = treatmentRows.map((row) =>
            normalizeTreatment(row, customerMap, serviceMap)
        );

        return {
            success: true,
            tool: "treatment.search",
            query: customerQuery,
            count: treatments.length,
            treatments,
            date_window: dateWindow.label || "all_time",
        };
    } catch (error) {
        console.error("[treatment.search] error:", error);

        return {
            success: false,
            tool: "treatment.search",
            query: customerQuery,
            count: 0,
            treatments: [],
            error: error.message || "Unknown error",
        };
    }
}

const treatmentSearchTool = {
    name: "treatment.search",
    description: "Tìm kiếm phiếu điều trị theo tên khách hàng, số điện thoại hoặc thời gian điều trị.",
    category: "treatment",
    permissions: ["admin", "receptionist", "developers", "assistant"],
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Từ khóa tìm kiếm khách hàng",
            },
            customerQuery: {
                type: "string",
                description: "Tên khách hàng hoặc số điện thoại",
            },
            dateWindow: {
                type: "object",
                description: "Khoảng thời gian đã parse sẵn",
            },
            limit: {
                type: "number",
                description: "Số lượng kết quả tối đa",
            },
        },
    },
    outputSchema: {
        type: "object",
        properties: {
            success: { type: "boolean" },
            count: { type: "number" },
            treatments: { type: "array" },
        },
    },
    execute: searchTreatments,
};

export default treatmentSearchTool;
export { searchTreatments };