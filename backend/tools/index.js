import toolRegistry from "../registry/toolRegistry.js";

import customerSearchTool from "./customer/customer.tool.js";
import appointmentSearchTool from "./appointment/appointment.tool.js";
import treatmentSearchTool from "./treatment/treatment.tool.js";
import inventorySearchTool from "./inventory/inventory.tool.js";
import invoiceSearchTool from "./invoice/invoice.tool.js";

let initialized = false;

export function registerDefaultTools() {
    if (initialized) {
        return toolRegistry;
    }

    toolRegistry.register(customerSearchTool);
    toolRegistry.register(appointmentSearchTool);
    toolRegistry.register(treatmentSearchTool);
    toolRegistry.register(inventorySearchTool);
    toolRegistry.register(invoiceSearchTool);

    initialized = true;
    return toolRegistry;
}

registerDefaultTools();

export default toolRegistry;