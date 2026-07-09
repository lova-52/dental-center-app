import { supabase } from "../../config/supabase.js";

function normalizeText(value = "") {
    return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeItem(row, categoryMap = new Map()) {
    const category = row.category_id ? categoryMap.get(row.category_id) : null;

    return {
        id: row.id,
        code: row.code || "",
        name: row.name || "",
        category_id: row.category_id || null,
        category_name: category?.name || "",
        unit: row.unit || "",
        price: Number(row.price || 0),
        stock_min: row.stock_min ?? null,
        qty_on_hand: Number(row.qty_on_hand || 0),
        note: row.note || "",
        image_path: row.image_path || "",
        created_at: row.created_at || null,
    };
}

async function searchInventory(input = {}) {
    const rawQuery = normalizeText(input.itemQuery || input.query || "");
    const safeLimit = Math.max(1, Math.min(Number(input.limit || 10) || 10, 50));
    const lowStockOnly = Boolean(input.lowStock);

    try {
        let queryBuilder = supabase
            .from("items")
            .select(`
                id,
                code,
                name,
                category_id,
                unit,
                price,
                stock_min,
                qty_on_hand,
                note,
                image_path,
                created_at
            `)
            .order("created_at", { ascending: false })
            .limit(safeLimit);

        if (rawQuery) {
            const safeQuery = rawQuery.replace(/[%,]/g, " ");
            queryBuilder = queryBuilder.or(
                `name.ilike.%${safeQuery}%,code.ilike.%${safeQuery}%,note.ilike.%${safeQuery}%`
            );
        }

        const { data, error } = await queryBuilder;

        if (error) {
            throw error;
        }

        const itemRows = data || [];
        const categoryIdList = [
            ...new Set(itemRows.map((row) => row.category_id).filter(Boolean)),
        ];

        let categoryMap = new Map();

        if (categoryIdList.length > 0) {
            const { data: categories, error: categoryError } = await supabase
                .from("categories")
                .select("id, name, parent_id, status")
                .in("id", categoryIdList);

            if (categoryError) {
                throw categoryError;
            }

            categoryMap = new Map(
                (categories || []).map((category) => [
                    category.id,
                    {
                        id: category.id,
                        name: category.name || "",
                    },
                ])
            );
        }

        let items = itemRows.map((row) => normalizeItem(row, categoryMap));

        if (lowStockOnly) {
            items = items.filter((item) => {
                if (item.stock_min === null || item.stock_min === undefined) return false;
                return item.qty_on_hand <= item.stock_min;
            });
        }

        return {
            success: true,
            tool: "inventory.search",
            query: rawQuery,
            count: items.length,
            items,
        };
    } catch (error) {
        console.error("[inventory.search] error:", error);

        return {
            success: false,
            tool: "inventory.search",
            query: rawQuery,
            count: 0,
            items: [],
            error: error.message || "Unknown error",
        };
    }
}

const inventorySearchTool = {
    name: "inventory.search",
    description: "Tìm kiếm vật tư theo tên, mã, ghi chú hoặc lọc các vật tư sắp hết hàng.",
    category: "inventory",
    permissions: ["admin", "assistant", "receptionist", "developers"],
    inputSchema: {
        type: "object",
        properties: {
            query: {
                type: "string",
                description: "Từ khóa tìm kiếm",
            },
            itemQuery: {
                type: "string",
                description: "Từ khóa vật tư",
            },
            limit: {
                type: "number",
                description: "Số lượng kết quả tối đa",
            },
            lowStock: {
                type: "boolean",
                description: "Chỉ lấy vật tư sắp hết hàng",
            },
        },
        required: ["query"],
    },
    outputSchema: {
        type: "object",
        properties: {
            success: { type: "boolean" },
            count: { type: "number" },
            items: { type: "array" },
        },
    },
    execute: searchInventory,
};

export default inventorySearchTool;
export { searchInventory };