export type InitConfig = {
  apiKey: string;
  apiUrl: string;
};

export function init(config: InitConfig) {
  const apiKey = config.apiKey;
  const apiUrl = config.apiUrl;
  const events: unknown[] = [];

  function capture(data: unknown) {
    events.push(data);
  }

  async function flush() {
    if (events.length === 0) return;

    const body = JSON.stringify(events);
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body,
    });

    if (!response.ok) {
      console.error(
        "[SDK] flush failed:",
        response.status,
        response.statusText,
      );
      return;
    }

    events.length = 0;
  }

  return {
    apiKey,
    apiUrl,
    capture,
    flush,
    wrapOpenAI: wrapOpenAI,
  };
}
export function wrapOpenAI(
  client: any,
  options: { observa: ReturnType<typeof init> },
) {
  const completions = client.chat?.completions;
  if (!completions?.create) {
    console.warn("[SDK] wrapOpenAI: client.chat.completions.create not found");
    return client;
  }

  const originalCreate = completions.create.bind(completions);

  completions.create = async function (...args: any[]) {
    const requestParams = args[0] ?? {};
    const isStreaming = requestParams.stream === true;
    const model = requestParams.model ?? "unknown";
    const messages = requestParams.messages ?? [];

    const traceId = crypto.randomUUID();
    const spanId = crypto.randomUUID();

    const startTime = Date.now();
    let result: any;

    try {
      result = await originalCreate(...args);
    } catch (err: any) {
      const errorMessage = err?.message ?? String(err);
      const latencyMs = Date.now() - startTime;
      const errorEvent = {
        traceId,
        spanId,
        eventType: "error",
        errorMessage,
        latencyMs,
      };
      options.observa.capture(errorEvent);
      console.error("[SDK] OpenAI create failed:", err);
      throw err;
    }

    if (!isStreaming && result) {
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      const content = result.choices?.[0]?.message?.content ?? null;
      const usage = result.usage ?? null;
      const event = {
        traceId,
        spanId,
        model,
        messages,
        response: content,
        usage,
        latencyMs,
      };
      options.observa.capture(event);
      return result;
    }

    if (isStreaming && result && Symbol.asyncIterator in Object(result)) {
      const startTimeStream = Date.now();
      let firstChunkTime: number | null = null;
      let fullContent = "";
      let usage: any = null;
      let deltaEventCount = 0;
      let cancelAtMs: number | null = null;

      const wrapped = (async function* () {
        try {
          for await (const chunk of result) {
            deltaEventCount += 1;
            if (firstChunkTime === null) firstChunkTime = Date.now();
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) fullContent += content;
            if (chunk.usage) usage = chunk.usage;
            yield chunk;
          }
        } catch (err) {
          cancelAtMs = Date.now() - startTimeStream;
          throw err;
        }
        const endTime = Date.now();
        const event = {
          traceId,
          spanId,
          model,
          messages,
          response: fullContent,
          usage,
          latencyMs: endTime - startTimeStream,
          timeToFirstTokenMs:
            firstChunkTime !== null ? firstChunkTime - startTimeStream : null,
          streamingDurationMs: endTime - startTimeStream,
          cancel_at_ms: cancelAtMs,
          stream: {
            first_token_ms:
              firstChunkTime !== null ? firstChunkTime - startTimeStream : null,
            last_token_ms: endTime - startTimeStream,
            delta_event_count: deltaEventCount,
          },
          params: {
            stream: requestParams.stream,
            stream_options: requestParams.stream_options,
          },
        };
        options.observa.capture(event);
      })();

      return wrapped;
    }

    return result;
  };

  return client;
}
