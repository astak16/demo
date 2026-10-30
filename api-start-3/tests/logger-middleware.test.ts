import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accessLogger } from "../src/config/logger";
import Logger from "../src/common/Logger";

describe("request logger middleware", () => {
  it("logs request metadata after a successful request", async (t) => {
    const info = t.mock.method(accessLogger, "info", () => accessLogger);
    const ctx = {
      method: "GET",
      originalUrl: "/items?page=1",
      status: 200,
      ip: "127.0.0.1",
      get: (name: string) => name === "user-agent" ? "test-agent" : "",
    } as any;

    await Logger(ctx, async () => {});

    assert.equal(info.mock.callCount(), 1);
    const [metadata, message] = info.mock.calls[0].arguments as [Record<string, unknown>, string];
    assert.deepEqual({ ...metadata, durationMs: 0 }, {
      method: "GET", url: "/items?page=1", status: 200, durationMs: 0, userAgent: "test-agent", ip: "127.0.0.1",
    });
    assert.equal(message, "request completed");
  });

  it("logs in finally when downstream middleware throws", async (t) => {
    const info = t.mock.method(accessLogger, "info", () => accessLogger);
    const failure = new Error("handler failed");

    await assert.rejects(Logger({ method: "POST", originalUrl: "/items", status: 500, ip: "::1", get: () => "" } as any, async () => {
      throw failure;
    }), failure);

    assert.equal(info.mock.callCount(), 1);
    assert.equal(info.mock.calls[0].arguments[0].userAgent, undefined);
  });
});
