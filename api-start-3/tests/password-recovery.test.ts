import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { JWT_SECRET } from "../src/config";
import UserModel from "../src/model/user";
import { setupApi, validBody } from "./helpers/api";

const { cache, savedExpirations, request } = setupApi();
const resetBody = { sid: validBody.sid, code: validBody.code, key: "reset-key", password: "new-secret" };

describe("POST /login/forget", () => {
  it("validates the username", async () => {
    const response = await request("/login/forget", {});
    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.username);
  });

  it("reports an unknown username", async (t) => {
    t.mock.method(UserModel, "findOne", async () => null);
    const response = await request("/login/forget", { username: validBody.username });
    assert.deepEqual(response.body, { code: 500, msg: "用户名不存在" });
  });

  it("stores a 30-minute reset token and sends an email", async (t) => {
    const user = new UserModel({ username: validBody.username, name: "Alice" });
    t.mock.method(UserModel, "findOne", async () => user);
    let mail: Record<string, unknown> | undefined;
    t.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async (message: Record<string, unknown>) => {
        mail = message;
        return { messageId: "test-message" };
      },
    }));

    const response = await request("/login/forget", { username: validBody.username });
    assert.equal(response.body.code, 200);
    assert.equal(response.body.msg, "邮件发送成功");
    const { key } = response.body.data;
    assert.match(key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(savedExpirations.get(key), 30 * 60);
    const payload = jwt.verify(cache.get(key)!, JWT_SECRET) as jwt.JwtPayload;
    assert.equal(payload._id, user._id.toString());
    assert.equal(payload.exp! - payload.iat!, 30 * 60);
    assert.equal(mail?.to, validBody.username);
    assert.match(String(mail?.html), /Alice/);
  });

  it("reports an email delivery failure", async (t) => {
    t.mock.method(UserModel, "findOne", async () => new UserModel({ username: validBody.username }));
    t.mock.method(nodemailer, "createTransport", () => ({
      sendMail: async () => { throw new Error("SMTP unavailable"); },
    }));
    const response = await request("/login/forget", { username: validBody.username });
    assert.deepEqual(response.body, { code: 500, msg: "邮件发送失败" });
  });
});

describe("POST /login/reset", () => {
  it("validates required fields", async () => {
    const response = await request("/login/reset", {});
    assert.equal(response.body.code, 400);
    for (const field of ["sid", "code", "key", "password"]) assert.ok(response.body.msg[field]);
  });

  it("rejects an incorrect captcha", async () => {
    const response = await request("/login/reset", resetBody);
    assert.deepEqual(response.body, { code: 500, msg: "验证码不正确，请检查" });
  });

  it("rejects an expired reset link", async () => {
    cache.set(resetBody.sid, resetBody.code);
    const response = await request("/login/reset", resetBody);
    assert.deepEqual(response.body, { code: 500, msg: "链接已经失效" });
  });

  it("reports when the reset token references a missing user", async (t) => {
    cache.set(resetBody.sid, resetBody.code);
    cache.set(resetBody.key, jwt.sign({ _id: "missing-user" }, JWT_SECRET));
    t.mock.method(UserModel, "findByIdAndUpdate", async () => null);
    const response = await request("/login/reset", resetBody);
    assert.deepEqual(response.body, { code: 500, msg: "用户不存在" });
  });

  it("updates the password with a hash for a valid reset link", async (t) => {
    const user = new UserModel({ username: validBody.username });
    cache.set(resetBody.sid, resetBody.code.toLowerCase());
    cache.set(resetBody.key, jwt.sign({ _id: user._id.toString() }, JWT_SECRET));
    let update: { id: unknown; password: string; options: unknown } | undefined;
    t.mock.method(UserModel, "findByIdAndUpdate", async (id: unknown, fields: { password: string }, options: unknown) => {
      update = { id, password: fields.password, options };
      return user;
    });

    const response = await request("/login/reset", resetBody);
    assert.deepEqual(response.body, { code: 200, msg: "密码重置成功" });
    assert.equal(update?.id, user._id.toString());
    assert.deepEqual(update?.options, { new: true });
    assert.notEqual(update?.password, resetBody.password);
    assert.equal(await bcrypt.compare(resetBody.password, update!.password), true);
  });
});
