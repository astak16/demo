import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../src/config";
import UserModel from "../src/model/user";
import { setupApi } from "./helpers/api";

const { cache, savedExpirations, request } = setupApi();

describe("GET /public/getCaptcha", () => {
  it("returns a captcha and stores its code with a ten minute expiry", async () => {
    const response = await request("/public/getCaptcha");

    assert.equal(response.status, 200);
    assert.equal(response.body.code, 200);
    assert.match(response.body.data.sid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(response.body.data.text.length, 4);
    assert.equal(cache.get(response.body.data.sid), response.body.data.text);
    assert.equal(savedExpirations.get(response.body.data.sid), 600);
  });

});

describe("POST /public/resetEmail", () => {
  it("validates the confirmation request", async () => {
    const response = await request("/public/resetEmail", {});
    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.key);
    assert.ok(response.body.msg.username);
  });

  it("updates the username identified by the confirmation token", async (t) => {
    cache.set("confirmation-key", jwt.sign({ _id: "user-id" }, JWT_SECRET));
    let update: { filter: unknown; fields: unknown } | undefined;
    t.mock.method(UserModel, "updateOne", async (filter: unknown, fields: unknown) => {
      update = { filter, fields };
      return { matchedCount: 1 };
    });
    const response = await request("/public/resetEmail", { key: "confirmation-key", username: "new@example.com" });
    assert.deepEqual(response.body, { code: 200, msg: "更新用户名成功" });
    assert.deepEqual(update, {
      filter: { _id: "user-id" },
      fields: { $set: { username: "new@example.com" } },
    });
  });
});
