import { init } from "./sdk";

const REQUEST_BIN_URL =
  "https://webhook.site/0842db0f-1dba-4dd9-b9f2-27ca150e15a5";

async function main() {
  const observa = init({
    apiKey: "my-api-key-lesson3",
    apiUrl: REQUEST_BIN_URL,
  });

  observa.capture({ name: "event1", value: 100 });
  observa.capture({ name: "event2", value: 200 });

  await observa.flush();
  console.log("Lesson 3 done. Check your request bin page for the POST body.");
}

main();
