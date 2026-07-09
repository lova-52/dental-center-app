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
        return { label: "upcoming", start: null, end: null };
    }

    if (typeof dateWindow === "object") {
        return {
            label: dateWindow.label || "upcoming",
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

    return { label: "upcoming", start: null, end: null };
}

function normalizeAppointment(row, customerMap = new Map()) {
    const customer = row.customer_id ? customerMap.get(row.customer_id) : null;

    return {
        id: row.id,
        appointment_time: row.appointment_time || null,
        status: row.status || "scheduled",
        reason: row.reason || "",
        customer_id: row.customer_id || null,
        customer_name: customer?.full_name || "",
        customer_phone: customer?.phone || "",
        customer_note: customer?.note || "",
        created_at: row.created_at || null,
    };
}

async function searchAppointments(input = {}) {
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
                    tool: "appointment.search",
                    query: customerQuery,
                    count: 0,
                    appointments: [],
                    date_window: dateWindow.label || "upcoming",
                    match_status: "customer_not_found",
                };
            }
        }

        let queryBuilder = supabase
            .from("appointments")
            .select(`
                id,
                appointment_time,
                status,
                reason,
                customer_id,
                created_at
            `);

        if (customerIds.length > 0) {
            queryBuilder = queryBuilder.in("customer_id", customerIds);
        }

        if (startDate && endDate) {
            queryBuilder = queryBuilder
                .gte("appointment_time", startDate.toISOString())
                .lte("appointment_time", endDate.toISOString());
        } else if (!customerIds.length) {
            queryBuilder = queryBuilder.gte("appointment_time", new Date().toISOString());
        }

        queryBuilder = queryBuilder
            .order("appointment_time", { ascending: true })
            .limit(safeLimit);

        const { data, error } = await queryBuilder;

        if (error) {
            throw error;
        }

        const appointmentRows = data || [];
        const customerIdList = [
            ...new Set(appointmentRows.map((row) => row.customer_id).filter(Boolean)),
        ];

        let customerMap = new Map();

        if (customerIdList.length > 0) {
            const { data: customers, error: customerError } = await supabase
                .from("customers")
                .select(`
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
                `)
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

        const appointments = appointmentRows.map((row) =>
            normalizeAppointment(row, customerMap)
        );

        return {
            success: true,
            tool: "appointment.search",
            query: customerQuery,
            count: appointments.length,
            appointments,
            date_window: dateWindow.label || "upcoming",
        };
    } catch (error) {
        console.error("[appointment.search] error:", error);

        return {
            success: false,
            tool: "appointment.search",
            query: customerQuery,
            count: 0,
            appointments: [],
            error: error.message || "Unknown error",
        };
    }
}

const appointmentSearchTool = {
    name: "appointment.search",
    description: "Tìm kiếm lịch hẹn theo tên khách hàng, số điện thoại hoặc mốc thời gian như hôm nay, ngày mai, tuần này.",
    category: "appointment",
    permissions: ["admin", "receptionist", "telesale", "developers"],
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
            appointments: { type: "array" },
        },
    },
    execute: searchAppointments,
};

export default appointmentSearchTool;
export { searchAppointments };