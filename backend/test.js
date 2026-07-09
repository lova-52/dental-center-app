import aiService from "./services/ai.service.js";

async function run() {
    const sessionId = "demo-session-001";

    const steps = [

        "Hôm nay có lịch hẹn không?",

        "Khách Philip Bradford có lịch hẹn không?",

        "Bao giờ?",

        "Làm implant à?",

        "SĐT?",

        "Bảo hành?",

        "Điều trị gì?",

    ];

    for (const message of steps) {
        console.log(`\n=== ${message} ===\n`);

        const result = await aiService.ask({
            sessionId,
            userMessage: message,
        });

        console.log(JSON.stringify(result, null, 2));
    }
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});