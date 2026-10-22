import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import "../src/config/dbHelper";
import { JWT_SECRET } from "../src/config";
import { addPost } from "../src/controller/content";
import LinkModel from "../src/model/link";
import PostModel from "../src/model/post";
import PostHistory from "../src/model/postHistory";
import PostTagModel from "../src/model/postTag";
import UserCollectModel from "../src/model/userCollect";
import UserModel from "../src/model/user";
import { setupApi } from "./helpers/api";

const { cache, request } = setupApi();
const uid = new UserModel()._id.toString();
const authHeader = { Authorization: `Bearer ${jwt.sign({ _id: uid }, JWT_SECRET)}` };
const validPost = {
  title: "Test article",
  catalog: "news",
  content: "Article body",
  tags: ["docker"],
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

describe("GET /public/links and /public/tips", () => {
  it("returns link titles and URLs without IDs", async (t) => {
    const filters: Record<string, unknown>[] = [];
    const projections: Record<string, unknown>[] = [];
    t.mock.method(LinkModel.collection, "find", (filter: Record<string, unknown>, options: Record<string, any>) => {
      filters.push(filter);
      projections.push(options.projection);
      return { toArray: async () => [{ title: "Project site", link: "https://example.com" }] };
    });

    const response = await request("/public/links");

    assert.equal(response.body.code, 200);
    assert.deepEqual(response.body.data, [{ title: "Project site", link: "https://example.com" }]);
    assert.equal(filters[0].type, "link");
    assert.deepEqual(projections[0], { title: 1, link: 1, _id: 0 });
  });

  it("returns tip titles without IDs or links", async (t) => {
    const filters: Record<string, unknown>[] = [];
    const projections: Record<string, unknown>[] = [];
    t.mock.method(LinkModel.collection, "find", (filter: Record<string, unknown>, options: Record<string, any>) => {
      filters.push(filter);
      projections.push(options.projection);
      return { toArray: async () => [{ title: "Tip of the day" }] };
    });

    const response = await request("/public/tips");

    assert.equal(response.body.code, 200);
    assert.deepEqual(response.body.data, [{ title: "Tip of the day" }]);
    assert.equal(filters[0].type, "tip");
    assert.deepEqual(projections[0], { title: 1, _id: 0 });
  });
});

describe("GET /public/topWeek", () => {
  it("returns the posts from the weekly ranking", async (t) => {
    const posts = [{ _id: "post-1", title: "Popular post", answer: 12 }];
    const getTopWeek = t.mock.method(PostModel, "getTopWeek", async () => posts);

    const response = await request("/public/topWeek");

    assert.deepEqual(response.body, { code: 200, data: posts });
    assert.equal(getTopWeek.mock.callCount(), 1);
  });
});

describe("GET /public/content/detail", () => {
  it("returns the incremented post, author, and favorite status", async (t) => {
    const postId = new mongoose.Types.ObjectId();
    const updatedPost = {
      _id: postId,
      toJSON: () => ({
        _id: postId.toString(),
        title: "Updated title",
        reads: 9,
        uname: "Alice",
        tags: [{ _id: "frontEnd", tagName: "前端", isDeleted: 1 }],
      }),
    };
    const populateOptions: Record<string, unknown>[] = [];
    const update = t.mock.method(PostModel, "findByIdAndUpdate", (id: unknown, update: unknown, options: unknown) => ({
      populate: async (selection: Record<string, unknown>) => {
        populateOptions.push(selection);
        return updatedPost;
      },
    }) as any);
    const exists = t.mock.method(UserCollectModel, "exists", async () => ({ _id: "collect-id" } as any));
    const history = t.mock.method(PostHistory, "addOrUpdateVisitHistory", async () => ({} as any));

    const response = await request(`/public/content/detail?_id=${postId}`, undefined, authHeader);

    assert.deepEqual(response.body, {
      code: 200,
      data: {
        _id: postId.toString(),
        title: "Updated title",
        reads: 9,
        uname: "Alice",
        tags: [{ _id: "frontEnd", tagName: "前端", isDeleted: 1 }],
        isFav: 1,
      },
      msg: "查询文章详情成功",
    });
    assert.deepEqual(update.mock.calls[0].arguments, [postId.toString(), { $inc: { reads: 1 } }, { new: true }]);
    assert.deepEqual(populateOptions, [
      [
        { path: "uid", select: "name" },
        { path: "tags", select: "tagName isDeleted", options: { includeDeleted: true } },
      ],
    ]);
    assert.deepEqual(exists.mock.calls[0].arguments, [{ uid, tid: postId.toString() }]);
    assert.deepEqual(history.mock.calls[0].arguments, [postId.toString(), uid]);
  });

  it("returns isFav zero when the logged-in user has not collected the post", async (t) => {
    const postId = new mongoose.Types.ObjectId();
    const updatedPost = {
      _id: postId,
      toJSON: () => ({ _id: postId.toString(), title: "Uncollected post", reads: 1 }),
    };
    t.mock.method(PostModel, "findByIdAndUpdate", () => ({ populate: async () => updatedPost }) as any);
    t.mock.method(UserCollectModel, "exists", async () => null);
    t.mock.method(PostHistory, "addOrUpdateVisitHistory", async () => ({} as any));

    const response = await request(`/public/content/detail?_id=${postId}`, undefined, authHeader);

    assert.equal(response.body.data.isFav, 0);
  });

  it("returns isFav zero for an unauthenticated visitor", async (t) => {
    const postId = new mongoose.Types.ObjectId();
    const updatedPost = {
      _id: postId,
      toJSON: () => ({ _id: postId.toString(), title: "Public post", reads: 1 }),
    };
    t.mock.method(PostModel, "findByIdAndUpdate", () => ({ populate: async () => updatedPost }) as any);
    const exists = t.mock.method(UserCollectModel, "exists", async () => null);
    const history = t.mock.method(PostHistory, "addOrUpdateVisitHistory", async () => ({} as any));

    const response = await request(`/public/content/detail?_id=${postId}`);

    assert.equal(response.body.data.isFav, 0);
    assert.equal(exists.mock.callCount(), 0);
    assert.equal(history.mock.callCount(), 0);
  });

  it("reports a missing post", async (t) => {
    const postId = new mongoose.Types.ObjectId();
    t.mock.method(PostModel, "findByIdAndUpdate", () => ({ populate: async () => null }) as any);

    const response = await request(`/public/content/detail?_id=${postId}`);

    assert.deepEqual(response.body, { code: 200, msg: "文章不存在" });
  });
});

describe("GET /public/list", () => {
  it("paginates posts and includes deleted populated tags", async (t) => {
    const postId = new mongoose.Types.ObjectId();
    const tagFilters: Record<string, unknown>[] = [];
    t.mock.method(PostModel.collection, "find", () => ({
      toArray: async () => [{ _id: postId, title: "Docker post", tags: ["docker"], isDeleted: 0 }],
    }));
    t.mock.method(PostModel.collection, "countDocuments", async () => 2);
    t.mock.method(PostTagModel.collection, "find", (filter: Record<string, unknown>) => {
      tagFilters.push(filter);
      return { toArray: async () => [{ _id: "docker", tagName: "容器", isDeleted: 1 }] };
    });

    const response = await request("/public/list?page=1&limit=1");
    assert.equal(response.status, 200);
    assert.equal(response.body.code, 200);
    assert.equal(response.body.data.total, 2);
    assert.equal(response.body.data.page, 1);
    assert.equal(response.body.data.hasMore, true);
    assert.equal(response.body.data.list[0]._id, postId.toString());
    assert.deepEqual(response.body.data.list[0].tags, [{ _id: "docker", tagName: "容器", isDeleted: 1 }]);
    assert.equal("isDeleted" in response.body.data.list[0], false);
    assert.equal("isDeleted" in tagFilters[0], false);
  });

  it("filters posts using tag IDs that exist in the tag collection", async (t) => {
    const postId = new mongoose.Types.ObjectId();
    const postFilters: Record<string, any>[] = [];
    const tagLookups: Record<string, any>[] = [];
    t.mock.method(PostTagModel.collection, "find", (filter: Record<string, any>) => {
      tagLookups.push(filter);
      return {
        toArray: async () => [{ _id: "koa", tagName: "Koa", isDeleted: 0 }],
      };
    });
    t.mock.method(PostModel.collection, "find", (filter: Record<string, any>) => {
      postFilters.push(filter);
      return { toArray: async () => [{ _id: postId, title: "Koa post", tags: ["koa"], isDeleted: 0 }] };
    });
    t.mock.method(PostModel.collection, "countDocuments", async () => 1);

    const response = await request(
      "/public/list?page=1&title=Koa&catalog=news&isTop=1&isEnd=0&status=1&tags=koa&tags=b33",
    );

    assert.equal(response.body.code, 200);
    assert.deepEqual(tagLookups[0]._id.$in, ["koa", "b33"]);
    assert.deepEqual(postFilters[0], {
      title: { $regex: "Koa" },
      catalog: "news",
      isTop: "1",
      isEnd: "0",
      status: "1",
      tags: { $in: ["koa"] },
      isDeleted: { $in: [0, null] },
    });
    assert.equal(response.body.data.list[0]._id, postId.toString());
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
      select: async () => null,
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
      select: async () => ({ uid: "another-user", isEnd: "0" }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await edit(validEdit);
    assert.deepEqual(response.body, { code: 500, msg: "没有操作权限" });
    assert.equal(update.mock.callCount(), 0);
  });

  it("rejects edits to a finished post", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    t.mock.method(PostModel, "findById", () => ({
      select: async () => ({ uid, isEnd: "1" }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await edit(validEdit);
    assert.deepEqual(response.body, { code: 500, msg: "文章已结束，无法编辑" });
    assert.equal(update.mock.callCount(), 0);
  });

  it("reports a post changed since it was looked up", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    t.mock.method(PostModel, "findById", () => ({
      select: async () => ({ uid, isEnd: "0" }),
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
      select: async () => ({ uid, isEnd: "0" }),
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
      select: async () => ({ uid, isEnd: "0" }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await request("/content/updateId", { ...validEdit, catalog: "后端" }, authHeader);
    assert.deepEqual(response.body, { code: 200, data: { _id: validEdit._id }, msg: "更新帖子成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: validEdit._id, uid, isEnd: "0" },
      { $set: { title: validEdit.title, content: validEdit.content, catalog: "后端" } },
    ]);
  });

  it("rejects tag objects through /content/updateId", async (t) => {
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const response = await request("/content/updateId", { ...validEdit, tags: [{ _id: "docker", tagName: "容器" }] }, authHeader);
    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.tags);
    assert.equal(update.mock.callCount(), 0);
  });

  it("updates tag references through /content/updateId", async (t) => {
    cache.set(validEdit.sid, validEdit.code);
    t.mock.method(PostModel, "findById", () => ({
      select: async () => ({ uid, isEnd: "0" }),
    }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const tags = ["docker"];
    const response = await request("/content/updateId", { ...validEdit, tags }, authHeader);
    assert.equal(response.body.code, 200);
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: validEdit._id, uid, isEnd: "0" },
      { $set: { title: validEdit.title, content: validEdit.content, tags } },
    ]);
  });
});
