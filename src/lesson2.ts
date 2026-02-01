import { init } from "./sdk";

const observa = init({
  apiKey: "my-api-key-123",
  apiUrl: "https://example.com/events",
});

observa.capture({ name: "event1", value: 100 });
observa.capture({ name: "event2", value: 200 });

await observa.flush();
