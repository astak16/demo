import { after, before, beforeEach, mock } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import Koa from "koa";
import KoaBody from "koa-body";
import routers from "../../src/routers";
import { client } from "../../src/config/redisConfig";

export const validBody = { sid: "captcha-id", code: "AbCd", username: "alice", password: "secret" };

export function setupApi() {
  const cache = new Map<string, string>();
  const savedExpirations = new Map<string, number | undefined>();
  let server: Server;
  let baseUrl: string;

  // Run the real routes while substituting only external storage.
  before(async () => {
    mock.method(client, "type", async (key: string) => (cache.has(key) ? "string" : "none"));
    mock.method(client, "get", async (key: string) => cache.get(key) ?? null);
    mock.method(client, "set", async (key: string, value: string, options?: { EX?: number }) => {
      cache.set(key, value);
      savedExpirations.set(key, options?.EX);
      return "OK";
    });

    const app = new Koa();
    app.use(KoaBody());
    app.use(routers.routes());
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, "127.0.0.1", resolve);
      server.once("error", reject);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(() => {
    cache.clear();
    savedExpirations.clear();
  });

  after(async () => {
    mock.restoreAll();
    if (server?.listening) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });

  async function request(path: string, body?: Record<string, unknown>) {
    const response = await fetch(`${baseUrl}${path}`, body === undefined ? undefined : {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() as Record<string, any> };
  }

  return { cache, savedExpirations, request };
}
