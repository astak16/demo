import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import { JWT_SECRET } from "../src/config";
import UserModel from "../src/model/user";
import UserCollectModel from "../src/model/userCollect";
import { setupApi } from "./helpers/api";

const { request, cache } = setupApi();
const user = new UserModel({ username: "alice@example.com", name: "Alice" });
const authHeader = { Authorization: `Bearer ${jwt.sign({ _id: user._id.toString() }, JWT_SECRET)}` };
const postBasic = (body: Record<string, unknown>) => request("/user/basic", body, authHeader);
const postChangePassword = (body: Record<string, unknown>, headers = authHeader) =>
  request("/user/changePassword", body, headers);

describe("POST /user/basic", () => {
  it("requires authentication", async () => {
    const response = await request("/user/basic", {});
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { code: 401, msg: "未登录" });
  });

  it("rejects invalid basic information", async () => {
    const response = await postBasic({ name: "" });
    assert.equal(response.status, 200);
    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.name);
  });

  it("updates ordinary profile fields", async (t) => {
    t.mock.method(UserModel, "findById", async () => user);
    let update: { filter: unknown; fields: unknown } | undefined;
    t.mock.method(UserModel, "updateOne", async (filter: unknown, fields: unknown) => {
      update = { filter, fields };
      return { matchedCount: 1 };
    });
    const response = await postBasic({ name: "New name", location: "Shanghai" });
    assert.equal(response.body.code, 200);
    assert.equal(response.body.msg, "更新基本资料成功");
    assert.match(response.body.data.key, /^[0-9a-f-]{36}$/i);
    assert.deepEqual(update, {
      filter: { _id: user._id.toString() },
      fields: { $set: { name: "New name", location: "Shanghai" } },
    });
  });

  it("reports when the current user no longer exists", async (t) => {
    t.mock.method(UserModel, "findById", async () => null);
    const response = await postBasic({ name: "New name" });
    assert.deepEqual(response.body, { code: 500, msg: "用户不存在" });
  });

  it("rejects a username already used by a password account", async (t) => {
    t.mock.method(UserModel, "findById", async () => user);
    t.mock.method(UserModel, "findOne", async () => new UserModel({ username: "taken@example.com", password: "hash" }));
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await postBasic({ username: "taken@example.com" });
    assert.deepEqual(response.body, { code: 500, msg: "用户名已存在，请重新输入！" });
    assert.equal(update.mock.callCount(), 0);
  });

  it("sends confirmation mail for a changed username", async (t) => {
    t.mock.method(UserModel, "findById", async () => user);
    t.mock.method(UserModel, "findOne", async () => null);
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
    let mail: Record<string, unknown> | undefined;
    t.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async (message: Record<string, unknown>) => {
        mail = message;
        return { messageId: "test-message" };
      },
    }));
    const response = await postBasic({ username: "new@example.com" });
    assert.equal(response.body.code, 200);
    assert.equal(response.body.msg, "更新基本资料成功，账号修改需要邮件确认，请查收邮件！");
    assert.equal(mail?.to, "new@example.com");
    assert.match(String(mail?.html), /Alice/);
    assert.equal(cache.size, 1);
    const token = cache.get(response.body.data.key)!;
    assert.equal((jwt.verify(token, JWT_SECRET) as jwt.JwtPayload)._id, user._id.toString());
    assert.equal(update.mock.callCount(), 0);
  });

  it("uses the new username in mail when the account has no display name", async (t) => {
    const unnamedUser = new UserModel({ username: "old@example.com" });
    t.mock.method(UserModel, "findById", async () => unnamedUser);
    t.mock.method(UserModel, "findOne", async () => new UserModel({ username: "new@example.com" }));
    let mail: Record<string, unknown> | undefined;
    t.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async (message: Record<string, unknown>) => {
        mail = message;
        return { messageId: "test-message" };
      },
    }));
    const response = await postBasic({ username: "new@example.com" });
    assert.equal(response.body.code, 200);
    assert.match(String(mail?.html), /new@example.com/);
  });

  it("does not update profile fields when confirmation mail fails", async (t) => {
    t.mock.method(UserModel, "findById", async () => user);
    t.mock.method(UserModel, "findOne", async () => null);
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
    t.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async () => { throw new Error("SMTP unavailable"); },
    }));
    const response = await postBasic({ username: "new@example.com", name: "New name" });
    assert.deepEqual(response.body, { code: 500, msg: "确认邮件发送失败，请稍后再试" });
    assert.equal(update.mock.callCount(), 0);
  });

  it("updates other fields while deferring a changed username", async (t) => {
    t.mock.method(UserModel, "findById", async () => user);
    t.mock.method(UserModel, "findOne", async () => null);
    let fields: unknown;
    t.mock.method(UserModel, "updateOne", async (_filter: unknown, update: unknown) => {
      fields = update;
      return { matchedCount: 1 };
    });
    t.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async () => ({ messageId: "test-message" }),
    }));
    const response = await postBasic({ username: "new@example.com", name: "New name" });
    assert.equal(response.body.code, 200);
    assert.deepEqual(fields, { $set: { name: "New name" } });
  });

  it("reports when no record was updated", async (t) => {
    t.mock.method(UserModel, "findById", async () => user);
    t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 0 }));
    const response = await postBasic({ name: "New name" });
    assert.deepEqual(response.body, { code: 500, msg: "更新基本资料失败" });
  });
});

describe("POST /user/changePassword", () => {
  const passwordBody = { oldpwd: "old-secret", newpwd: "new-secret" };

  it("requires authentication", async () => {
    const response = await request("/user/changePassword", passwordBody);
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { code: 401, msg: "未登录" });
  });

  it("validates both passwords", async () => {
    const response = await postChangePassword({ oldpwd: "", newpwd: "" });
    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.oldpwd);
    assert.ok(response.body.msg.newpwd);
  });

  it("rejects a token without a user ID", async () => {
    const headers = { Authorization: `Bearer ${jwt.sign({}, JWT_SECRET)}` };
    const response = await postChangePassword(passwordBody, headers);
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { code: 401, msg: "未登录" });
  });

  it("rejects when the user no longer exists", async (t) => {
    t.mock.method(UserModel, "findOne", async () => null);
    const response = await postChangePassword(passwordBody);
    assert.deepEqual(response.body, { code: 500, msg: "原密码错误" });
  });

  it("rejects an account without a password", async (t) => {
    t.mock.method(UserModel, "findOne", async () => user);
    const response = await postChangePassword(passwordBody);
    assert.deepEqual(response.body, { code: 500, msg: "原密码错误" });
  });

  it("rejects an incorrect old password", async (t) => {
    const passwordUser = new UserModel({ password: await bcrypt.hash("different-secret", 5) });
    t.mock.method(UserModel, "findOne", async () => passwordUser);
    const response = await postChangePassword(passwordBody);
    assert.deepEqual(response.body, { code: 500, msg: "原密码错误" });
  });

  it("rejects a new password identical to the old one", async (t) => {
    const passwordUser = new UserModel({ password: await bcrypt.hash(passwordBody.oldpwd, 5) });
    t.mock.method(UserModel, "findOne", async () => passwordUser);
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await postChangePassword({ oldpwd: passwordBody.oldpwd, newpwd: passwordBody.oldpwd });
    assert.deepEqual(response.body, { code: 500, msg: "新密码不能与原密码相同" });
    assert.equal(update.mock.callCount(), 0);
  });

  it("writes a hash of the new password", async (t) => {
    const passwordUser = new UserModel({ password: await bcrypt.hash(passwordBody.oldpwd, 5) });
    t.mock.method(UserModel, "findOne", async () => passwordUser);
    let update: { filter: unknown; fields: { $set: { password: string } } } | undefined;
    t.mock.method(UserModel, "updateOne", async (filter: unknown, fields: { $set: { password: string } }) => {
      update = { filter, fields };
      return { matchedCount: 1 };
    });
    const response = await postChangePassword(passwordBody);
    assert.deepEqual(response.body, { code: 200, msg: "密码更新成功" });
    assert.deepEqual(update?.filter, { _id: passwordUser._id });
    assert.notEqual(update?.fields.$set.password, passwordBody.newpwd);
    assert.equal(await bcrypt.compare(passwordBody.newpwd, update!.fields.$set.password), true);
  });
});

describe("POST /user/setCollect", () => {
  const body = { tid: "post-1", title: "A post" };

  it("validates the collection request", async (t) => {
    const update = t.mock.method(UserCollectModel, "updateOne", async () => ({}));
    const response = await request("/user/setCollect", { tid: "", title: "", isFav: 2 }, authHeader);
    assert.equal(response.body.code, 400);
    for (const field of ["tid", "title", "isFav"]) assert.ok(response.body.msg[field]);
    assert.equal(update.mock.callCount(), 0);
  });

  it("cancels an existing collection", async (t) => {
    const remove = t.mock.method(UserCollectModel, "deleteOne", async () => ({ deletedCount: 1 }));
    const response = await request("/user/setCollect", { ...body, isFav: 1 }, authHeader);
    assert.deepEqual(response.body, { code: 200, msg: "取消收藏成功", data: { isCollect: 0 } });
    assert.deepEqual(remove.mock.calls[0].arguments, [{ uid: user._id.toString(), tid: body.tid }]);
  });

  it("adds a collection with upsert", async (t) => {
    const update = t.mock.method(UserCollectModel, "updateOne", async () => ({ modifiedCount: 1 }));
    const response = await request("/user/setCollect", { ...body, isFav: 0 }, authHeader);
    assert.deepEqual(response.body, { code: 200, msg: "收藏成功", data: { isCollect: 1 } });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { uid: user._id.toString(), tid: body.tid },
      { $setOnInsert: { title: body.title } },
      { upsert: true },
    ]);
  });
});

describe("GET /user/collect", () => {
  it("validates pagination", async (t) => {
    const find = t.mock.method(UserCollectModel, "find", () => { throw new Error("should not query"); });
    const response = await request("/user/collect?page=-1&limit=0", undefined, authHeader);
    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.page);
    assert.ok(response.body.msg.limit);
    assert.equal(find.mock.callCount(), 0);
  });

  it("returns the requested page and total", async (t) => {
    const list = [{ tid: "post-2", title: "Another post" }];
    const calls: { filter?: unknown; sort?: unknown; skip?: number; limit?: number; select?: string } = {};
    const query = {
      sort(value: unknown) { calls.sort = value; return this; },
      skip(value: number) { calls.skip = value; return this; },
      limit(value: number) { calls.limit = value; return this; },
      select(value: string) { calls.select = value; return this; },
      async lean() { return list; },
    };
    t.mock.method(UserCollectModel, "find", (filter: unknown) => { calls.filter = filter; return query; });
    const count = t.mock.method(UserCollectModel, "countDocuments", async () => 5);
    const response = await request("/user/collect?page=1&limit=2", undefined, authHeader);
    assert.deepEqual(response.body, { code: 200, data: { list, total: 5, hasMore: true } });
    assert.deepEqual(calls, {
      filter: { uid: user._id.toString() },
      sort: { _id: -1, created: -1 },
      skip: 2,
      limit: 2,
      select: "tid title created",
    });
    assert.deepEqual(count.mock.calls[0].arguments, [{ uid: user._id.toString() }]);
  });
});
