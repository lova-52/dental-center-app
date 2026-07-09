import aiService from "../services/ai.service.js";
import logger from "../utils/logger.js";

export async function chatController(req, res, next) {
    try {
        const {
            message,
            history = [],
            context = "",
            sessionId = null
        } = req.body || {};

        if (!message || String(message).trim() === "") {
            return res.status(400).json({
                success: false,
                error: "message is required"
            });
        }

        logger.info("AI chat request received", {
            sessionId,
            messageLength: String(message).length,
            historyLength: Array.isArray(history) ? history.length : 0,
            contextLength: String(context || "").length
        });

        const result = await aiService.ask({
            userMessage: message,
            history,
            context
        });

        return res.json({
            success: true,
            sessionId,
            ...result
        });
    } catch (error) {
        next(error);
    }
}