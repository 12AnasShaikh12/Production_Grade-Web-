import { describe, expect, it, vi } from "vitest";
import { createNvidiaClient, NvidiaError } from "@/lib/chat/nvidia";

const config = {
  apiKey: "nvapi-test-key-000000",
  baseUrl: "https://nv.test/v1",
  chatModel: "chat-model",
  embeddingModel: "embed-model",
  embeddingInputType: "query_passage" as const,
  timeoutMs: 1000,
  maxRetries: 2,
};

describe("NVIDIA client", () => {
  it("sends OpenAI-compatible chat requests with a server-side bearer token", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ choices: [{ message: { content: " Hello " }, finish_reason: "stop" }] }));
    const client = createNvidiaClient(config, fetchImpl as never);
    await expect(client.chat([{ role: "user", content: "hi" }])).resolves.toBe("Hello");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://nv.test/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer nvapi-test-key-000000");
    expect(JSON.parse(init.body as string)).toMatchObject({ model: "chat-model", stream: false });
  });

  it("requests embeddings with input_type and returns vectors in index order", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({
        data: [
          { index: 1, embedding: [0, 1] },
          { index: 0, embedding: [1, 0] },
        ],
      }),
    );
    const client = createNvidiaClient(config, fetchImpl as never);
    await expect(client.embed(["a", "b"], "passage")).resolves.toEqual([
      [1, 0],
      [0, 1],
    ]);
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ model: "embed-model", input: ["a", "b"], input_type: "passage" });
  });

  it("rejects malformed embeddings", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ data: [{ index: 0, embedding: [1, 2] }, { index: 1, embedding: [1] }] }));
    await expect(createNvidiaClient(config, fetchImpl as never).embed(["a", "b"], "query")).rejects.toMatchObject({ kind: "bad_response" });
  });

  it("retries transient errors a bounded number of times, never auth errors", async () => {
    const flaky = vi.fn().mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(Response.json({ choices: [{ message: { content: "ok" } }] }));
    await expect(createNvidiaClient(config, flaky as never).chat([{ role: "user", content: "x" }])).resolves.toBe("ok");
    expect(flaky).toHaveBeenCalledTimes(2);

    const down = vi.fn(async () => new Response("", { status: 500 }));
    await expect(createNvidiaClient(config, down as never).chat([{ role: "user", content: "x" }])).rejects.toBeInstanceOf(NvidiaError);
    expect(down).toHaveBeenCalledTimes(3);

    const denied = vi.fn(async () => new Response("", { status: 401 }));
    await expect(createNvidiaClient(config, denied as never).chat([{ role: "user", content: "x" }])).rejects.toMatchObject({ kind: "auth" });
    expect(denied).toHaveBeenCalledTimes(1);
  });

  it("fails fast with not_configured when the key or model is missing", async () => {
    const fetchImpl = vi.fn();
    await expect(createNvidiaClient({ ...config, apiKey: undefined }, fetchImpl as never).chat([])).rejects.toMatchObject({ kind: "not_configured" });
    await expect(createNvidiaClient({ ...config, embeddingModel: undefined }, fetchImpl as never).embed(["x"], "query")).rejects.toMatchObject({
      kind: "not_configured",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
