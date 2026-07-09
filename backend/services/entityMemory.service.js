class EntityMemoryService {
    update(session, toolExecution) {
        if (!session || !toolExecution) return;

        const context = String(toolExecution.context || "");

        if (context.includes("# TOOL: customer.search")) {
            const customerBlocks = context.match(
                /\d+\.\s+Họ tên:\s*(.+?)\s*\|\s*SĐT:\s*(.+?)\s*\|/g
            );

            const firstNameMatch = context.match(/Họ tên:\s*(.+?)\s*\|/);
            const firstPhoneMatch = context.match(/SĐT:\s*(.+?)\s*\|/);

            if (firstNameMatch || firstPhoneMatch) {
                session.entities.currentCustomer = {
                    full_name: firstNameMatch?.[1]?.trim() || "",
                    phone: firstPhoneMatch?.[1]?.trim() || "",
                };
            }

            if (customerBlocks && customerBlocks.length > 0) {
                const firstBlock = customerBlocks[0];
                const name = firstBlock.match(/Họ tên:\s*(.+?)\s*\|/)?.[1]?.trim() || "";
                const phone = firstBlock.match(/SĐT:\s*(.+?)\s*\|/)?.[1]?.trim() || "";

                if (name || phone) {
                    session.entities.currentCustomer = {
                        full_name: name,
                        phone,
                    };
                }
            }
        }

        if (context.includes("# TOOL: appointment.search")) {
            const name = context.match(/Khách:\s*(.+?)\s*\|/)?.[1]?.trim() || "";
            const time = context.match(/Thời gian:\s*(.+?)\s*\|/)?.[1]?.trim() || "";
            const reason = context.match(/Lý do:\s*(.+?)\s*$/m)?.[1]?.trim() || "";

            if (name || time || reason) {
                session.entities.currentAppointment = {
                    customer_name: name,
                    appointment_time: time,
                    reason,
                };
            }
        }

        if (context.includes("# TOOL: treatment.search")) {
            const name = context.match(/Khách:\s*(.+?)\s*\|/)?.[1]?.trim() || "";
            const service = context.match(/Dịch vụ:\s*(.+?)\s*\|/)?.[1]?.trim() || "";
            const date = context.match(/Ngày:\s*(.+?)\s*\|/)?.[1]?.trim() || "";
            const doctor = context.match(/Bác sĩ:\s*(.+?)\s*\|/)?.[1]?.trim() || "";

            if (name || service || date || doctor) {
                session.entities.currentTreatment = {
                    customer_name: name,
                    service_name: service,
                    treatment_date: date,
                    doctor_name: doctor,
                };
            }
        }

        if (context.includes("# TOOL: inventory.search")) {
            const name = context.match(/Tên:\s*(.+?)\s*\|/)?.[1]?.trim() || "";
            const code = context.match(/Mã:\s*(.+?)\s*\|/)?.[1]?.trim() || "";

            if (name || code) {
                session.entities.currentInventoryItem = {
                    name,
                    code,
                };
            }
        }

        if (context.includes("# TOOL: invoice.search")) {
            const invoiceNo = context.match(/Số HĐ:\s*(.+?)\s*\|/)?.[1]?.trim() || "";
            const patient = context.match(/Khách:\s*(.+?)\s*\|/)?.[1]?.trim() || "";
            const total = context.match(/Tổng:\s*(.+?)\s*\|/)?.[1]?.trim() || "";

            if (invoiceNo || patient || total) {
                session.entities.currentInvoice = {
                    invoice_no: invoiceNo,
                    patient_name: patient,
                    total_amount: total,
                };
            }
        }
    }
}

const entityMemoryService = new EntityMemoryService();

export default entityMemoryService;