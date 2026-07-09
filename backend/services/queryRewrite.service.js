class QueryRewriteService {

    rewrite(message, entities = {}) {

        const original = String(message || "").trim();

        if (!original) {
            return original;
        }

        const lower = original.toLowerCase();

        const customer =
            entities.currentCustomer?.full_name ||
            entities.currentAppointment?.customer_name ||
            entities.currentTreatment?.customer_name ||
            entities.currentInvoice?.patient_name ||
            "";

        if (!customer) {
            return original;
        }

        const map = [

            {
                keywords: ["bao giờ", "khi nào", "lúc nào"],
                rewrite: () =>
                    `Lịch hẹn của khách ${customer} vào thời gian nào?`
            },

            {
                keywords: ["sđt", "điện thoại", "phone"],
                rewrite: () =>
                    `Số điện thoại của khách ${customer}`
            },

            {
                keywords: ["bảo hành"],
                rewrite: () =>
                    `Khách ${customer} còn bảo hành không?`
            },

            {
                keywords: ["implant"],
                rewrite: () =>
                    `Khách ${customer} đã điều trị implant chưa?`
            },

            {
                keywords: ["điều trị"],
                rewrite: () =>
                    `Khách ${customer} đã điều trị gì?`
            },

            {
                keywords: ["hóa đơn"],
                rewrite: () =>
                    `Hóa đơn của khách ${customer}`
            },

            {
                keywords: ["thanh toán"],
                rewrite: () =>
                    `Khách ${customer} đã thanh toán chưa?`
            }

        ];

        for (const item of map) {

            if (item.keywords.some(k => lower.includes(k))) {

                return item.rewrite();

            }

        }

        return original;

    }

}

const queryRewriteService = new QueryRewriteService();

export default queryRewriteService;