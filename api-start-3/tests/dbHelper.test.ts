import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose, { Schema } from "mongoose";
import "../src/config/dbHelper";
import PostModel from "../src/model/post";
import PostTagModel from "../src/model/postTag";
import UserModel from "../src/model/user";
import logger from "../src/config/logger";
import { baseFields, connectDB } from "../src/config/dbHelper";

describe("MongoDB connection startup", () => {
  it("registers connection logs and connects to the configured database", async (t) => {
    const on = t.mock.method(mongoose.connection, "on", function (event: string, listener: (...args: any[]) => void) {
      if (event === "connected") listener();
      if (event === "error") listener(new Error("connection failed"));
      if (event === "disconnected") listener();
      return mongoose.connection;
    } as any);
    const connect = t.mock.method(mongoose, "connect", async () => mongoose);
    const info = t.mock.method(logger, "info", () => logger);
    const error = t.mock.method(logger, "error", () => logger);

    await connectDB();

    assert.equal(on.mock.callCount(), 3);
    assert.equal(connect.mock.callCount(), 1);
    assert.equal(info.mock.callCount(), 2);
    assert.equal(error.mock.callCount(), 1);
  });
});

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

  it("applies base fields when a schema has no prior JSON options", () => {
    const calls: unknown[][] = [];
    const schema = {
      get: () => undefined,
      set: (...args: unknown[]) => { calls.push(["set", ...args]); },
      add: (...args: unknown[]) => { calls.push(["add", ...args]); },
      pre: (...args: unknown[]) => { calls.push(["pre", ...args]); },
      post: (...args: unknown[]) => { calls.push(["post", ...args]); },
    };
    baseFields(schema as any);
    assert.ok(calls.some(([method]) => method === "set"));
    assert.ok(calls.some(([method]) => method === "add"));
  });

  it("allows a query to include deleted records", async (t) => {
    const filters: Record<string, unknown>[] = [];
    const deleted = { name: "archived", isDeleted: 1 };
    t.mock.method(Model.collection, "find", (filter: Record<string, unknown>) => {
      filters.push(filter);
      return { toArray: async () => [deleted] };
    });
    t.mock.method(Model.collection, "countDocuments", async (filter: Record<string, unknown>) => {
      filters.push(filter);
      return 0;
    });
    t.mock.method(Model.collection, "findOne", async (filter: Record<string, unknown>) => {
      filters.push(filter);
      return deleted;
    });

    const records = await Model.find({ isDeleted: 1 }).setOptions({ includeDeleted: true });
    const record = await Model.findOne({ isDeleted: 1 }).setOptions({ includeDeleted: true });
    await Model.countDocuments({ isDeleted: 1 }).setOptions({ includeDeleted: true });

    assert.equal(records[0].$locals.includeDeleted, true);
    assert.equal((records[0].toJSON() as any).isDeleted, 1);
    assert.equal(record?.$locals.includeDeleted, true);
    assert.equal((record?.toJSON() as any).isDeleted, 1);
    assert.deepEqual(filters, [{ isDeleted: 1 }, { isDeleted: 1 }, { isDeleted: 1 }]);
  });

  it("keeps the deletion marker when serialization explicitly includes deleted data", () => {
    const doc = new Model({ name: "archived", isDeleted: 1 });
    const json = doc.toJSON({ includeDeleted: true }) as Record<string, unknown>;
    assert.equal(json.isDeleted, 1);

    doc.$locals.includeDeleted = true;
    assert.equal((doc.toJSON({ includeDeleted: false }) as Record<string, unknown>).isDeleted, 1);
  });

  it("preserves a schema's existing JSON transform", () => {
    const schema = new Schema({ name: String }, {
      toJSON: {
        transform(_doc, ret) {
          const result = ret as Record<string, unknown>;
          result.transformed = true;
          result.nested = Object.assign(Object.create(null), { isDeleted: 1, password: "hidden" });
          return result;
        },
      },
    });
    const model = mongoose.model(`ExistingTransform_${Date.now()}`, schema);
    const json = new model({ name: "test" }).toJSON({ includeDeleted: true }) as Record<string, any>;
    assert.equal(json.transformed, true);
    assert.equal(json.nested.isDeleted, 1);
    assert.equal("password" in json.nested, false);

    const noResultSchema = new Schema({ name: String }, {
      toJSON: { transform() { return undefined; } },
    });
    const NoResultModel = mongoose.model(`NoResultTransform_${Date.now()}`, noResultSchema);
    const fallback = new NoResultModel({ name: "fallback" }).toJSON() as Record<string, unknown>;
    assert.equal(fallback.name, "fallback");
  });

  it("adds the soft-delete match to aggregates unless deleted records are requested", async (t) => {
    const pipelines: unknown[][] = [];
    t.mock.method(Model.collection, "aggregate", (pipeline: unknown[]) => {
      pipelines.push(pipeline);
      return { toArray: async () => [] } as any;
    });

    await Model.aggregate([{ $match: { name: "active" } }]);
    await Model.aggregate([{ $match: { name: "archived" } }]).option({ includeDeleted: true });

    assert.deepEqual(pipelines[0], [
      { $match: { isDeleted: { $in: [0, null] } } },
      { $match: { name: "active" } },
    ]);
    assert.deepEqual(pipelines[1], [{ $match: { name: "archived" } }]);
  });

  it("covers serialization transform decisions directly", () => {
    const toJSON = Model.schema.get("toJSON");
    assert.ok(toJSON?.transform);
    const transform = toJSON.transform as (doc: any, ret: Record<string, unknown>, options: unknown) => Record<string, unknown>;
    const retained = transform({ $locals: { includeDeleted: true } }, { isDeleted: 1, password: "secret" }, {});
    assert.equal(retained.isDeleted, 1);
    assert.equal("password" in retained, false);
    const filtered = transform({ $locals: { includeDeleted: false } }, { isDeleted: 1, password: "secret" }, {});
    assert.equal("isDeleted" in filtered, false);
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
    const tagId = "legacy";
    const tagFilters: Record<string, any>[] = [];

    t.mock.method(PostModel.collection, "find", () => ({
      toArray: async () => [{ _id: postId, tags: [tagId], isDeleted: 0 }],
    }));
    t.mock.method(PostTagModel.collection, "find", (filter: Record<string, any>) => {
      tagFilters.push(filter);
      return { toArray: async () => [{ _id: tagId, tagName: "Legacy tag" }] };
    });

    const posts = await PostModel.find().populate({ path: "tags", select: "tagName" });
    assert.equal(posts[0].tags.length, 1);
    assert.equal((posts[0].tags[0] as any).tagName, "Legacy tag");
    assert.deepEqual(tagFilters[0].isDeleted, { $in: [0, null] });
  });

  it("populates deleted tags and exposes the author's model name", async (t) => {
    const postId = new mongoose.Types.ObjectId();
    const tagId = "docker";
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
      .populate({ path: "tags", select: "tagName isDeleted", options: { includeDeleted: true } });

    const output = posts.map((post) => post.toJSON() as Record<string, any>);

    assert.equal(posts.length, 2);
    assert.equal(output[0].uid?.toString(), authorId.toString());
    assert.equal(output[0].uname, "Alice");
    assert.equal(output[0].tags.length, 1);
    assert.equal(output[0].tags[0].tagName, "Deleted tag");
    assert.equal(output[0].tags[0].isDeleted, 1);
    assert.equal("isDeleted" in output[0], false);
    assert.equal("isDeleted" in tagFilters[0], false);
    assert.equal(output[1].uid, null);
    assert.equal(output[1].uname, null);
  });

  it("uses null for an author without a name and leaves unpopulated posts alone", async (t) => {
    const authorId = new mongoose.Types.ObjectId();
    t.mock.method(PostModel.collection, "find", () => ({
      toArray: async () => [{ _id: new mongoose.Types.ObjectId(), uid: authorId, tags: [], isDeleted: 0 }],
    }));
    t.mock.method(UserModel.collection, "find", () => ({
      toArray: async () => [{ _id: authorId, isDeleted: 0 }],
    }));

    const [populated] = await PostModel.find().populate({ path: "uid", select: "name" });
    const populatedJSON = populated.toJSON() as Record<string, unknown>;
    assert.equal(populatedJSON.uid?.toString(), authorId.toString());
    assert.equal(populatedJSON.uname, null);

    const [plain] = await PostModel.find();
    const plainJSON = plain.toJSON() as Record<string, unknown>;
    assert.equal(plainJSON.uid?.toString(), authorId.toString());
    assert.equal("uname" in plainJSON, false);

    const [document] = await PostModel.find();
    assert.equal(document.uid?.toString(), authorId.toString());
    assert.equal("uname" in document.toObject(), false);
  });

  it("keeps the deletion marker when populated tags include deleted records", async (t) => {
    const tagId = "docker";
    t.mock.method(PostModel.collection, "find", () => ({
      toArray: async () => [{ _id: new mongoose.Types.ObjectId(), tags: [tagId], isDeleted: 0 }],
    }));
    t.mock.method(PostTagModel.collection, "find", () => ({
      toArray: async () => [{ _id: tagId, tagName: "Deleted tag", isDeleted: 1 }],
    }));

    const [post] = await PostModel.find()
      .populate({ path: "tags", options: { sort: { tagName: 1 }, includeDeleted: true } });
    const output = post.toJSON() as Record<string, any>;
    assert.equal(output.tags[0].tagName, "Deleted tag");
    assert.equal(output.tags[0].isDeleted, 1);
  });

});
