import assert from "node:assert/strict";
import { describe, it } from "node:test";
import bcrypt from "bcrypt";
import "../src/config/dbHelper";
import UserModel from "../src/model/user";
import { setupApi, validBody } from "./helpers/api";

const { cache, request } = setupApi();

describe("POST /login/reg", () => {
  it("reports missing required fields before reading storage", async () => {
    const response = await request("/login/reg", { username: "alice" });
    assert.equal(response.status, 200);
    assert.equal(response.body.code, 400);
    for (const field of ["sid", "code", "password"]) assert.ok(response.body.msg[field]);
  });

  it("rejects an expired or incorrect captcha", async () => {
    const response = await request("/login/reg", validBody);
    assert.equal(response.body.code, 500);
    assert.deepEqual(response.body.msg.code, ["验证码已经失效，请重新获取！"]);
  });

  it("rejects an existing username", async (t) => {
    cache.set(validBody.sid, validBody.code);
    t.mock.method(UserModel, "exists", async () => ({ _id: "existing" }));
    const response = await request("/login/reg", validBody);
    assert.equal(response.body.code, 500);
    assert.deepEqual(response.body.msg.username, ["用户名已存在，请重新输入！"]);
  });

  it("saves a new user with a hashed password", async (t) => {
    cache.set(validBody.sid, validBody.code.toLowerCase());
    t.mock.method(UserModel, "exists", async () => null);
    let savedUser: InstanceType<typeof UserModel> | undefined;
    t.mock.method(UserModel.prototype, "save", async function (this: InstanceType<typeof UserModel>) {
      savedUser = this;
      return this;
    });

    const response = await request("/login/reg", validBody);
    assert.equal(response.body.code, 200);
    assert.equal(response.body.msg, "注册成功");
    assert.equal(response.body.data.username, validBody.username);
    assert.equal(response.body.data.password, undefined);
    assert.ok(savedUser);
    assert.notEqual(savedUser.password, validBody.password);
    assert.equal(await bcrypt.compare(validBody.password, savedUser.password!), true);
  });
});

