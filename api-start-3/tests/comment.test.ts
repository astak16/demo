import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { JWT_SECRET } from "../src/config";
import CommentModel from "../src/model/comment";
import PostModel from "../src/model/post";
import UserModel from "../src/model/user";
import { setupApi } from "./helpers/api";

const { request } = setupApi();
const uid = new mongoose.Types.ObjectId().toString();
const postId = new mongoose.Types.ObjectId().toString();
const authHeader = { Authorization: `Bearer ${jwt.sign({ _id: uid }, JWT_SECRET)}` };
const addComment = (body: Record<string, unknown>) => request("/comment/reply", body, authHeader);
const editComment = (body: Record<string, unknown>) => request("/comment/update", body, authHeader);

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
