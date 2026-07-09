import express from "express";
import crypto from "crypto";

import aiService from "../services/ai.service.js";

const router = express.Router();

function createSessionId() {
    return crypto.randomUUID();
}

router.post("/chat", async (req, res) => {

    try {

        const {
            message,
            history = [],
            context = "",
            sessionId
        } = req.body;

        if (!message || !String(message).trim()) {

            return res.status(400).json({
                success: false,
                error: "message is required"
            });

        }

        const finalSessionId =
            sessionId && String(sessionId).trim()
                ? sessionId
                : createSessionId();

        const result = await aiService.ask({

            sessionId: finalSessionId,

            userMessage: message,

            history,

            context

        });

        return res.json({

            success: true,

            sessionId: finalSessionId,

            answer: result.answer,

            toolExecution: result.toolExecution,

            memory: result.memory,

            usage: result.usage

        });

    }
    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            error: err.message

        });

    }

});

export default router;