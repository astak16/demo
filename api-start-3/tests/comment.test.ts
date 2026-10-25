import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { JWT_SECRET } from "../src/config";
import CommentModel from "../src/model/comment";
import CommentHandModel from "../src/model/commentHand";
import PostModel from "../src/model/post";
import UserModel from "../src/model/user";
import { setupApi } from "./helpers/api";

const { request } = setupApi();
const uid = new mongoose.Types.ObjectId().toString();
const postId = new mongoose.Types.ObjectId().toString();
const commentId = new mongoose.Types.ObjectId().toString();
const authHeader = { Authorization: `Bearer ${jwt.sign({ _id: uid }, JWT_SECRET)}` };
const addComment = (body: Record<string, unknown>) => request("/comment/reply", body, authHeader);
const editComment = (body: Record<string, unknown>) => request("/comment/update", body, authHeader);
const acceptComment = (body: Record<string, unknown>) => request("/comment/accept", body, authHeader);
const likeComment = (body: Record<string, unknown>, headers: Record<string, string> = authHeader) =>
  request("/comment/hands", body, headers);

describe("GET /admin/comment/list", () => {
  it("returns the requested page and the unpaged total", async (t) => {
    const rows = [{ _id: commentId, content: "A matching comment" }];
    const lookup = t.mock.method(CommentModel, "getCommentsOptions", async () => ({ data: rows, total: 9 }));

    const response = await request("/admin/comment/list?item=tid&search=question&page=2&limit=5", undefined, authHeader);

    assert.deepEqual(response.body, { code: 200, data: { list: rows, total: 9 } });
    assert.deepEqual(lookup.mock.calls[0].arguments, [{ item: "tid", search: "question" }, 2, 5]);
  });
});

describe("POST /comment/reply", () => {
  it("creates a comment and increments the post answer count", async (t) => {
    t.mock.method(UserModel, "findById", async () => ({ status: "0" }));
    t.mock.method(PostModel, "findById", async () => ({ _id: postId, uid: "author-id" }));
    const create = t.mock.method(CommentModel, "create", async () => ({ _id: "comment-id" }));
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await addComment({ tid: postId, content: "A useful comment" });

    assert.deepEqual(response.body, { code: 200, data: { _id: "comment-id" }, msg: "评论成功" });
    assert.deepEqual(create.mock.calls[0].arguments[0], {
      tid: postId,
      content: "A useful comment",
      uid: "author-id",
      cuid: uid,
    });
    assert.deepEqual(update.mock.calls[0].arguments, [{ _id: postId }, { $inc: { answer: 1 } }]);
  });

  it("rejects a muted user before looking up the post", async (t) => {
    t.mock.method(UserModel, "findById", async () => ({ status: "1" }));
    const postLookup = t.mock.method(PostModel, "findById", async () => ({ _id: postId, uid: "author-id" }));
    const create = t.mock.method(CommentModel, "create", async () => ({ _id: "comment-id" }));

    const response = await addComment({ tid: postId, content: "A useful comment" });

    assert.deepEqual(response.body, { code: 500, msg: "用户已被禁言" });
    assert.equal(postLookup.mock.callCount(), 0);
    assert.equal(create.mock.callCount(), 0);
  });

  it("rejects an empty comment before querying the user", async (t) => {
    const userLookup = t.mock.method(UserModel, "findById", async () => ({ status: "0" }));

    const response = await addComment({ tid: postId, content: "" });

    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.content);
    assert.equal(userLookup.mock.callCount(), 0);
  });

  it("rejects an invalid post ID before querying the user", async (t) => {
    const userLookup = t.mock.method(UserModel, "findById", async () => ({ status: "0" }));

    const response = await addComment({ tid: "not-an-object-id", content: "A useful comment" });

    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg.tid);
    assert.equal(userLookup.mock.callCount(), 0);
  });

  it("reports when the post does not exist", async (t) => {
    t.mock.method(UserModel, "findById", async () => ({ status: "0" }));
    const postLookup = t.mock.method(PostModel, "findById", async () => null);
    const create = t.mock.method(CommentModel, "create", async () => ({ _id: "comment-id" }));

    const response = await addComment({ tid: postId, content: "A useful comment" });

    assert.deepEqual(response.body, { code: 500, msg: "文章不存在" });
    assert.equal(postLookup.mock.callCount(), 1);
    assert.equal(create.mock.callCount(), 0);
  });

  it("rolls back the comment when updating the post answer count fails", async (t) => {
    t.mock.method(UserModel, "findById", async () => ({ status: "0" }));
    t.mock.method(PostModel, "findById", async () => ({ _id: postId, uid: "author-id" }));
    t.mock.method(CommentModel, "create", async () => ({ _id: "comment-id" }));
    t.mock.method(PostModel, "updateOne", async () => { throw new Error("update failed"); });
    const rollback = t.mock.method(CommentModel, "deleteOne", async () => ({ deletedCount: 1 }));

    const response = await addComment({ tid: postId, content: "A useful comment" });

    assert.deepEqual(response.body, { code: 500, msg: "评论失败" });
    assert.deepEqual(rollback.mock.calls[0].arguments, [{ _id: "comment-id" }]);
  });

  it("reports failure when comment creation throws", async (t) => {
    t.mock.method(UserModel, "findById", async () => ({ status: "0" }));
    t.mock.method(PostModel, "findById", async () => ({ _id: postId, uid: "author-id" }));
    t.mock.method(CommentModel, "create", async () => { throw new Error("create failed"); });
    const update = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await addComment({ tid: postId, content: "A useful comment" });

    assert.deepEqual(response.body, { code: 500, msg: "评论失败" });
    assert.equal(update.mock.callCount(), 0);
  });
});

describe("POST /comment/update", () => {
  const commentId = new mongoose.Types.ObjectId().toString();

  it("validates the comment ID and content", async (t) => {
    const update = t.mock.method(CommentModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await editComment({ _id: "invalid-id", content: "" });

    assert.equal(response.body.code, 400);
    assert.ok(response.body.msg._id);
    assert.ok(response.body.msg.content);
    assert.equal(update.mock.callCount(), 0);
  });

  it("rejects a muted user before updating the comment", async (t) => {
    t.mock.method(UserModel, "findById", async () => ({ status: "1" }));
    const update = t.mock.method(CommentModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await editComment({ _id: commentId, content: "Edited comment" });

    assert.deepEqual(response.body, { code: 500, msg: "用户已被禁言" });
    assert.equal(update.mock.callCount(), 0);
  });

  it("updates an allowed comment", async (t) => {
    t.mock.method(UserModel, "findById", async () => ({ status: "0" }));
    const update = t.mock.method(CommentModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await editComment({ _id: commentId, content: "Edited comment" });

    assert.deepEqual(response.body, { code: 200, data: { _id: commentId }, msg: "更新成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: commentId },
      { $set: { _id: commentId, content: "Edited comment" } },
    ]);
  });

  it("reports when the comment does not exist", async (t) => {
    t.mock.method(UserModel, "findById", async () => ({ status: "0" }));
    t.mock.method(CommentModel, "updateOne", async () => ({ matchedCount: 0 }));

    const response = await editComment({ _id: commentId, content: "Edited comment" });

    assert.deepEqual(response.body, { code: 500, msg: "更新失败" });
  });
});

describe("POST /comment/accept", () => {
  const openPost = { _id: postId, uid, isEnd: "0", fav: 15 };

  it("closes the post, marks its comment best, and awards the author", async (t) => {
    t.mock.method(PostModel, "findById", async () => openPost);
    const closePost = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    const markBest = t.mock.method(CommentModel, "findOneAndUpdate", async () => ({ _id: commentId, cuid: "comment-author" }));
    const award = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await acceptComment({ tid: postId, _id: commentId });

    assert.deepEqual(response.body, { code: 200, data: { _id: commentId }, msg: "采纳成功" });
    assert.deepEqual(closePost.mock.calls[0].arguments, [
      { _id: postId, uid, isEnd: "0" },
      { $set: { isEnd: "1" } },
    ]);
    assert.deepEqual(markBest.mock.calls[0].arguments, [
      { _id: commentId, tid: postId, isBest: { $ne: "1" } },
      { $set: { isBest: "1" } },
      { new: true },
    ]);
    assert.deepEqual(award.mock.calls[0].arguments, [
      { _id: "comment-author" },
      { $inc: { favs: 15 } },
    ]);
  });

  it("accepts a post without a bounty without changing the author's points", async (t) => {
    t.mock.method(PostModel, "findById", async () => ({ ...openPost, fav: undefined }));
    t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    t.mock.method(CommentModel, "findOneAndUpdate", async () => ({ _id: commentId, cuid: "comment-author" }));
    const award = t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await acceptComment({ tid: postId, _id: commentId });

    assert.equal(response.body.code, 200);
    assert.deepEqual(award.mock.calls[0].arguments[1], { $inc: { favs: 0 } });
  });

  it("rejects a missing post", async (t) => {
    const lookup = t.mock.method(PostModel, "findById", async () => null);
    const close = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await acceptComment({ tid: postId, _id: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "文章不存在" });
    assert.equal(lookup.mock.callCount(), 1);
    assert.equal(close.mock.callCount(), 0);
  });

  it("rejects a non-owner or a post that is already closed", async (t) => {
    let lookupCount = 0;
    t.mock.method(PostModel, "findById", async () => {
      lookupCount++;
      if (lookupCount === 1) return { ...openPost, uid: "someone-else" };
      if (lookupCount === 2) return { ...openPost, isEnd: "1" };
      return { ...openPost, uid: null };
    });
    const close = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));

    const notOwner = await acceptComment({ tid: postId, _id: commentId });
    assert.deepEqual(notOwner.body, { code: 500, msg: "非本人无法设置" });

    const closed = await acceptComment({ tid: postId, _id: commentId });
    assert.deepEqual(closed.body, { code: 500, msg: "文章已经结贴，无法重新设置" });

    const noOwner = await acceptComment({ tid: postId, _id: commentId });
    assert.deepEqual(noOwner.body, { code: 500, msg: "非本人无法设置" });
    assert.equal(close.mock.callCount(), 0);
  });

  it("rejects a missing, unrelated, or already accepted comment", async (t) => {
    t.mock.method(PostModel, "findById", async () => openPost);
    t.mock.method(CommentModel, "findOneAndUpdate", async () => null);
    const close = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await acceptComment({ tid: postId, _id: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "评论不存在、不属于该文章或已被采纳" });
    assert.equal(close.mock.callCount(), 0);
  });

  it("returns a conflict if the post was closed by another request", async (t) => {
    t.mock.method(PostModel, "findById", async () => openPost);
    t.mock.method(CommentModel, "findOne", async () => ({ _id: commentId, cuid: "comment-author" }));
    const close = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 0 }));
    const markBest = t.mock.method(CommentModel, "findOneAndUpdate", async () => ({ _id: commentId }));
    const unmarkBest = t.mock.method(CommentModel, "updateOne", async () => ({ matchedCount: 1 }));

    const response = await acceptComment({ tid: postId, _id: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "文章已经结贴，无法重新设置" });
    assert.equal(close.mock.callCount(), 1);
    assert.equal(markBest.mock.callCount(), 1);
    assert.equal(unmarkBest.mock.callCount(), 1);
  });

  it("rolls back the post and comment when awarding points fails", async (t) => {
    t.mock.method(PostModel, "findById", async () => openPost);
    const postUpdates: unknown[][] = [];
    t.mock.method(PostModel, "updateOne", async (...args: unknown[]) => {
      postUpdates.push(args);
      return { matchedCount: 1 };
    });
    t.mock.method(CommentModel, "findOneAndUpdate", async () => ({ _id: commentId, cuid: "comment-author" }));
    const commentUpdate = t.mock.method(CommentModel, "updateOne", async () => ({ matchedCount: 1 }));
    t.mock.method(UserModel, "updateOne", async () => ({ matchedCount: 0 }));

    const response = await acceptComment({ tid: postId, _id: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "采纳失败" });
    assert.equal(postUpdates.length, 2);
    assert.deepEqual(commentUpdate.mock.calls[0].arguments, [
      { _id: commentId, tid: postId },
      { $set: { isBest: "0" } },
    ]);
  });

  it("reports a comment update error without closing the post", async (t) => {
    t.mock.method(PostModel, "findById", async () => openPost);
    const postUpdate = t.mock.method(PostModel, "updateOne", async () => ({ matchedCount: 1 }));
    t.mock.method(CommentModel, "findOneAndUpdate", async () => { throw new Error("comment update failed"); });

    const response = await acceptComment({ tid: postId, _id: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "采纳失败" });
    assert.equal(postUpdate.mock.callCount(), 0);
  });
});

describe("POST /comment/hands", () => {
  it("defines a unique index for a user's like on each comment", () => {
    assert.ok(
      CommentHandModel.schema.indexes().some(
        ([keys, options]) => keys.cid === 1 && keys.uid === 1 && options.unique === true,
      ),
    );
  });

  it("increments the comment's like count for a new like", async (t) => {
    t.mock.method(CommentHandModel, "findOne", async () => null);
    const create = t.mock.method(CommentHandModel, "create", async () => ({ _id: "hand-id" }));
    const increment = t.mock.method(CommentModel, "findOneAndUpdate", async () => ({ _id: commentId }));

    const response = await likeComment({ cid: commentId });

    assert.deepEqual(response.body, { code: 200, msg: "点赞成功！" });
    assert.deepEqual(create.mock.calls[0].arguments, [{ cid: commentId, uid }]);
    assert.deepEqual(increment.mock.calls[0].arguments, [
      { _id: commentId },
      { $inc: { hands: 1 } },
    ]);
  });

  it("rejects a repeated like before writing", async (t) => {
    t.mock.method(CommentHandModel, "findOne", async () => ({ _id: "hand-id" }));
    const create = t.mock.method(CommentHandModel, "create", async () => ({ _id: "new-hand-id" }));

    const response = await likeComment({ cid: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "你已经点过赞了，请勿重新点赞" });
    assert.equal(create.mock.callCount(), 0);
  });

  it("rejects a concurrent duplicate like using the unique index error", async (t) => {
    t.mock.method(CommentHandModel, "findOne", async () => null);
    t.mock.method(CommentHandModel, "create", async () => {
      throw Object.assign(new Error("duplicate like"), { code: 11000 });
    });
    const increment = t.mock.method(CommentModel, "findOneAndUpdate", async () => ({ _id: commentId }));

    const response = await likeComment({ cid: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "你已经点过赞了，请勿重新点赞" });
    assert.equal(increment.mock.callCount(), 0);
  });

  it("returns a failure when creating the like record fails", async (t) => {
    t.mock.method(CommentHandModel, "findOne", async () => null);
    t.mock.method(CommentHandModel, "create", async () => { throw new Error("database unavailable"); });
    const increment = t.mock.method(CommentModel, "findOneAndUpdate", async () => ({ _id: commentId }));

    const response = await likeComment({ cid: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "点赞失败！" });
    assert.equal(increment.mock.callCount(), 0);
  });

  it("removes the like record if the comment does not exist", async (t) => {
    t.mock.method(CommentHandModel, "findOne", async () => null);
    t.mock.method(CommentHandModel, "create", async () => ({ _id: "hand-id" }));
    t.mock.method(CommentModel, "findOneAndUpdate", async () => null);
    const remove = t.mock.method(CommentHandModel, "deleteOne", async () => ({ deletedCount: 1 }));

    const response = await likeComment({ cid: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "点赞失败！" });
    assert.deepEqual(remove.mock.calls[0].arguments, [{ _id: "hand-id" }]);
  });

  it("removes the like record when incrementing the comment fails", async (t) => {
    t.mock.method(CommentHandModel, "findOne", async () => null);
    t.mock.method(CommentHandModel, "create", async () => ({ _id: "hand-id" }));
    t.mock.method(CommentModel, "findOneAndUpdate", async () => { throw new Error("increment failed"); });
    const remove = t.mock.method(CommentHandModel, "deleteOne", async () => ({ deletedCount: 1 }));

    const response = await likeComment({ cid: commentId });

    assert.deepEqual(response.body, { code: 500, msg: "点赞失败！" });
    assert.deepEqual(remove.mock.calls[0].arguments, [{ _id: "hand-id" }]);
  });

  it("validates the comment ID and requires authentication", async (t) => {
    const find = t.mock.method(CommentHandModel, "findOne", async () => null);
    const invalid = await likeComment({ cid: "not-an-object-id" });
    assert.equal(invalid.body.code, 400);
    assert.ok(invalid.body.msg.cid);
    assert.equal(find.mock.callCount(), 0);

    const unauthorized = await likeComment({ cid: commentId }, {});
    assert.equal(unauthorized.status, 401);
  });
});
