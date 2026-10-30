import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { JWT_SECRET } from "../src/config";
import { checkCode, generateToken, getJWTPayload, getMenuData } from "../src/common/Utils";
import { client } from "../src/config/redisConfig";

describe("common utility functions", () => {
  it("compares cached verification codes case-insensitively", async (t) => {
    t.mock.method(client, "type", async () => "string");
    t.mock.method(client, "get", async () => "aBcD");
    assert.equal(await checkCode("code", "ABcd"), true);
    assert.equal(await checkCode("code", "wrong"), false);
  });

  it("rejects codes when the cache value is not a string", async (t) => {
    t.mock.method(client, "type", async () => "none");
    assert.equal(await checkCode("missing", "ABcd"), false);
  });

  it("generates and reads a signed token", () => {
    const token = generateToken({ _id: "user-1" });
    const payload = getJWTPayload(`Bearer ${token}`) as any;
    assert.equal(payload._id, "user-1");
    assert.ok(payload.exp > payload.iat);
    assert.throws(() => generateToken(null as any), /生成 token 失败/);
    assert.equal(typeof JWT_SECRET, "string");
  });

  it("sorts accessible menus, maps links, and skips unsupported types", () => {
    const routes = getMenuData([
      { _id: "menu", path: "/menu", title: "Menu", type: "menu", children: [
        { _id: "child", path: "/child", title: "Child", type: "menu" },
      ] },
      { _id: "link", path: "/docs", title: "Docs", type: "link", sort: 10, link: "https://example.com" },
      { _id: "action", path: "/action", title: "Action", type: "button", sort: 5 },
      { _id: "hidden", path: "/hidden", title: "Hidden", type: "link" },
    ], ["menu", "child", "link", "action"]);

    assert.deepEqual(routes.map(({ _id }) => _id), ["menu", "link"]);
    assert.deepEqual(routes[0].children?.map(({ _id }) => _id), ["child"]);
    assert.equal(routes[1].meta.href, "https://example.com");
  });

  it("includes top-level routes when the full-menu flag is set", () => {
    const routes = getMenuData([
      { _id: "menu", path: "/menu", title: "Menu", type: "menu", children: [
        { _id: "child", path: "/child", title: "Child", type: "menu" },
      ] },
      { _id: "link", path: "/docs", title: "Docs", type: "link" },
    ], [], true);

    assert.deepEqual(routes.map(({ _id }) => _id), ["menu", "link"]);
    assert.deepEqual(routes[0].children, []);
  });
});
