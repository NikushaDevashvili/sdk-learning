import OpenAI from "openai";
import { init, wrapOpenAI } from "./sdk.js";
import "dotenv/config";

const OBSERVA_API_URL =
  "https://webhook.site/0842db0f-1dba-4dd9-b9f2-27ca150e15a5";

async function main() {
  const observa = init({
    apiKey: "seven-api-key",
    apiUrl: OBSERVA_API_URL,
  });

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  wrapOpenAI(client, { observa });

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "user", content: "Count from 1 to 5, one number per line." },
    ],
    stream: true,
  });

  let fullText = "";
  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      fullText += content;
      process.stdout.write(content);
    }
  }
  console.log("\n--- Full response ---\n", fullText);
  await observa.flush();
  console.log(
    "Seven done. Check your request bin for the streaming event (TTFT, streamingDurationMs).",
  );
}

main();
