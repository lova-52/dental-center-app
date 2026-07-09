const logger = {
    info(message, meta = null) {
        if (meta) {
            console.log(`[INFO] ${message}`, meta);
            return;
        }

        console.log(`[INFO] ${message}`);
    },

    warn(message, meta = null) {
        if (meta) {
            console.warn(`[WARN] ${message}`, meta);
            return;
        }

        console.warn(`[WARN] ${message}`);
    },

    error(message, meta = null) {
        if (meta) {
            console.error(`[ERROR] ${message}`, meta);
            return;
        }

        console.error(`[ERROR] ${message}`);
    }
};

export default logger;