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
  tags: ["6ad49f2efaeec26fb582e893"],
  fav: 0,
  sid: "post-captcha",
  code: "AbCd",
};
const post = (body: Record<string, unknown>, headers = authHeader) => request("/content/add", body, headers);
const validEdit = {
  _id: "507f1f77bcf86cd799439011",
  title: "Updated article",
  content: "Updated body",
  sid: validPost.sid,
  code: validPost.code,
};
const edit = (body: Record<string, unknown>, headers = authHeader) => request("/content/update", body, headers);

describe("GET /content/getPosts", () => {
  it("validates pagination before querying posts", async (t) => {
    const find = t.mock.method(PostModel, "find", () => { throw new Error("should not query"); });
    const response = await request("/content/getPosts?page=-1&limit=0", undefined, authHeader);
    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.page);
    assert.ok(response.body.msg.limit);
    assert.equal(find.mock.callCount(), 0);
  });

  it("returns a page of posts with populated tags", async (t) => {
    const tags = [{ _id: "6ad49f2efaeec26fb582e893", tagName: "TypeScript", tagClass: "language" }];
    const list = [{ _id: validEdit._id, title: "A post", tags }];
    const calls: { filter?: unknown; sort?: unknown; skip?: number; limit?: number; populate?: unknown } = {};
    const query = {
      sort(value: unknown) { calls.sort = value; return this; },
      skip(value: number) { calls.skip = value; return this; },
      limit(value: number) { calls.limit = value; return this; },
      populate(value: unknown) { calls.populate = value; return this; },
      async lean() { return list; },
    };
    t.mock.method(PostModel, "find", (filter: unknown) => { calls.filter = filter; return query; });
    const count = t.mock.method(PostModel, "countDocuments", async () => 3);

    const response = await request("/content/getPosts?page=1&limit=2", undefined, authHeader);
    assert.deepEqual(response.body, { code: 200, data: { list, total: 3, page: 1, limit: 2, hasMore: false } });
    assert.deepEqual(calls, {
      filter: {}, sort: { created: -1, _id: -1 }, skip: 2, limit: 2,
      populate: { path: "tags", select: "tagName tagClass isDeleted", options: { includeDeleted: true } },
    });
    assert.deepEqual(count.mock.calls[0].arguments, [{}]);
  });
});

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
    for (const field of ["title", "catalog", "content", "tags", "fav", "sid", "code"]) {
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
      tags: validPost.tags,
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

describe("POST /content/delete", () => {
  it("marks the current user's active post as deleted", async (t) => {
    const update = t.mock.method(PostModel, "updateMany", async () => ({ modifiedCount: 1 }));
    const response = await request("/content/delete", { _ids: [validEdit._id] }, authHeader);
    assert.deepEqual(response.body, { code: 200, msg: "删除成功", data: { modifiedCount: 1 } });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: { $in: [validEdit._id] }, uid, isEnd: "0", isDeleted: 0 },
      { $set: { isDeleted: 1 } },
    ]);
  });

  it("reports when no eligible post was deleted", async (t) => {
    t.mock.method(PostModel, "updateMany", async () => ({ modifiedCount: 0 }));
    const response = await request("/content/delete", { _ids: [validEdit._id] }, authHeader);
    assert.deepEqual(response.body, { code: 500, msg: "没有可删除的文章" });
  });
});

describe("POST /content/update", () => {
  it("requires authentication", async () => {
    const response = await request("/content/update", validEdit);
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { code: 401, msg: "未登录" });
  });

  it("validates required fields before looking up the post", async (t) => {
    const lookup = t.mock.method(PostModel, "findById", () => { throw new Error("should not query"); });
    const response = await edit({ _id: "", title: "", content: "" });
    assert.equal(response.status, 200);
    assert.equal(response.body.code, 400);
    for (const field of ["_id", "title", "content", "sid", "code"]) {
      assert.ok(response.body.msg[field], field);
    }
    assert.equal(lookup.mock.callCount(), 0);
  });

  it("rejects a missing or incorrect captcha without looking up the post", async (t) => {
    const lookup = t.mock.method(PostModel, "findById", () => { throw new Error("should not query"); });
    for (const captcha of [undefined, "wrong"]) {
      if (captcha) cache.set(validEdit.sid, captcha);
      const response = await edit(validEdit);
      assert.deepEqual(response.body, { code: 500, msg: "验证码错误，修改文章失败" });
    }
    assert.equal(lookup.mock.callCount(), 0);
  });

  it("reports when the post does not exist", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    const lookup = t.mock.method(PostModel, "findById", () => ({
      select: () => ({ lean: async () => null }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await edit(validEdit);
    assert.deepEqual(response.body, { code: 500, msg: "文章不存在" });
    assert.deepEqual(lookup.mock.calls[0].arguments, [validEdit._id]);
    assert.equal(update.mock.callCount(), 0);
  });

  it("rejects edits by another user", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    t.mock.method(PostModel, "findById", () => ({
      select: () => ({ lean: async () => ({ uid: "another-user", isEnd: "0" }) }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await edit(validEdit);
    assert.deepEqual(response.body, { code: 500, msg: "没有操作权限" });
    assert.equal(update.mock.callCount(), 0);
  });

  it("rejects edits to a finished post", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    t.mock.method(PostModel, "findById", () => ({
      select: () => ({ lean: async () => ({ uid, isEnd: "1" }) }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await edit(validEdit);
    assert.deepEqual(response.body, { code: 500, msg: "文章已结束，无法编辑" });
    assert.equal(update.mock.callCount(), 0);
  });

  it("reports a post changed since it was looked up", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    t.mock.method(PostModel, "findById", () => ({
      select: () => ({ lean: async () => ({ uid, isEnd: "0" }) }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 0 }));
    const response = await edit(validEdit);
    assert.deepEqual(response.body, { code: 500, msg: "文章不存在、已结束或没有操作权限" });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: validEdit._id, uid, isEnd: "0" },
      { $set: { title: validEdit.title, content: validEdit.content } },
    ]);
  });

  it("updates only editable fields for the author", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    t.mock.method(PostModel, "findById", () => ({
      select: () => ({ lean: async () => ({ uid, isEnd: "0" }) }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await edit({ ...validEdit, uid: "another-user", isEnd: "1", fav: 100 });
    assert.deepEqual(response.body, { code: 200, data: { _id: validEdit._id }, msg: "更新帖子成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: validEdit._id, uid, isEnd: "0" },
      { $set: { title: validEdit.title, content: validEdit.content } },
    ]);
  });

  it("updates the catalog through /content/updateId", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    t.mock.method(PostModel, "findById", () => ({
      select: () => ({ lean: async () => ({ uid, isEnd: "0" }) }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await request("/content/updateId", { ...validEdit, catalog: "后端" }, authHeader);
    assert.deepEqual(response.body, { code: 200, data: { _id: validEdit._id }, msg: "更新帖子成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: validEdit._id, uid, isEnd: "0" },
      { $set: { title: validEdit.title, content: validEdit.content, catalog: "后端" } },
    ]);
  });

  it("rejects non-ObjectId tag references through /content/updateId", async (t) => {
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await request("/content/updateId", { ...validEdit, tags: ["not-an-id"] }, authHeader);
    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.tags);
    assert.equal(update.mock.callCount(), 0);
  });

  it("updates tag references through /content/updateId", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    t.mock.method(PostModel, "findById", () => ({
      select: () => ({ lean: async () => ({ uid, isEnd: "0" }) }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const tags = ["507f1f77bcf86cd799439012"];
    const response = await request("/content/updateId", { ...validEdit, tags }, authHeader);
    assert.equal(response.body.code, 200);
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: validEdit._id, uid, isEnd: "0" },
      { $set: { title: validEdit.title, content: validEdit.content, tags } },
    ]);
  });
});
