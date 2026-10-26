import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcrypt";
import { addUser } from "../src/controller/user";
import UserModel from "../src/model/user";

describe("addUser duplicate username handling", () => {
  it("returns a user-friendly error for MongoDB duplicate-key errors", async (t) => {
    t.mock.method(bcrypt, "hash", async () => "hashed-password");
    t.mock.method(UserModel, "create", async () => {
      throw Object.assign(new Error("duplicate key"), { code: 11000 });
    });
    const ctx = { request: { body: { username: "ast1ask@qq.com", name: "Alice" } } } as any;

    await addUser(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 500, msg: "用户名已存在，请重新输入！" });
  });

  it("rethrows database errors unrelated to duplicate keys", async (t) => {
    const failure = new Error("database unavailable");
    t.mock.method(bcrypt, "hash", async () => "hashed-password");
    t.mock.method(UserModel, "create", async () => { throw failure; });
    const ctx = { request: { body: { username: "ast1ask@qq.com", name: "Alice" } } } as any;

    await assert.rejects(addUser(ctx, async () => {}), failure);
  });
});
