import assert from "node:assert/strict";
import { describe, it } from "node:test";
import logger from "../src/config/logger";
import { app, bootstrap, handleBodyError, launchIfMain, runMain, start } from "../src/index";

describe("application startup", () => {
  it("registers middleware and reports body parsing errors", (t) => {
    assert.equal(app.middleware.length, 4);
    const error = t.mock.method(logger, "error", () => logger);
    const failure = new Error("invalid multipart body");
    handleBodyError(failure);
    assert.deepEqual(error.mock.calls[0].arguments, [{ err: failure }, "koa-body error"]);
  });

  it("connects both stores before listening and logs the bound port", async () => {
    const calls: string[] = [];
    const dependencies = {
      connectDatabase: async () => { calls.push("database"); },
      connectCache: async () => { calls.push("cache"); },
      listen: (_port: number, callback?: () => void) => { calls.push("listen"); callback?.(); return {} as any; },
      logInfo: (...args: any[]) => { calls.push(`info:${args[0].port}`); return undefined as any; },
      logError: () => undefined as any,
      exit: () => undefined as any,
    } as any;

    await bootstrap(dependencies);

    assert.deepEqual(calls.sort(), ["cache", "database", "info:3000", "listen"]);
  });

  it("starts successfully through the guarded entrypoint", async () => {
    let listening = false;
    await start({
      connectDatabase: async () => {},
      connectCache: async () => {},
      listen: (_port: number, callback?: () => void) => { listening = true; callback?.(); return {} as any; },
      logInfo: (() => {}) as any,
      logError: (() => {}) as any,
      exit: (() => assert.fail("successful startup must not exit")) as any,
    });
    assert.equal(listening, true);
  });

  it("logs startup errors and exits with a failure status", async () => {
    const failure = new Error("database unavailable");
    let logged: unknown[] = [];
    let exitCode: number | undefined;
    await start({
      connectDatabase: async () => { throw failure; },
      connectCache: async () => {},
      listen: (() => { assert.fail("must not listen after a failed connection"); }) as any,
      logInfo: (() => {}) as any,
      logError: (...args: unknown[]) => { logged = args; return undefined as any; },
      exit: ((code?: number) => { exitCode = code; return undefined as any; }) as any,
    });

    assert.deepEqual(logged, [{ err: failure }, "启动失败:"]);
    assert.equal(exitCode, 1);
  });

  it("launches only when this module is the process entrypoint", () => {
    let launches = 0;
    launchIfMain(undefined, "/app/src/index.ts", () => { launches++; });
    launchIfMain("/app/src/test.ts", "/app/src/index.ts", () => { launches++; });
    launchIfMain("/app/src/index.ts", "/app/src/index.ts", () => { launches++; });
    assert.equal(launches, 1);
  });

  it("runs the main startup using injected dependencies", async () => {
    let connected = false;
    await runMain({
      connectDatabase: async () => {},
      connectCache: async () => { connected = true; },
      listen: (_port: number, callback?: () => void) => { callback?.(); return {} as any; },
      logInfo: (() => {}) as any,
      logError: (() => {}) as any,
      exit: (() => assert.fail("startup should succeed")) as any,
    });
    assert.equal(connected, true);
  });
});
