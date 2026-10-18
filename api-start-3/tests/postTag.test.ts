import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../src/config";
import PostModel from "../src/model/post";
import PostTagModel from "../src/model/postTag";
import UserModel from "../src/model/user";
import { setupApi } from "./helpers/api";

const { request } = setupApi();
const authHeader = { Authorization: `Bearer ${jwt.sign({ _id: "tag-editor" }, JWT_SECRET)}` };
const tagId = "507f1f77bcf86cd799439011";

describe("admin post tags", () => {
  it("hides internal fields when serializing a tag document", () => {
    const tag = new PostTagModel({
      tagName: "TypeScript", tagClass: "language", isDeleted: 1,
      created: "2026-10-18", updated: "2026-10-18",
    });
    const json = tag.toJSON() as Record<string, unknown>;
    assert.equal(json.tagName, "TypeScript");
    assert.equal(json.tagClass, "language");
    for (const field of ["isDeleted", "created", "updated", "__v"]) {
      assert.equal(Object.hasOwn(json, field), false, field);
    }
  });

  it("stores post tags as references to post tag documents", async () => {
    const path = PostModel.schema.path("tags");
    assert.equal(path.instance, "Array");
    assert.equal(path.getEmbeddedSchemaType()?.instance, "ObjectId");
    assert.equal(path.getEmbeddedSchemaType()?.options.ref, PostTagModel.modelName);

    assert.deepEqual(new PostModel().tags, []);

    const post = new PostModel({ tags: [tagId] });
    assert.equal(post.tags[0].toString(), tagId);
    await assert.rejects(new PostModel({ tags: ["not-an-id"] }).validate());
  });

  it("stores the post author as a reference to a user document", async () => {
    const path = PostModel.schema.path("uid");
    assert.equal(path.instance, "ObjectId");
    assert.equal(path.options.ref, UserModel.modelName);

    const uid = new UserModel()._id.toString();
    const post = new PostModel({ uid });
    assert.equal(post.uid?.toString(), uid);
    await assert.rejects(new PostModel({ uid: "not-an-id" }).validate());
  });

  it("lists tags", async (t) => {
    const tags = [{ _id: tagId, tagName: "TypeScript" }];
    const find = t.mock.method(PostTagModel, "find", async () => tags);
    const response = await request("/admin/getTags", undefined, authHeader);
    assert.deepEqual(response.body, { code: 200, data: { _id: tags } });
    assert.equal(find.mock.callCount(), 1);
  });

  it("validates and creates a tag", async (t) => {
    const create = t.mock.method(PostTagModel, "create", async () => ({ _id: tagId }));
    const invalid = await request("/admin/addTag", { tagName: "" }, authHeader);
    assert.equal(invalid.body.code, 400);
    assert.ok(invalid.body.msg.tagName);
    assert.equal(create.mock.callCount(), 0);

    const body = { tagName: "TypeScript", tagClass: "language" };
    const response = await request("/admin/addTag", body, authHeader);
    assert.deepEqual(response.body, { code: 200, data: { _id: tagId } });
    assert.deepEqual(create.mock.calls[0].arguments, [body]);
  });

  it("validates and edits a tag", async (t) => {
    const update = t.mock.method(PostTagModel, "updateOne", async () => ({ modifiedCount: 1 }));
    const invalid = await request("/admin/editTag", { _id: "bad-id" }, authHeader);
    assert.equal(invalid.body.code, 400);
    assert.ok(invalid.body.msg._id);
    assert.equal(update.mock.callCount(), 0);

    const response = await request("/admin/editTag", { _id: tagId, tagName: "Node.js" }, authHeader);
    assert.deepEqual(response.body, { code: 200, msg: "更新成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [{ _id: tagId }, { tagName: "Node.js" }]);
  });

  it("reports when an edit changes no tag", async (t) => {
    t.mock.method(PostTagModel, "updateOne", async () => ({ modifiedCount: 0 }));
    const response = await request("/admin/editTag", { _id: tagId, tagName: "Node.js" }, authHeader);
    assert.deepEqual(response.body, { code: 500, msg: "更新失败" });
  });

  it("validates and soft deletes tags", async (t) => {
    const update = t.mock.method(PostTagModel, "updateMany", async () => ({ modifiedCount: 1 }));
    const invalid = await request("/admin/deleteTag", { _ids: ["bad-id"] }, authHeader);
    assert.equal(invalid.body.code, 400);
    assert.ok(invalid.body.msg._ids);
    assert.equal(update.mock.callCount(), 0);

    const response = await request("/admin/deleteTag", { _ids: [tagId] }, authHeader);
    assert.deepEqual(response.body, { code: 200, msg: "删除成功", data: { modifiedCount: 1 } });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: { $in: [tagId] } },
      { $set: { isDeleted: 1 } },
    ]);
  });

  it("reports when no tag can be deleted", async (t) => {
    t.mock.method(PostTagModel, "updateMany", async () => ({ modifiedCount: 0 }));
    const response = await request("/admin/deleteTag", { _ids: [tagId] }, authHeader);
    assert.deepEqual(response.body, { code: 500, msg: "没有可删除的标签" });
  });
});
