import dotenv from "dotenv";

dotenv.config();

const required = [
    "PORT",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OLLAMA_BASE_URL",
    "OLLAMA_MODEL"
];

for (const key of required) {

    if (!process.env[key]) {

        throw new Error(`Missing environment variable: ${key}`);

    }

}

export default {

    port: Number(process.env.PORT),

    nodeEnv: process.env.NODE_ENV,

    supabaseUrl: process.env.SUPABASE_URL,

    supabaseServiceRoleKey:
        process.env.SUPABASE_SERVICE_ROLE_KEY,

    ollamaBaseUrl:
        process.env.OLLAMA_BASE_URL,

    ollamaModel:
        process.env.OLLAMA_MODEL,

    aiName:
        process.env.AI_NAME,

    clinicName:
        process.env.AI_CLINIC

};