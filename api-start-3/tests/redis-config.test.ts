import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { client, connectRedis, delValue, getValue, setValue } from "../src/config/redisConfig";
import logger from "../src/config/logger";

describe("Redis helpers", () => {
  it("uses the configured retry delay strategy", () => {
    const strategy = (client as any).options.socket.reconnectStrategy;
    assert.equal(strategy(0), 500);
    assert.equal(strategy(5), 500);
    assert.equal(strategy(6), 30_000);
    assert.equal(strategy(12), 30_000);
  });

  it("skips empty values and writes strings or hash fields", async (t) => {
    const set = t.mock.method(client, "set", async () => "OK");
    const hSet = t.mock.method(client, "hSet", async () => 1);

    await setValue("empty", "");
    await setValue("token", "abc", 60);
    await setValue("profile", { name: "Alice", city: "Shanghai" });

    assert.equal(set.mock.callCount(), 1);
    assert.deepEqual(set.mock.calls[0].arguments, ["token", "abc", { EX: 60 }]);
    assert.deepEqual(hSet.mock.calls.map((call) => call.arguments), [
      ["profile", "name", "Alice"], ["profile", "city", "Shanghai"],
    ]);
  });

  it("reads string and hash values and returns null for other types", async (t) => {
    const type = t.mock.method(client, "type", async (key: string) => key);
    t.mock.method(client, "get", async () => "value");
    t.mock.method(client, "hGetAll", async () => ({ field: "value" }));

    assert.equal(await getValue("string"), "value");
    assert.deepEqual(await getValue("hash"), { field: "value" });
    assert.equal(await getValue("none"), null);
    assert.equal(type.mock.callCount(), 3);
  });

  it("returns the delete count and logs successful deletion", async (t) => {
    let deleted = 1;
    const del = t.mock.method(client, "del", async () => deleted);
    const info = t.mock.method(logger, "info", () => logger);
    assert.equal(await delValue("key"), 1);
    assert.equal(info.mock.callCount(), 1);
    deleted = 0;
    assert.equal(await delValue("missing"), 0);
    assert.equal(info.mock.callCount(), 1);
  });

  it("connects and logs Redis lifecycle events", async (t) => {
    const connect = t.mock.method(client, "connect", async () => client);
    const info = t.mock.method(logger, "info", () => logger);
    const error = t.mock.method(logger, "error", () => logger);
    await connectRedis();
    client.emit("error", new Error("redis error"));
    client.emit("end");
    client.emit("reconnection", { attempt: 2, delay: 500 });

    assert.equal(connect.mock.callCount(), 1);
    assert.equal(info.mock.callCount(), 3);
    assert.equal(error.mock.callCount(), 1);
  });
});
