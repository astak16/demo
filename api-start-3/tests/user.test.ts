import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import { JWT_SECRET } from "../src/config";
import UserModel from "../src/model/user";
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
    t.mock.method(UserModel, "findOne", async () => user);
    let update: { filter: unknown; fields: unknown } | undefined;
    t.mock.method(UserModel, "updateOne", async (filter: unknown, fields: unknown) => {
      update = { filter, fields };
      return { matchedCount: 1 };
    });
    const response = await postBasic({ name: "New name", location: "Shanghai" });
    assert.deepEqual(response.body, { code: 200, msg: "更新基本资料成功" });
    assert.deepEqual(update, {
      filter: { _id: user._id.toString() },
      fields: { name: "New name", location: "Shanghai" },
    });
  });

  it("rejects a username already used by a password account", async (t) => {
    t.mock.method(UserModel, "findOne", async (filter: Record<string, unknown>) =>
      "_id" in filter ? user : new UserModel({ username: "taken@example.com", password: "hash" }));
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await postBasic({ username: "taken@example.com" });
    assert.deepEqual(response.body, { code: 500, msg: "用户名已存在，请重新输入！" });
    assert.equal(update.mock.callCount(), 0);
  });

  it("sends confirmation mail for a changed username", async (t) => {
    t.mock.method(UserModel, "findOne", async (filter: Record<string, unknown>) =>
      "_id" in filter ? user : null);
    t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
    let mail: Record<string, unknown> | undefined;
    t.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async (message: Record<string, unknown>) => {
        mail = message;
        return { messageId: "test-message" };
      },
    }));
    const response = await postBasic({ username: "new@example.com" });
    assert.deepEqual(response.body, { code: 200, msg: "更新基本资料成功，账号修改需要邮件确认，请查收邮件！" });
    assert.equal(mail?.to, "new@example.com");
    assert.match(String(mail?.html), /Alice/);
    assert.equal(cache.size, 1);
    const token = [...cache.values()][0];
    assert.equal((jwt.verify(token, JWT_SECRET) as jwt.JwtPayload)._id, user._id.toString());
  });

  it("uses the new username in mail when the account has no display name", async (t) => {
    const unnamedUser = new UserModel({ username: "old@example.com" });
    t.mock.method(UserModel, "findOne", async (filter: Record<string, unknown>) =>
      "_id" in filter ? unnamedUser : new UserModel({ username: "new@example.com" }));
    t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
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

  it("reports when no record was updated", async (t) => {
    t.mock.method(UserModel, "findOne", async () => user);
    t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 0 }));
    const response = await postBasic({ username: user.username });
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
