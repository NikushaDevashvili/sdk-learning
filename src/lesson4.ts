import OpenAI from "openai";
import { init, wrapOpenAI } from "./sdk.js";
import "dotenv/config";

const OBSERVA_API_URL =
  "https://webhook.site/0842db0f-1dba-4dd9-b9f2-27ca150e15a5";

async function main() {
  const observa = init({
    apiKey: "lesson4-sdk-key",
    apiUrl: OBSERVA_API_URL,
  });

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  wrapOpenAI(client, { observa });

  const response1 = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: 'Say "Hello from Lesson 4" in one sentence.' },
    ],
  });
  console.log("Assistant", response1.choices[0]?.message?.content);

  const response2 = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: 'Say "Hello from Lesson 4" in one sentence.' },
    ],
  });
  console.log("Assistant", response2.choices[0]?.message?.content);
  await observa.flush();
  console.log("Lesson 4 done. Check your request bin for the captured event.");
}

main();
