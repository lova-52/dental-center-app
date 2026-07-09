import OpenAI from "openai";
import env from "../config/env.js";

const client = new OpenAI({

    baseURL: env.ollamaBaseUrl,

    apiKey: "ollama"

});

export async function chat(messages) {

    const response = await client.chat.completions.create({

        model: env.ollamaModel,

        messages,

        temperature: 0.2,

        stream: false

    });

    return response.choices[0].message.content;

}

export default client;