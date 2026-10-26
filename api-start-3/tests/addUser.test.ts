import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcrypt";
import { addUser } from "../src/controller/user";
import UserModel from "../src/model/user";

describe("addUser duplicate username handling", () => {
  it("hashes the default password and returns the created user", async (t) => {
    const hash = t.mock.method(bcrypt, "hash", async () => "hashed-password");
    const createdUser = { _id: "user-id", username: "new@example.com", name: "Alice" };
    const create = t.mock.method(UserModel, "create", async () => createdUser);
    const body = { username: "new@example.com", name: "Alice" };
    const ctx = { request: { body } } as any;

    await addUser(ctx, async () => {});

    assert.deepEqual(hash.mock.calls[0].arguments, ["123456", 10]);
    assert.deepEqual(create.mock.calls[0].arguments, [{ ...body, password: "hashed-password" }]);
    assert.deepEqual(ctx.body, { code: 200, data: createdUser });
  });

  it("rejects invalid input before hashing or inserting", async (t) => {
    const hash = t.mock.method(bcrypt, "hash", async () => "hashed-password");
    const create = t.mock.method(UserModel, "create", async () => ({}));
    const ctx = { request: { body: { username: "", name: "Alice" } } } as any;

    await addUser(ctx, async () => {});

    assert.equal(ctx.body.code, 400);
    assert.ok(ctx.body.msg.username);
    assert.equal(hash.mock.callCount(), 0);
    assert.equal(create.mock.callCount(), 0);
  });

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
