import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../src/config";
import { addPost } from "../src/controller/content";
import PostModel from "../src/model/post";
import UserModel from "../src/model/user";
import { setupApi } from "./helpers/api";

const { cache, request } = setupApi();
const uid = new UserModel()._id.toString();
const authHeader = { Authorization: `Bearer ${jwt.sign({ _id: uid }, JWT_SECRET)}` };
const validPost = {
  title: "Test article",
  catalog: "news",
  content: "Article body",
  fav: 0,
  sid: "post-captcha",
  code: "AbCd",
};
const post = (body: Record<string, unknown>, headers = authHeader) => request("/content/add", body, headers);

describe("POST /content/add", () => {
  it("requires authentication", async () => {
    const response = await request("/content/add", validPost);
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { code: 401, msg: "未登录" });
  });

  it("reports missing and invalid fields before writing", async (t) => {
    const create = t.mock.method(PostModel, "create", async () => ({}));
    const response = await post({ title: "", catalog: "", content: "", fav: -1 });
    assert.equal(response.status, 200);
    assert.equal(response.body.code, 400);
    for (const field of ["title", "catalog", "content", "fav", "sid", "code"]) {
      assert.ok(response.body.msg[field], field);
    }
    assert.equal(create.mock.callCount(), 0);
  });

  it("rejects noninteger and out of range rewards", async () => {
    for (const fav of [1.5, 101]) {
      const response = await post({ ...validPost, fav });
      assert.equal(response.body.code, 400);
      assert.ok(response.body.msg.fav);
    }
  });

  it("rejects a missing or incorrect captcha without saving", async (t) => {
    const create = t.mock.method(PostModel, "create", async () => ({}));
    for (const captcha of [undefined, "wrong"]) {
      if (captcha) cache.set(validPost.sid, captcha);
      const response = await post(validPost);
      assert.deepEqual(response.body, { code: 500, msg: "验证码错误，发布文章失败" });
    }
    assert.equal(create.mock.callCount(), 0);
  });

  it("publishes without spending points when fav is zero", async (t) => {
    cache.set(validPost.sid, "abcd");
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
    const create = t.mock.method(PostModel, "create", async () => ({ _id: "post-id" }));
    const response = await post(validPost);
    assert.deepEqual(response.body, { code: 200, data: { _id: "post-id" }, msg: "文章发布成功" });
    assert.equal(update.mock.callCount(), 0);
    assert.deepEqual(create.mock.calls[0].arguments[0], {
      title: validPost.title,
      catalog: validPost.catalog,
      content: validPost.content,
      fav: 0,
      uid,
    });
  });

  it("rejects a post when the user has insufficient points", async (t) => {
    cache.set(validPost.sid, validPost.code);
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 0 }));
    const create = t.mock.method(PostModel, "create", async () => ({ _id: "post-id" }));
    const response = await post({ ...validPost, fav: 5 });
    assert.deepEqual(response.body, { code: 400, msg: "积分不足，发布失败" });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: uid, favs: { $gte: 5 } },
      { $inc: { favs: -5 } },
    ]);
    assert.equal(create.mock.callCount(), 0);
  });

  it("spends points and publishes a rewarded post", async (t) => {
    cache.set(validPost.sid, validPost.code);
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
    const create = t.mock.method(PostModel, "create", async () => ({ _id: "post-id" }));
    const response = await post({ ...validPost, fav: 5 });
    assert.deepEqual(response.body, { code: 200, data: { _id: "post-id" }, msg: "文章发布成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: uid, favs: { $gte: 5 } },
      { $inc: { favs: -5 } },
    ]);
    assert.equal(create.mock.calls[0].arguments[0].fav, 5);
  });

  it("refunds points when saving the post fails", async (t) => {
    cache.set(validPost.sid, validPost.code);
    const update = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));
    const failure = new Error("database unavailable");
    t.mock.method(PostModel, "create", async () => { throw failure; });
    const ctx = {
      request: { body: { ...validPost, fav: 5 } },
      state: { user: { _id: uid } },
    } as unknown as Parameters<typeof addPost>[0];

    await assert.rejects(addPost(ctx, async () => {}), failure);
    assert.deepEqual(update.mock.calls.map((call) => call.arguments), [
      [{ _id: uid, favs: { $gte: 5 } }, { $inc: { favs: -5 } }],
      [{ _id: uid }, { $inc: { favs: 5 } }],
    ]);
  });
});
