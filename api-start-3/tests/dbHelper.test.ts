import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose, { Schema } from "mongoose";
import "../src/config/dbHelper";
import PostModel from "../src/model/post";
import PostTagModel from "../src/model/postTag";
import UserModel from "../src/model/user";

describe("baseFields soft deletion filter", () => {
  const Model = mongoose.model(`SoftDeleteFilter_${Date.now()}`, new Schema({ name: String }));

  it("filters ordinary reads and counts", async (t) => {
    const filters: Record<string, unknown>[] = [];
    const collection = Model.collection as any;
    t.mock.method(collection, "find", (filter: Record<string, unknown>) => {
      filters.push(filter);
      return { toArray: async () => [] };
    });
    t.mock.method(collection, "findOne", async (filter: Record<string, unknown>) => {
      filters.push(filter);
      return null;
    });
    t.mock.method(collection, "countDocuments", async (filter: Record<string, unknown>) => {
      filters.push(filter);
      return 0;
    });

    await Model.find({ name: "keep" });
    await Model.findOne({ isDeleted: 1 });
    await Model.countDocuments({ name: "keep" });

    assert.deepEqual(filters, [
      { name: "keep", isDeleted: { $in: [0, null] } },
      { isDeleted: { $in: [0, null] } },
      { name: "keep", isDeleted: { $in: [0, null] } },
    ]);
  });

  it("allows a query to include deleted records", async (t) => {
    const filters: Record<string, unknown>[] = [];
    t.mock.method(Model.collection, "find", (filter: Record<string, unknown>) => {
      filters.push(filter);
      return { toArray: async () => [] };
    });
    t.mock.method(Model.collection, "countDocuments", async (filter: Record<string, unknown>) => {
      filters.push(filter);
      return 0;
    });

    await Model.find({ isDeleted: 1 }).setOptions({ includeDeleted: true });
    await Model.countDocuments({ isDeleted: 1 }).setOptions({ includeDeleted: true });

    assert.deepEqual(filters, [{ isDeleted: 1 }, { isDeleted: 1 }]);
  });

  it("restricts updates while allowing a soft delete of an active record", async (t) => {
    const calls: Array<[Record<string, unknown>, Record<string, any>]> = [];
    const collection = Model.collection as any;
    const result = { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    t.mock.method(collection, "updateOne", async (filter: Record<string, unknown>, update: Record<string, any>) => {
      calls.push([filter, update]);
      return result;
    });
    t.mock.method(collection, "updateMany", async (filter: Record<string, unknown>, update: Record<string, any>) => {
      calls.push([filter, update]);
      return result;
    });

    await Model.updateOne({ name: "keep" }, { $set: { name: "changed" } });
    await Model.updateMany({ name: "keep" }, { $set: { isDeleted: 1 } });

    assert.deepEqual(calls.map(([filter]) => filter), [
      { name: "keep", isDeleted: { $in: [0, null] } },
      { name: "keep", isDeleted: { $in: [0, null] } },
    ]);
    assert.equal(calls[1][1].$set.isDeleted, 1);
  });
});

describe("post tag population", () => {
  it("includes legacy tags without an isDeleted field", async (t) => {
    const postId = new mongoose.Types.ObjectId();
    const tagId = new mongoose.Types.ObjectId();
    const tagFilters: Record<string, any>[] = [];

    t.mock.method(PostModel.collection, "find", () => ({
      toArray: async () => [{ _id: postId, tags: [tagId], isDeleted: 0 }],
    }));
    t.mock.method(PostTagModel.collection, "find", (filter: Record<string, any>) => {
      tagFilters.push(filter);
      return { toArray: async () => [{ _id: tagId, tagName: "Legacy tag", tagClass: "legacy" }] };
    });

    const posts = await PostModel.find().populate({ path: "tags", select: "tagName tagClass" }).lean();
    assert.equal(posts[0].tags.length, 1);
    assert.equal((posts[0].tags[0] as any).tagName, "Legacy tag");
    assert.deepEqual(tagFilters[0].isDeleted, { $in: [0, null] });
  });

  it("populates deleted tags and exposes the author's model name", async (t) => {
    const postId = new mongoose.Types.ObjectId();
    const tagId = new mongoose.Types.ObjectId();
    const authorId = new mongoose.Types.ObjectId();
    const missingAuthorId = new mongoose.Types.ObjectId();
    const tagFilters: Record<string, unknown>[] = [];

    t.mock.method(PostModel.collection, "find", () => ({
      toArray: async () => [
        { _id: postId, uid: authorId, tags: [tagId, "koa"], isDeleted: 0 },
        { _id: new mongoose.Types.ObjectId(), uid: missingAuthorId, tags: [], isDeleted: 0 },
      ],
    }));
    t.mock.method(PostTagModel.collection, "find", (filter: Record<string, unknown>) => {
      tagFilters.push(filter);
      return { toArray: async () => [{ _id: tagId, tagName: "Deleted tag", isDeleted: 1 }] };
    });
    t.mock.method(UserModel.collection, "find", () => ({
      toArray: async () => [{ _id: authorId, name: "Alice", isDeleted: 0 }],
    }));

    const posts = await PostModel.find()
      .populate({ path: "uid", select: "name" })
      .populate({ path: "tags", select: "tagName tagClass isDeleted", options: { includeDeleted: true } })
      .lean();

    assert.equal(posts.length, 2);
    assert.equal(posts[0].uid?.toString(), authorId.toString());
    assert.equal((posts[0] as any).uname, "Alice");
    assert.equal(posts[0].tags.length, 1);
    assert.equal((posts[0].tags[0] as any).tagName, "Deleted tag");
    assert.equal((posts[0].tags[0] as any).isDeleted, 1);
    assert.equal("isDeleted" in tagFilters[0], false);
    assert.equal(posts[1].uid, null);
    assert.equal((posts[1] as any).uname, null);
  });

  it("uses null for an author without a name and leaves unpopulated posts alone", async (t) => {
    const authorId = new mongoose.Types.ObjectId();
    t.mock.method(PostModel.collection, "find", () => ({
      toArray: async () => [{ _id: new mongoose.Types.ObjectId(), uid: authorId, tags: [], isDeleted: 0 }],
    }));
    t.mock.method(UserModel.collection, "find", () => ({
      toArray: async () => [{ _id: authorId, isDeleted: 0 }],
    }));

    const [populated] = await PostModel.find().populate({ path: "uid", select: "name" }).lean();
    assert.equal(populated.uid?.toString(), authorId.toString());
    assert.equal((populated as any).uname, null);

    const [plain] = await PostModel.find().lean();
    assert.equal(plain.uid?.toString(), authorId.toString());
    assert.equal("uname" in plain, false);

    const [document] = await PostModel.find();
    assert.equal(document.uid?.toString(), authorId.toString());
    assert.equal("uname" in document.toObject(), false);
  });

  it("includes the deletion marker when tag population has no select", async (t) => {
    const tagId = new mongoose.Types.ObjectId();
    t.mock.method(PostModel.collection, "find", () => ({
      toArray: async () => [{ _id: new mongoose.Types.ObjectId(), tags: [tagId], isDeleted: 0 }],
    }));
    t.mock.method(PostTagModel.collection, "find", () => ({
      toArray: async () => [{ _id: tagId, tagName: "Deleted tag", isDeleted: 1 }],
    }));

    const [post] = await PostModel.find()
      .populate({ path: "tags", options: { sort: { tagName: 1 }, includeDeleted: true } })
      .lean();
    assert.equal((post.tags[0] as any).isDeleted, 1);
  });
});
