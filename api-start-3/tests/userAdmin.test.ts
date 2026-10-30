import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose from "mongoose";
import UserModel from "../src/model/user";
import { deleteUser, getUsers, updateUser, updateUserSettings } from "../src/controller/user";

const userId = new mongoose.Types.ObjectId().toString();

describe("admin user handlers", () => {
  it("filters users by a list of roles", async (t) => {
    const calls: unknown[][] = [];
    const rows = [{ _id: userId, name: "Alice" }];
    const query = {
      sort(value: unknown) { calls.push(["sort", value]); return this; },
      skip(value: number) { calls.push(["skip", value]); return this; },
      limit(value: number) { calls.push(["limit", value]); return this; },
      async exec() { return rows; },
    };
    const find = t.mock.method(UserModel, "find", (filter: unknown) => {
      calls.push(["find", filter]);
      return query as never;
    });
    t.mock.method(UserModel, "countDocuments", async () => 1);
    const ctx = {
      request: { body: undefined },
      query: { page: 1, limit: 10, item: "roles", search: ["admin", "editor"] },
    } as unknown as Parameters<typeof getUsers>[0];

    await getUsers(ctx, async () => {});

    assert.deepEqual(find.mock.calls[0].arguments, [{ roles: { $in: ["admin", "editor"] } }]);
    assert.deepEqual(ctx.body, { code: 200, data: { list: rows, total: 1, page: 1, limit: 10, hasMore: false } });
  });

  it("searches user names with a regular expression", async (t) => {
    const query = {
      sort() { return this; },
      skip() { return this; },
      limit() { return this; },
      async exec() { return []; },
    };
    const find = t.mock.method(UserModel, "find", () => query as never);
    t.mock.method(UserModel, "countDocuments", async () => 0);
    const ctx = {
      request: { body: undefined },
      query: { page: 1, limit: 10, item: "name", search: "  Alice  " },
    } as unknown as Parameters<typeof getUsers>[0];

    await getUsers(ctx, async () => {});

    assert.deepEqual(find.mock.calls[0].arguments, [{ name: { $regex: /Alice/ } }]);
  });

  it("searches usernames with a regular expression", async (t) => {
    const query = {
      sort() { return this; },
      skip() { return this; },
      limit() { return this; },
      async exec() { return []; },
    };
    const find = t.mock.method(UserModel, "find", () => query as never);
    t.mock.method(UserModel, "countDocuments", async () => 0);
    const ctx = {
      request: { body: undefined },
      query: { page: 1, limit: 10, item: "username", search: "alice@example.com" },
    } as unknown as Parameters<typeof getUsers>[0];

    await getUsers(ctx, async () => {});

    assert.deepEqual(find.mock.calls[0].arguments, [{ username: { $regex: /alice@example.com/ } }]);
  });

  it("filters a non-text field by the supplied search values", async (t) => {
    const query = {
      sort() { return this; },
      skip() { return this; },
      limit() { return this; },
      async exec() { return []; },
    };
    const find = t.mock.method(UserModel, "find", () => query as never);
    t.mock.method(UserModel, "countDocuments", async () => 0);
    const ctx = {
      request: { body: undefined },
      query: { page: 1, limit: 10, item: "status", search: ["1", "0"] },
    } as unknown as Parameters<typeof getUsers>[0];

    await getUsers(ctx, async () => {});

    assert.deepEqual(find.mock.calls[0].arguments, [{ status: ["1", "0"] }]);
  });

  it("updates a user and handles duplicate usernames", async (t) => {
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 } as never));
    const ctx = { request: { body: { _id: userId, status: "1" } } } as unknown as Parameters<typeof updateUser>[0];

    await updateUser(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 200, data: "更新成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [{ _id: userId }, { status: "1" }]);

    const duplicate = Object.assign(new Error("duplicate key"), { code: 11000 });
    t.mock.method(UserModel, "updateOne", async () => { throw duplicate; });
    const duplicateCtx = { request: { body: { _id: userId, username: "taken@example.com" } } } as unknown as Parameters<typeof updateUser>[0];
    await updateUser(duplicateCtx, async () => {});
    assert.deepEqual(duplicateCtx.body, { code: 500, msg: "用户名已存在，请重新输入！" });
  });

  it("reports batch update and deletion outcomes", async (t) => {
    const updateMany = t.mock.method(UserModel, "updateMany", async () => ({ modifiedCount: 1 } as never));
    const settingsCtx = { request: { body: { _ids: [userId], status: "1" } } } as unknown as Parameters<typeof updateUserSettings>[0];
    await updateUserSettings(settingsCtx, async () => {});
    assert.deepEqual(settingsCtx.body, { code: 200, msg: "更新成功", data: { modifiedCount: 1 } });

    const deleteCtx = { request: { body: { _ids: [userId] } } } as unknown as Parameters<typeof deleteUser>[0];
    await deleteUser(deleteCtx, async () => {});
    assert.deepEqual(deleteCtx.body, { code: 200, msg: "删除成功", data: { modifiedCount: 1 } });
    assert.deepEqual(updateMany.mock.calls[1].arguments, [{ _id: { $in: [userId] } }, { isDeleted: 1 }]);

    t.mock.method(UserModel, "updateMany", async () => ({ modifiedCount: 0 } as never));
    const settingsFailure = { request: { body: { _ids: [userId], status: "1" } } } as unknown as Parameters<typeof updateUserSettings>[0];
    await updateUserSettings(settingsFailure, async () => {});
    assert.deepEqual(settingsFailure.body, { code: 500, msg: "没有可更新的用户" });
    const deleteFailure = { request: { body: { _ids: [userId] } } } as unknown as Parameters<typeof deleteUser>[0];
    await deleteUser(deleteFailure, async () => {});
    assert.deepEqual(deleteFailure.body, { code: 500, msg: "没有可删除的用户" });
  });
});
