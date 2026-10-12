import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../src/config";
import UserModel from "../src/model/user";
import { setupApi, validBody } from "./helpers/api";

const { cache, request } = setupApi();

describe("POST /login/login", () => {
  it("rejects invalid request bodies", async () => {
    const response = await request("/login/login", { ...validBody, password: "" });
    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.password);
  });

  it("rejects an incorrect captcha", async () => {
    const response = await request("/login/login", validBody);
    assert.deepEqual(response.body, { code: 401, msg: "图片验证码不正确，请检查" });
  });

  it("rejects an unknown username", async (t) => {
    cache.set(validBody.sid, validBody.code);
    t.mock.method(UserModel, "findOne", async () => null);
    const response = await request("/login/login", validBody);
    assert.deepEqual(response.body, { code: 401, msg: "用户名或密码错误" });
  });

  it("rejects an incorrect password", async (t) => {
    cache.set(validBody.sid, validBody.code);
    const user = new UserModel({ username: validBody.username, password: await bcrypt.hash("another-password", 5) });
    t.mock.method(UserModel, "findOne", async () => user);
    const response = await request("/login/login", validBody);
    assert.deepEqual(response.body, { code: 401, msg: "用户名或密码错误" });
  });

  it("returns a signed token and omits the password on success", async (t) => {
    cache.set(validBody.sid, validBody.code.toLowerCase());
    const user = new UserModel({ username: validBody.username, password: await bcrypt.hash(validBody.password, 5) });
    t.mock.method(UserModel, "findOne", async () => user);
    const response = await request("/login/login", validBody);

    assert.equal(response.body.code, 200);
    assert.equal(response.body.data.username, validBody.username);
    assert.equal(response.body.data.password, undefined);
    const payload = jwt.verify(response.body.data.token, JWT_SECRET) as jwt.JwtPayload;
    assert.equal(payload._id, user._id.toString());
    assert.equal(payload.exp! - payload.iat!, 24 * 60 * 60);
  });
});
