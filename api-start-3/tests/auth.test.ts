import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { auth } from "../src/common/Auth";
import { JWT_SECRET } from "../src/config";

type AuthContext = Parameters<typeof auth>[0];

async function runAuth(method: string, path: string, authorization = "") {
  let nextCalls = 0;
  const ctx = {
    method,
    path,
    get: () => authorization,
    state: {} as Record<string, unknown>,
    status: 200,
    body: undefined as unknown,
  } as unknown as AuthContext;
  await auth(ctx, async () => { nextCalls++; });
  return { ctx, nextCalls };
}

describe("auth middleware", () => {
  it("allows OPTIONS requests", async () => {
    const { nextCalls } = await runAuth("OPTIONS", "/private");
    assert.equal(nextCalls, 1);
  });

  it("allows exact whitelist paths and their children", async () => {
    for (const path of ["/login", "/login/login", "/public", "/public/getCaptcha", "/test", "/test/"]) {
      const { nextCalls } = await runAuth("GET", path);
      assert.equal(nextCalls, 1, path);
    }
  });

  it("does not treat a similar path as whitelisted", async () => {
    const { ctx, nextCalls } = await runAuth("GET", "/login-other");
    assert.equal(nextCalls, 0);
    assert.equal(ctx.status, 401);
    assert.deepEqual(ctx.body, { code: 401, msg: "未登录" });
  });

  it("rejects a missing token", async () => {
    const { ctx, nextCalls } = await runAuth("GET", "/private");
    assert.equal(nextCalls, 0);
    assert.equal(ctx.status, 401);
    assert.deepEqual(ctx.body, { code: 401, msg: "未登录" });
  });

  it("accepts a valid Bearer token and exposes its payload", async () => {
    const token = jwt.sign({ _id: "user-1" }, JWT_SECRET);
    const { ctx, nextCalls } = await runAuth("GET", "/private", `Bearer ${token}`);
    assert.equal(nextCalls, 1);
    assert.equal((ctx.state.user as { _id: string })._id, "user-1");
  });

  it("rejects an expired token", async () => {
    const token = jwt.sign({ _id: "user-1" }, JWT_SECRET, { expiresIn: -1 });
    const { ctx, nextCalls } = await runAuth("GET", "/private", `Bearer ${token}`);
    assert.equal(nextCalls, 0);
    assert.equal(ctx.status, 401);
    assert.deepEqual(ctx.body, { code: 401, msg: "登录过期" });
  });

  it("rejects an invalid token", async () => {
    const { ctx, nextCalls } = await runAuth("GET", "/private", "Bearer invalid-token");
    assert.equal(nextCalls, 0);
    assert.equal(ctx.status, 401);
    assert.deepEqual(ctx.body, { code: 401, msg: "无效的token" });
  });
});
